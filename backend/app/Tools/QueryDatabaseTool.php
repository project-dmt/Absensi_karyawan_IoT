<?php

namespace App\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use RuntimeException;
use Stringable;

class QueryDatabaseTool implements Tool
{
    /**
     * Get the description of the tool's purpose.
     */
    public function description(): Stringable|string
    {
        return <<<DESC
            Jalankan query SELECT read-only ke database absensi untuk menjawab pertanyaan data.
            Tabel: employees(id, nama, nip, jabatan, divisi_id, rfid_uid, status) —
            status karyawan: aktif/nonaktif.
            divisions(id, nama_divisi).
            schedules(jam_masuk_standar, jam_pulang_standar, toleransi_menit).
            attendance(employee_id, tanggal, jam_masuk, jam_pulang, status, keterangan) —
            status absensi: 'Hadir', 'Terlambat', 'Izin', 'Alpha' (tidak hadir).
            Panduan:
            - "tidak hadir" = karyawan status 'aktif' yang tidak punya record attendance di tanggal itu,
              atau status 'Alpha'.
            - "hadir" = status 'Hadir' atau 'Terlambat'.
            - Gunakan fungsi tanggal MySQL (CURDATE(), WEEK(), DATE_SUB, dsb) untuk "hari ini"/"minggu ini".
            - Selalu akhiri query dengan LIMIT 100.
            - Hanya boleh SELECT (read-only). Tidak boleh UPDATE/DELETE/INSERT/ALTER/DROP.
        DESC;
    }

    /**
     * Execute the tool.
     */
    public function handle(Request $request): Stringable|string
    {
        $sql = (string) $request['sql'];

        $this->assertReadOnly($sql);

        $rows = DB::select($sql);

        return json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            ?: '[]';
    }

    /**
     * Pastikan query hanya SELECT read-only dan aman untuk dieksekusi.
     */
    protected function assertReadOnly(string $sql): void
    {
        $trimmed = trim(preg_replace('/--[^\n]*|\/\*.*?\*\//s', '', $sql));

        if (! preg_match('/^SELECT\b/i', $trimmed)) {
            throw new RuntimeException('Query harus dimulai dengan SELECT (read-only).');
        }

        if (preg_match('/;\s*(UPDATE|DELETE|INSERT|ALTER|DROP|CREATE|TRUNCATE|RENAME|GRANT|REVOKE)\b/i', $trimmed)) {
            throw new RuntimeException('Query berisi perintah berbahaya yang tidak diizinkan.');
        }

        if (preg_match('/\b(INTO\s+OUTFILE|LOAD_FILE|SLEEP|BENCHMARK|INFORMATION_SCHEMA|SHUTDOWN)\b/i', $trimmed)) {
            throw new RuntimeException('Query berisi fungsi berbahaya yang tidak diizinkan.');
        }

        if (! preg_match('/\bLIMIT\s+\d+\b/i', $trimmed)) {
            $sql .= ' LIMIT 100';
        }
    }
}

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'sql' => $schema->string()->required(),
        ];
    }
}
