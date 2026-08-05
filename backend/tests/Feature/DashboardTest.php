<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Employee;
use App\Models\Division;
use Carbon\Carbon;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private function apiKey(): string
    {
        return config('services.api_keys')[0] ?? 'test-api-key';
    }

    public function test_index_requires_auth(): void
    {
        $response = $this->getJson('/api/dashboard');

        $response->assertStatus(401);
    }

    public function test_index_returns_stats_with_correct_structure(): void
    {
        $user = User::factory()->create();
        $today = Carbon::today(config('app.timezone'))->toDateString();
        $divisi = Division::factory()->create(['nama_divisi' => 'Engineering']);
        $employee = Employee::factory()->create([
            'divisi_id' => $divisi->id,
            'status' => 'aktif',
        ]);

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

        $response = $this->actingAs($user)->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Dashboard berhasil diambil',
            ])
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'total_karyawan',
                    'karyawan_aktif',
                    'absensi_hari_ini' => [
                        'total_hadir',
                        'hadir',
                        'terlambat',
                        'izin',
                        'alpha',
                    ],
                    'karyawan_per_divisi',
                ],
            ]);

        $data = $response->json('data');
        $this->assertEquals(1, $data['total_karyawan']);
        $this->assertEquals(1, $data['karyawan_aktif']);
        $this->assertEquals(1, $data['absensi_hari_ini']['total_hadir']);
    }

    public function test_index_returns_zero_counts_when_no_data(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/dashboard');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_karyawan' => 0,
                    'karyawan_aktif' => 0,
                    'absensi_hari_ini' => [
                        'total_hadir' => 0,
                        'hadir' => 0,
                        'terlambat' => 0,
                        'izin' => 0,
                        'alpha' => 0,
                    ],
                ],
            ]);
    }
}
