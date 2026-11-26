<?php

namespace Tests\Unit;

use App\Tools\ExportAttendanceTool;
use InvalidArgumentException;
use Laravel\Ai\Tools\Request;
use PHPUnit\Framework\TestCase;

class ExportAttendanceToolTest extends TestCase
{
    public function test_valid_one_week_range_defaults_to_xlsx_marker(): void
    {
        $result = (new ExportAttendanceTool)->handle(new Request([
            'dari' => '2026-11-23',
            'sampai' => '2026-11-29',
        ]));

        $this->assertSame(
            '[[EXPORT_EXCEL:{"dari":"2026-11-23","sampai":"2026-11-29","format":"xlsx"}]]',
            (string) $result,
        );
    }

    public function test_csv_range_returns_csv_marker(): void
    {
        $result = (new ExportAttendanceTool)->handle(new Request([
            'dari' => '2026-11-23',
            'sampai' => '2026-11-29',
            'format' => 'csv',
        ]));

        $this->assertSame(
            '[[EXPORT_EXCEL:{"dari":"2026-11-23","sampai":"2026-11-29","format":"csv"}]]',
            (string) $result,
        );
    }

    public function test_invalid_format_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Format');

        (new ExportAttendanceTool)->handle(new Request([
            'dari' => '2026-11-23',
            'sampai' => '2026-11-29',
            'format' => 'pdf',
        ]));
    }

    public function test_thirty_one_day_range_is_accepted(): void
    {
        $result = (new ExportAttendanceTool)->handle(new Request([
            'dari' => '2026-01-01',
            'sampai' => '2026-01-31',
        ]));

        $this->assertStringContainsString('"format":"xlsx"', (string) $result);
    }

    public function test_reversed_range_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('tidak boleh setelah');

        (new ExportAttendanceTool)->handle(new Request([
            'dari' => '2026-11-29',
            'sampai' => '2026-11-23',
        ]));
    }

    public function test_overlong_range_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('maksimal 31 hari');

        (new ExportAttendanceTool)->handle(new Request([
            'dari' => '2026-01-01',
            'sampai' => '2026-02-02',
        ]));
    }

    public function test_invalid_calendar_date_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new ExportAttendanceTool)->handle(new Request([
            'dari' => '2026-02-30',
            'sampai' => '2026-03-01',
        ]));
    }
}
