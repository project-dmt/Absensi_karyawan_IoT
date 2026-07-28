<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Employee;
use App\Models\Division;
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
