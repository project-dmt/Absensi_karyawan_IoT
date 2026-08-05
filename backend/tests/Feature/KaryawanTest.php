<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Employee;
use App\Models\Division;
use App\Models\Attendance;

class KaryawanTest extends TestCase
{
    use RefreshDatabase;

    private function apiKey(): string
    {
        return config('services.api_keys')[0] ?? 'test-api-key';
    }

    public function test_index_requires_auth(): void
    {
        $response = $this->getJson('/api/karyawan');

        $response->assertStatus(401);
    }

    public function test_index_returns_paginated_data(): void
    {
        $user = \App\Models\User::factory()->create();
        Division::factory()->count(3)->has(Employee::factory()->count(2))->create();

        $response = $this->actingAs($user)->getJson('/api/karyawan');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Data karyawan berhasil diambil',
            ])
            ->assertJsonStructure(['data' => ['data', 'current_page', 'total']]);
    }

    public function test_index_search(): void
    {
        $user = \App\Models\User::factory()->create();
        $divisi = Division::factory()->create();
        Employee::factory()->create(['nama' => 'Budi Santoso', 'divisi_id' => $divisi->id]);
        Employee::factory()->create(['nama' => 'Andi Wijaya', 'divisi_id' => $divisi->id]);

        $response = $this->actingAs($user)->getJson('/api/karyawan?search=Budi');

        $response->assertOk()
            ->assertJsonCount(1, 'data.data');
    }

    public function test_index_filter_by_divisi(): void
    {
        $user = \App\Models\User::factory()->create();
        $divisi1 = Division::factory()->create();
        $divisi2 = Division::factory()->create();
        Employee::factory()->count(2)->create(['divisi_id' => $divisi1->id]);
        Employee::factory()->count(3)->create(['divisi_id' => $divisi2->id]);

        $response = $this->actingAs($user)->getJson("/api/karyawan?divisi_id={$divisi1->id}");

        $response->assertOk()
            ->assertJsonCount(2, 'data.data');
    }

    public function test_store_creates_karyawan(): void
    {
        $user = \App\Models\User::factory()->create();
        $divisi = Division::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/karyawan', [
            'nama' => 'Test Karyawan',
            'nip' => 'NIP123456789012',
            'rfid_uid' => 'RFID001',
            'divisi_id' => $divisi->id,
            'status' => 'aktif',
        ]);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
                'data' => ['nama' => 'Test Karyawan'],
            ]);

        $this->assertDatabaseHas('employees', ['nama' => 'Test Karyawan']);
    }

    public function test_store_validation(): void
    {
        $user = \App\Models\User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/karyawan', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama', 'nip', 'rfid_uid']);
    }

    public function test_show_returns_karyawan(): void
    {
        $user = \App\Models\User::factory()->create();
        $divisi = Division::factory()->create();
        $karyawan = Employee::factory()->create(['divisi_id' => $divisi->id]);

        $response = $this->actingAs($user)->getJson("/api/karyawan/{$karyawan->id}");

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => ['id' => $karyawan->id, 'nama' => $karyawan->nama],
            ]);
    }

    public function test_update_karyawan(): void
    {
        $user = \App\Models\User::factory()->create();
        $karyawan = Employee::factory()->create();

        $response = $this->actingAs($user)->putJson("/api/karyawan/{$karyawan->id}", [
            'nama' => 'Nama Updated',
        ]);

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('employees', ['id' => $karyawan->id, 'nama' => 'Nama Updated']);
    }

    public function test_destroy_karyawan(): void
    {
        $user = \App\Models\User::factory()->superadmin()->create();
        $karyawan = Employee::factory()->create();

        $response = $this->actingAs($user)->deleteJson("/api/karyawan/{$karyawan->id}");

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('employees', ['id' => $karyawan->id]);
    }

    public function test_destroy_karyawan_non_superadmin_forbidden(): void
    {
        $user = \App\Models\User::factory()->create(); // admin, not superadmin
        $karyawan = Employee::factory()->create();

        $response = $this->actingAs($user)->deleteJson("/api/karyawan/{$karyawan->id}");

        $response->assertStatus(403)
            ->assertJson(['success' => false]);
    }

    public function test_destroy_karyawan_with_attendance_blocked(): void
    {
        $user = \App\Models\User::factory()->superadmin()->create();
        $karyawan = Employee::factory()->has(Attendance::factory()->count(1))->create();

        $response = $this->actingAs($user)->deleteJson("/api/karyawan/{$karyawan->id}");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Karyawan masih memiliki data absensi, tidak bisa dihapus',
            ]);

        $this->assertDatabaseHas('employees', ['id' => $karyawan->id]);
    }
}
