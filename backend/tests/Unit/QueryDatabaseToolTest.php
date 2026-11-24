<?php

namespace Tests\Unit;

use App\Tools\QueryDatabaseTool;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use RuntimeException;

/**
 * Guard allowlist tabel pada QueryDatabaseTool::assertReadOnly().
 *
 * Query hanya boleh menyentuh tabel non-sensitif: employees, divisions,
 * schedules, attendance, rfid_scans — bukan users (hash password, dsb.).
 */
class QueryDatabaseToolTest extends TestCase
{
    private function assertReadOnly(string $sql): string
    {
        $method = new ReflectionMethod(QueryDatabaseTool::class, 'assertReadOnly');
        $method->setAccessible(true);

        return $method->invoke(new QueryDatabaseTool(), $sql);
    }

    public function test_select_from_users_ditolak(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Tabel tidak diizinkan');

        $this->assertReadOnly('SELECT * FROM users');
    }

    public function test_whitespace_aneh_tetap_ditolak(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Tabel tidak diizinkan');

        $this->assertReadOnly("select\tpassword\nfrom users");
    }

    public function test_query_join_tabel_diizinkan_lolos(): void
    {
        $sql = 'SELECT e.nama, d.nama_divisi FROM employees e '
            .'JOIN divisions d ON e.division_id = d.id LIMIT 5';

        $this->assertSame($sql, $this->assertReadOnly($sql));
    }

    public function test_union_ke_users_ditolak(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('UNION');

        $this->assertReadOnly('SELECT nama FROM employees UNION SELECT password FROM users');
    }

    public function test_subquery_ke_users_ditolak(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Tabel tidak diizinkan');

        $this->assertReadOnly('SELECT (SELECT password FROM users LIMIT 1) AS p FROM employees LIMIT 1');
    }
}
