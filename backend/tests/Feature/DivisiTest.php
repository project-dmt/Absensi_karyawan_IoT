<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Division;
use App\Models\Attendance;

class DivisiTest extends TestCase
{
    use RefreshDatabase;

    private function apiKey(): string
    {
        return config('services.api_keys')[0] ?? 'test-api-key';
    }

    public function test_index_requires_auth(): void
    {
        $response = $this->getJson('/api/divisi');

        $response->assertStatus(401);
    }

    public function test_index_returns_list_of_divisions(): void
    {
        $user = User::factory()->create();
        Division::factory()->count(3)->create();

        $response = $this->actingAs($user)->getJson('/api/divisi');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Data divisi berhasil diambil',
            ])
            ->assertJsonCount(3, 'data');
    }

    public function test_store_creates_divisi(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/divisi', [
            'nama_divisi' => 'Engineering',
        ]);

        $response->assertCreated()
            ->assertJson([
                'success' => true,
                'message' => 'Divisi berhasil ditambahkan',
                'data' => ['nama_divisi' => 'Engineering'],
            ]);

        $this->assertDatabaseHas('divisions', ['nama_divisi' => 'Engineering']);
    }

    public function test_store_validation_empty_body(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/divisi', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama_divisi']);
    }

    public function test_store_duplicate_name(): void
    {
        $user = User::factory()->create();
        Division::factory()->create(['nama_divisi' => 'HR']);

        $response = $this->actingAs($user)->postJson('/api/divisi', [
            'nama_divisi' => 'HR',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['nama_divisi']);
    }

    public function test_show_returns_divisi_with_employees(): void
    {
        $user = User::factory()->create();
        $divisi = Division::factory()->create();
        Employee::factory()->count(2)->create(['divisi_id' => $divisi->id]);

        $response = $this->actingAs($user)->getJson("/api/divisi/{$divisi->id}");

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => ['id' => $divisi->id, 'nama_divisi' => $divisi->nama_divisi],
            ])
            ->assertJsonCount(2, 'data.employees');
    }

    public function test_show_not_found(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/divisi/9999');

        $response->assertStatus(404)
            ->assertJson(['success' => false]);
    }

    public function test_update_divisi(): void
    {
        $user = User::factory()->create();
        $divisi = Division::factory()->create();

        $response = $this->actingAs($user)->putJson("/api/divisi/{$divisi->id}", [
            'nama_divisi' => 'Updated Division',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Divisi berhasil diupdate',
            ]);

        $this->assertDatabaseHas('divisions', ['id' => $divisi->id, 'nama_divisi' => 'Updated Division']);
    }

    public function test_destroy_divisi_superadmin(): void
    {
        $user = User::factory()->superadmin()->create();
        $divisi = Division::factory()->create();

        $response = $this->actingAs($user)->deleteJson("/api/divisi/{$divisi->id}");

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Divisi berhasil dihapus',
            ]);

        $this->assertDatabaseMissing('divisions', ['id' => $divisi->id]);
    }

    public function test_destroy_forbidden_for_non_superadmin(): void
    {
        $user = User::factory()->create();
        $divisi = Division::factory()->create();

        $response = $this->actingAs($user)->deleteJson("/api/divisi/{$divisi->id}");

        $response->assertStatus(403)
            ->assertJson(['success' => false]);
    }

    public function test_destroy_blocked_if_divisi_has_employees(): void
    {
        $user = User::factory()->superadmin()->create();
        $divisi = Division::factory()->create();
        Employee::factory()->create(['divisi_id' => $divisi->id]);

        $response = $this->actingAs($user)->deleteJson("/api/divisi/{$divisi->id}");

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Divisi masih memiliki karyawan, tidak bisa dihapus',
            ]);

        $this->assertDatabaseHas('divisions', ['id' => $divisi->id]);
    }
}
