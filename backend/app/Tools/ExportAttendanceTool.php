<?php

namespace App\Tools;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use InvalidArgumentException;
use Stringable;

class ExportAttendanceTool implements Tool
{
    private const MAX_CALENDAR_DAYS = 31;

    public function description(): Stringable|string
    {
        return <<<DESC
            Menyiapkan ekspor laporan absensi Excel atau CSV untuk rentang tanggal tertentu.
            Gunakan hanya jika pengguna meminta laporan absensi diekspor atau diunduh ke Excel atau CSV.
            Wajib menerima tanggal dari dan sampai dalam format YYYY-MM-DD serta format xlsx atau csv.
            Jika format tidak diberikan, gunakan xlsx. Rentang maksimal 31 hari; tanggal sampai tidak boleh sebelum tanggal dari.
            Setelah berhasil, jawab singkat dalam bahasa Indonesia dan jangan menyalin marker hasil tool.
        DESC;
    }

    public function handle(Request $request): Stringable|string
    {
        $format = $request['format'] ?? 'xlsx';
        if (! is_string($format) || ! in_array($format, ['xlsx', 'csv'], true)) {
            throw new InvalidArgumentException('Format ekspor harus xlsx atau csv.');
        }

        $dari = $this->date($request['dari'] ?? null, 'dari');
        $sampai = $this->date($request['sampai'] ?? null, 'sampai');

        if ($dari->greaterThan($sampai)) {
            throw new InvalidArgumentException('Tanggal dari tidak boleh setelah tanggal sampai.');
        }

        $calendarDays = $dari->diffInDays($sampai) + 1;
        if ($calendarDays > self::MAX_CALENDAR_DAYS) {
            throw new InvalidArgumentException('Rentang ekspor maksimal 31 hari.');
        }

        return '[[EXPORT_EXCEL:'.json_encode([
            'dari' => $dari->format('Y-m-d'),
            'sampai' => $sampai->format('Y-m-d'),
            'format' => $format,
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).']]';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'dari' => $schema->string()
                ->format('date')
                ->pattern('^\\d{4}-\\d{2}-\\d{2}$')
                ->required(),
            'sampai' => $schema->string()
                ->format('date')
                ->pattern('^\\d{4}-\\d{2}-\\d{2}$')
                ->required(),
            'format' => $schema->string()
                ->enum(['xlsx', 'csv']),
        ];
    }

    private function date(mixed $value, string $field): CarbonImmutable
    {
        if (! is_string($value) || ! preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $value)) {
            throw new InvalidArgumentException("Tanggal {$field} harus berformat YYYY-MM-DD.");
        }

        $date = CarbonImmutable::createFromFormat('!Y-m-d', $value);

        if ($date === false || $date->format('Y-m-d') !== $value) {
            throw new InvalidArgumentException("Tanggal {$field} tidak valid.");
        }

        return $date;
    }
}
