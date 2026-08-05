<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Employee;
use App\Models\Division;
use App\Models\Attendance;
use App\Models\Schedule;

class AbsensiDeviceTest extends TestCase
{
    use RefreshDatabase;

    private function apiKey(): string
    {
        return config('services.api_keys')[0] ?? 'test-api-key';
    }

    private function withApiKey(): array
    {
        return ['X-API-Key' => $this->apiKey()];
    }

    public function test_device_post_attendance(): void
    {
        $divisi = Division::factory()->create();
        $employee = Employee::factory()->create([
            'rfid_uid' => 'ABC123',
            'divisi_id' => $divisi->id,
        ]);
        Schedule::factory()->create();

        $response = $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey());

        $response->assertCreated()
            ->assertJson(['success' => true])
            ->assertJsonPath('data.nama', $employee->nama);

        $this->assertDatabaseHas('attendance', [
            'employee_id' => $employee->id,
        ]);
    }

    public function test_device_invalid_api_key(): void
    {
        $response = $this->postJson('/api/absensi', ['uid' => 'ABC123'], [
            'X-API-Key' => 'wrong-key-12345',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'success' => false,
                'message' => 'Unauthorized: Invalid API Key',
            ]);
    }

    public function test_device_missing_api_key(): void
    {
        $response = $this->postJson('/api/absensi', ['uid' => 'ABC123']);

        $response->assertStatus(401);
    }

    public function test_device_unknown_rfid(): void
    {
        Schedule::factory()->create();

        $response = $this->postJson('/api/absensi', ['uid' => 'UNKNOWN_RFID'], $this->withApiKey());

        $response->assertStatus(404)
            ->assertJson(['success' => false]);
    }

    public function test_device_inactive_employee_rejected(): void
    {
        $divisi = Division::factory()->create();
        Employee::factory()->nonaktif()->create([
            'rfid_uid' => 'INACTIVE1',
            'divisi_id' => $divisi->id,
        ]);
        Schedule::factory()->create();

        $response = $this->postJson('/api/absensi', ['uid' => 'INACTIVE1'], $this->withApiKey());

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
                'message' => 'Karyawan tidak aktif',
            ]);
    }

    /**
     * @requires PHP 8.1
     * Checkout flow uses lockForUpdate() inside DB::transaction()
     * which requires MySQL. SQLite doesn't support SELECT ... FOR UPDATE.
     */
    public function test_checkout_and_alpha_flows_require_mysql(): void
    {
        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped('Checkout/alpha tests require MySQL (lockForUpdate not supported in SQLite)');
        }
    }
}
