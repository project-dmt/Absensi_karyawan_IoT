<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Menjaga patch vendor `laravel/ai` tetap terpasang.
 *
 * Kalau test ini gagal: jalankan `composer patch:ai` (atau `composer install`),
 * atau update scripts/patch-laravel-ai.php kalau package-nya sudah di-upgrade.
 */
class LaravelAiPatchTest extends TestCase
{
    private function gatewayFile(): ?string
    {
        $path = dirname(__DIR__, 2)
            .'/vendor/laravel/ai/src/Gateway/OpenAiCompatible/Concerns/HandlesTextStreaming.php';

        return is_file($path) ? $path : null;
    }

    public function test_tool_call_delta_survives_missing_index(): void
    {
        $path = $this->gatewayFile();

        if ($path === null) {
            $this->markTestSkipped('Package laravel/ai belum terinstall.');
        }

        $content = (string) file_get_contents($path);

        $this->assertStringContainsString(
            "\$tcDelta['index'] ?? \$tcDelta['id']",
            $content,
            'Delta tool_calls tanpa key "index" harus tetap ter-handle. Jalankan: composer patch:ai'
        );
    }

    public function test_tool_call_is_kept_when_finish_reason_is_stop(): void
    {
        $path = $this->gatewayFile();

        if ($path === null) {
            $this->markTestSkipped('Package laravel/ai belum terinstall.');
        }

        $content = (string) file_get_contents($path);

        $this->assertStringContainsString(
            "in_array(\$finishReason, ['tool_calls', 'stop'], true)",
            $content,
            'Tool call dengan finish_reason "stop" jangan dibuang. Jalankan: composer patch:ai'
        );
    }

    public function test_finish_reason_falls_back_to_tool_calls(): void
    {
        $path = $this->gatewayFile();

        if ($path === null) {
            $this->markTestSkipped('Package laravel/ai belum terinstall.');
        }

        $content = (string) file_get_contents($path);

        $this->assertStringContainsString(
            "filled(\$toolCalls) ? 'tool_calls'",
            $content,
            'finish_reason kosong harus fallback ke "tool_calls". Jalankan: composer patch:ai'
        );
    }
}
