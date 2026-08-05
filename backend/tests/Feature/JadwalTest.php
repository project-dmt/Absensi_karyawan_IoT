<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Schedule;

class JadwalTest extends TestCase
{
    use RefreshDatabase;

    private function apiKey(): string
    {
        return config('services.api_keys')[0] ?? 'test-api-key';
    }

    public function test_index_requires_auth(): void
    {
        $response = $this->getJson('/api/jadwal');

        $response->assertStatus(401);
    }

    public function test_index_returns_schedule(): void
    {
        $user = User::factory()->create();
        Schedule::factory()->create([
            'jam_masuk_standar' => '08:00:00',
            'jam_pulang_standar' => '17:00:00',
            'toleransi_menit' => 15,
        ]);

        $response = $this->actingAs($user)->getJson('/api/jadwal');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Data jadwal berhasil diambil',
                'data' => [
                    'jam_masuk_standar' => '08:00:00',
                    'jam_pulang_standar' => '17:00:00',
                    'toleransi_menit' => 15,
                ],
            ]);
    }

    public function test_update_schedule(): void
    {
        $user = User::factory()->create();
        Schedule::factory()->create();

        $response = $this->actingAs($user)->putJson('/api/jadwal', [
            'jam_masuk_standar' => '07:30:00',
            'jam_pulang_standar' => '16:30:00',
            'toleransi_menit' => 10,
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Jadwal kerja berhasil diupdate',
                'data' => [
                    'jam_masuk_standar' => '07:30:00',
                    'jam_pulang_standar' => '16:30:00',
                    'toleransi_menit' => 10,
                ],
            ]);

        $this->assertDatabaseHas('schedules', [
            'jam_masuk_standar' => '07:30:00',
            'jam_pulang_standar' => '16:30:00',
            'toleransi_menit' => 10,
        ]);
    }

    public function test_update_validation_invalid_format(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->putJson('/api/jadwal', [
            'jam_masuk_standar' => 'bukan-waktu',
            'jam_pulang_standar' => 'bukan-waktu',
            'toleransi_menit' => 'bukan-angka',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['jam_masuk_standar', 'jam_pulang_standar', 'toleransi_menit']);
    }
}
