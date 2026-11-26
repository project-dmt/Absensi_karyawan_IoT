<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Employee;
use App\Models\Division;
use App\Models\Attendance;
use Carbon\Carbon;

class LaporanTest extends TestCase
{
    use RefreshDatabase;

    private function apiKey(): string
    {
        return config('services.api_keys')[0] ?? 'test-api-key';
    }

    public function test_index_requires_auth(): void
    {
        $response = $this->getJson('/api/laporan');

        $response->assertStatus(401);
    }

    public function test_index_requires_dari_and_sampai_params(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/laporan');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['dari', 'sampai']);
    }

    public function test_index_returns_filtered_attendance(): void
    {
        $user = User::factory()->create();
        $divisi = Division::factory()->create();
        $employee = Employee::factory()->create(['divisi_id' => $divisi->id]);

        $today = Carbon::today(config('app.timezone'))->toDateString();

        DB::table('attendance')->insert([
            'employee_id' => $employee->id,
            'tanggal' => $today,
            'jam_masuk' => '08:00:00',
            'jam_pulang' => null,
            'status' => 'Hadir',
            'keterangan' => null,
            'input_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson("/api/laporan?dari={$today}&sampai={$today}");

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Laporan absensi berhasil diambil',
            ])
            ->assertJsonStructure(['data' => ['data', 'current_page', 'total']]);

        $this->assertGreaterThan(0, $response->json('data.total'));
    }

    public function test_grafik_counts_implicit_alpha_per_active_employee_date_and_division(): void
    {
        $user = User::factory()->create();
        $division = Division::factory()->create();
        $otherDivision = Division::factory()->create();
        $missing = Employee::factory()->create(['divisi_id' => $division->id]);
        $present = Employee::factory()->create(['divisi_id' => $division->id]);
        $izin = Employee::factory()->create(['divisi_id' => $division->id]);
        $sakit = Employee::factory()->create(['divisi_id' => $division->id]);
        $inactive = Employee::factory()->nonaktif()->create(['divisi_id' => $division->id]);
        $outside = Employee::factory()->create(['divisi_id' => $otherDivision->id]);

        foreach ([$present, $inactive, $outside] as $employee) {
            Attendance::factory()->create(['employee_id' => $employee->id, 'tanggal' => '2026-01-01', 'status' => 'Hadir']);
        }
        Attendance::factory()->create(['employee_id' => $present->id, 'tanggal' => '2026-01-02', 'status' => 'Hadir']);
        Attendance::factory()->create(['employee_id' => $izin->id, 'tanggal' => '2026-01-01', 'status' => 'Izin']);
        Attendance::factory()->create(['employee_id' => $sakit->id, 'tanggal' => '2026-01-01', 'status' => 'Sakit']);

        $response = $this->actingAs($user)->getJson('/api/laporan/grafik?dari=2026-01-01&sampai=2026-01-02&periode=harian&divisi_id='.$division->id);

        $response->assertOk();
        $this->assertSame(4, $response->json('data.totals.Alpha'));
        $this->assertSame(2, $response->json('data.totals.Hadir'));
        $this->assertSame(1, $response->json('data.totals.Izin'));
        $this->assertSame(1, $response->json('data.totals.Sakit'));
        $this->assertSame(8, $response->json('data.totals.total_records'));
        $this->assertSame(4, $response->json('data.divisions.0.status_counts.Alpha'));
        $this->assertSame(8, $response->json('data.divisions.0.total_records'));
    }

    public function test_export_returns_xlsx(): void
    {
        $user = User::factory()->create();
        $divisi = Division::factory()->create();
        $employee = Employee::factory()->create(['divisi_id' => $divisi->id]);

        $today = Carbon::today(config('app.timezone'))->toDateString();

        DB::table('attendance')->insert([
            'employee_id' => $employee->id,
            'tanggal' => $today,
            'jam_masuk' => '08:00:00',
            'jam_pulang' => null,
            'status' => 'Hadir',
            'keterangan' => null,
            'input_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson("/api/laporan/export?dari={$today}&sampai={$today}");

        $response->assertOk()
            ->assertHeader('Content-Disposition')
            ->assertHeader('Content-Type');
    }

    public function test_export_returns_csv(): void
    {
        $user = User::factory()->create();
        $divisi = Division::factory()->create();
        $employee = Employee::factory()->create(['divisi_id' => $divisi->id]);

        $today = Carbon::today(config('app.timezone'))->toDateString();

        DB::table('attendance')->insert([
            'employee_id' => $employee->id,
            'tanggal' => $today,
            'jam_masuk' => '08:00:00',
            'jam_pulang' => null,
            'status' => 'Hadir',
            'keterangan' => null,
            'input_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson("/api/laporan/export?dari={$today}&sampai={$today}&format=csv");

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=utf-8')
            ->assertHeader('Content-Disposition');
    }
}
