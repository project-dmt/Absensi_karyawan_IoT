<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Division;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    private function apiKey(): string
    {
        return config('services.api_keys')[0] ?? 'test-api-key';
    }

    public function test_search_requires_auth(): void
    {
        $response = $this->getJson('/api/search?q=test');

        $response->assertStatus(401);
    }

    public function test_search_requires_min_2_chars(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/search?q=a');

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['q']);
    }

    public function test_search_returns_karyawan_and_divisi_results(): void
    {
        $user = User::factory()->create();
        $divisi = Division::factory()->create(['nama_divisi' => 'Engineering']);
        $employee = Employee::factory()->create([
            'nama' => 'Budi Santoso',
            'nip' => 'NIP123456789012',
            'divisi_id' => $divisi->id,
        ]);

        $response = $this->actingAs($user)->getJson('/api/search?q=Budi');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'message' => 'Hasil pencarian berhasil diambil',
            ])
            ->assertJsonStructure([
                'data' => [
                    'karyawan',
                    'divisi',
                    'total',
                ],
            ]);

        $data = $response->json('data');
        $this->assertGreaterThanOrEqual(1, count($data['karyawan']));
        $this->assertEquals('karyawan', $data['karyawan'][0]['type']);
        $this->assertEquals('Budi Santoso', $data['karyawan'][0]['title']);
    }

    public function test_search_with_no_results(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/search?q=XYZNOTFOUND');

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'total' => 0,
                    'karyawan' => [],
                    'divisi' => [],
                ],
            ]);
    }
}
