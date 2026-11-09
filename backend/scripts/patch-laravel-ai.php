<?php

/**
 * Hotfix untuk package `laravel/ai` (versi 0.10.x / 1.x).
 *
 * MASALAH
 * -------
 * Package `laravel/ai` memproses streaming tool-call dari API "OpenAI-compatible"
 * dengan asumsi ketat:
 *
 *   1. Setiap delta tool_calls WAJIB punya key `index`.
 *   2. Tool call baru dianggap selesai kalau `finish_reason` persis `tool_calls`.
 *   3. `finish_reason` dari server dipakai apa adanya di StepResponse.
 *
 * Providers yang tidak persis OpenAI (Gemini via endpoint OpenAI-compatible, sebagian
 * model OpenRouter) melanggar asumsi itu:
 *
 *   - Delta tool_calls hanya mengirim `id` (tanpa `index`)  -> PHP error "Undefined array key index"
 *   - `finish_reason` dikirim `stop` padahal tool call-nya lengkap -> tool call dibuang diam-diam
 *   - `finish_reason` dikirim `null` -> StepResponse dapat finishReason kosong
 *
 * Akibatnya fitur "AI Assistant" (tool `QueryDatabaseTool`) gagal saat streaming.
 * Package upstream belum memperbaiki ini, jadi kita patch file vendor-nya.
 *
 * CARA KERJA
 * ----------
 * Script ini dipanggil otomatis oleh Composer lewat hook `post-autoload-dump`
 * (lihat composer.json). Script bersifat:
 *
 *   - IDEMPOTENT  : aman dijalankan berkali-kali, patch yang sudah ada tidak di-patch lagi.
 *   - NON-DESTRUCTIF: kalau pola tidak ditemukan (versi package berubah), file vendor
 *                     TIDAK disentuh dan script hanya memberi peringatan.
 *
 * Kalau pola hilang, biasanya artinya `laravel/ai` versi baru sudah memperbaiki
 * kode aslinya -> hapus script ini + hook Composer-nya. Cek dengan:
 *
 *     grep -n "tcDelta\['index'\]" vendor/laravel/ai/src/Gateway/OpenAiCompatible/Concerns/HandlesTextStreaming.php
 *
 * Jalankan manual:  php scripts/patch-laravel-ai.php
 */

declare(strict_types=1);

$relativePath = 'vendor/laravel/ai/src/Gateway/OpenAiCompatible/Concerns/HandlesTextStreaming.php';
$path = dirname(__DIR__).'/'.$relativePath;

if (! is_file($path)) {
    fwrite(STDOUT, "[laravel/ai] Package tidak terinstall, patch dilewati.\n");
    exit(0);
}

$file = file_get_contents($path);

if ($file === false) {
    fwrite(STDERR, "[laravel/ai] Gagal membaca {$relativePath}.\n");
    exit(1);
}

/**
 * Peta: [pattern_lama, pattern_baru]
 */
$patches = [
    // 1) Delta tool_calls tanpa key `index` (pakai `id` sebagai fallback)
    '$idx = $tcDelta[\'index\'];' => '$idx = $tcDelta[\'index\'] ?? $tcDelta[\'id\'] ?? count($pendingToolCalls);',

    // 2) `finish_reason` = "stop" padahal tool call-nya sudah lengkap
    "if (filled(\$pendingToolCalls) && \$finishReason === 'tool_calls') {" => "if (filled(\$pendingToolCalls) && in_array(\$finishReason, ['tool_calls', 'stop'], true)) {",

    // 3) `finish_reason` null/kosong -> tetap laporkan "tool_calls" kalau memang ada tool call
    "'finish_reason' => \$finishReason ?? ''" => "'finish_reason' => filled(\$toolCalls) ? 'tool_calls' : (\$finishReason ?? '')",
];

$applied = 0;
$alreadyPatched = 0;
$missing = [];

foreach ($patches as $old => $new) {
    $occurrences = substr_count($file, $old);

    if ($occurrences === 0) {
        // Kalau pattern baru sudah ada, berarti patch ini pernah terpasang.
        if (str_contains($file, $new)) {
            $alreadyPatched++;

            continue;
        }

        $missing[] = $old;

        continue;
    }

    $file = str_replace($old, $new, $file);
    $applied += $occurrences;
}

if ($missing !== []) {
    fwrite(STDERR, <<<TXT

    [laravel/ai] PERINGATAN: patch tidak bisa diterapkan penuh.
      File : {$relativePath}
      Pola yang tidak ditemukan:
    TXT);

    foreach ($missing as $pattern) {
        fwrite(STDERR, '        - '.$pattern.PHP_EOL);
    }

    fwrite(STDERR, <<<'TXT'

      Kemungkinan package laravel/ai sudah di-upgrade dan kodenya berubah.
      Cek dulu apakah masalah aslinya sudah diperbaiki upstream:

        grep -n "tcDelta['index']" vendor/laravel/ai/src/Gateway/OpenAiCompatible/Concerns/HandlesTextStreaming.php

      Kalau masih perlu patch, update pola di scripts/patch-laravel-ai.php.
      Kalau sudah diperbaiki upstream, hapus script ini + hook "post-autoload-dump" di composer.json.

    TXT);

    exit(0);
}

if ($applied === 0) {
    fwrite(STDOUT, "[laravel/ai] Sudah terpatch ({$alreadyPatched} pola), tidak ada perubahan.\n");

    exit(0);
}

if (file_put_contents($path, $file) === false) {
    fwrite(STDERR, "[laravel/ai] Gagal menulis ke {$relativePath}.\n");

    exit(1);
}

fwrite(STDOUT, "[laravel/ai] Patch diterapkan ({$applied} penggantian).\n");

exit(0);
