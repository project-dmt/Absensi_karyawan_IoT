<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Division;
use App\Models\User;
use App\Models\Employee;
use App\Models\RfidScan;
use App\Models\Schedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AbsensiDeviceTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

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

    public function test_device_uid_is_case_insensitive(): void
    {
        $divisi = Division::factory()->create();
        $employee = Employee::factory()->create([
            'rfid_uid' => 'abc123',
            'divisi_id' => $divisi->id,
        ]);
        Schedule::factory()->create();

        $response = $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey());

        $response->assertCreated()
            ->assertJsonPath('data.nama', $employee->nama);

        $this->assertDatabaseHas('attendance', [
            'employee_id' => $employee->id,
        ]);
    }

    public function test_unknown_card_is_captured_when_register_session_pending(): void
    {
        Schedule::factory()->create();

        $scan = RfidScan::create([
            'token' => 'tok-register-1',
            'status' => 'waiting',
            'expires_at' => now()->addSeconds(60),
        ]);

        $response = $this->postJson('/api/absensi', ['uid' => 'newcard99'], $this->withApiKey());

        $response->assertOk()
            ->assertJsonPath('data.mode', 'register')
            ->assertJsonPath('data.uid', 'NEWCARD99');

        $this->assertDatabaseHas('rfid_scans', [
            'id' => $scan->id,
            'status' => 'completed',
            'uid' => 'NEWCARD99',
        ]);

        // Belum ada absensi yang tercatat (kartu memang belum dikenal)
        $this->assertDatabaseCount('attendance', 0);
    }

    public function test_known_card_still_records_attendance_during_register_session(): void
    {
        $divisi = Division::factory()->create();
        $employee = Employee::factory()->create([
            'rfid_uid' => 'ABC123',
            'divisi_id' => $divisi->id,
        ]);
        Schedule::factory()->create();

        $scan = RfidScan::create([
            'token' => 'tok-register-2',
            'status' => 'waiting',
            'expires_at' => now()->addSeconds(60),
        ]);

        $response = $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey());

        $response->assertCreated()
            ->assertJsonPath('data.mode', 'register')
            ->assertJsonPath('data.nama', $employee->nama);

        // Tap-nya tidak hilang: absensi tetap tercatat
        $this->assertDatabaseHas('attendance', [
            'employee_id' => $employee->id,
        ]);

        $this->assertDatabaseHas('rfid_scans', [
            'id' => $scan->id,
            'status' => 'completed',
            'uid' => 'ABC123',
        ]);
    }

    public function test_expired_register_session_does_not_capture_uid(): void
    {
        Schedule::factory()->create();

        $scan = RfidScan::create([
            'token' => 'tok-expired',
            'status' => 'waiting',
            'expires_at' => now()->subSeconds(10),
        ]);

        $response = $this->postJson('/api/absensi', ['uid' => 'UNKNOWN_RFID'], $this->withApiKey());

        $response->assertStatus(404);

        $this->assertDatabaseHas('rfid_scans', [
            'id' => $scan->id,
            'status' => 'waiting',
        ]);
    }

    /**
     * Alur checkout pakai lockForUpdate() di dalam DB::transaction(),
     * yang cuma didupport MySQL/MariaDB (SQLite ga bisa SELECT ... FOR UPDATE).
     *
     * Jalankan suite ini di MySQL:
     *   php artisan test -c phpunit.mysql.xml --filter=AbsensiDeviceTest
     */
    public function test_checkout_flow_updates_jam_pulang_on_mysql(): void
    {
        $this->skipIfNotMysql('Checkout/alpha tests butuh MySQL (lockForUpdate tidak didukung SQLite)');

        $divisi = Division::factory()->create();
        $employee = Employee::factory()->create([
            'rfid_uid' => 'ABC123',
            'divisi_id' => $divisi->id,
        ]);
        Schedule::factory()->create(['jam_pulang_standar' => '17:00:00']);

        // Tap pertama = check-in (jam 08:05, masih dalam toleransi 15 menit)
        Carbon::setTestNow(Carbon::parse('2026-09-20 08:05:00', config('app.timezone')));

        $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey())
            ->assertCreated()
            ->assertJsonPath('data.status', 'Hadir');

        // Tap kedua setelah jam pulang = checkout
        Carbon::setTestNow(Carbon::parse('2026-09-20 17:30:00', config('app.timezone')));

        $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey())
            ->assertCreated()
            ->assertJsonPath('data.status', 'Checkout Berhasil')
            ->assertJsonPath('data.jam_pulang', '17:30:00');

        $this->assertDatabaseHas('attendance', [
            'employee_id' => $employee->id,
            'status' => 'Hadir',
            'jam_pulang' => '17:30:00',
        ]);
    }

    public function test_checkout_rejected_before_jam_pulang_on_mysql(): void
    {
        $this->skipIfNotMysql('Checkout/alpha tests butuh MySQL (lockForUpdate tidak didukung SQLite)');

        $divisi = Division::factory()->create();
        Employee::factory()->create([
            'rfid_uid' => 'ABC123',
            'divisi_id' => $divisi->id,
        ]);
        Schedule::factory()->create(['jam_pulang_standar' => '17:00:00']);

        Carbon::setTestNow(Carbon::parse('2026-09-20 08:05:00', config('app.timezone')));

        $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey())->assertCreated();

        // Tap kedua masih jam kerja -> ditolak
        Carbon::setTestNow(Carbon::parse('2026-09-20 12:00:00', config('app.timezone')));

        $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey())
            ->assertStatus(400)
            ->assertJsonPath('message', 'Checkout belum bisa. Jam pulang standar: 17:00:00');
    }

    public function test_alpha_status_cannot_checkout_on_mysql(): void
    {
        $this->skipIfNotMysql('Checkout/alpha tests butuh MySQL (lockForUpdate tidak didukung SQLite)');

        $divisi = Division::factory()->create();
        $employee = Employee::factory()->create([
            'rfid_uid' => 'ABC123',
            'divisi_id' => $divisi->id,
        ]);
        Schedule::factory()->create();

        // Absensi manual berstatus Alpha (misal karyawan yang absen via atasan)
        Attendance::create([
            'employee_id' => $employee->id,
            'tanggal' => Carbon::today(config('app.timezone'))->toDateString(),
            'status' => 'Alpha',
        ]);

        $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey())
            ->assertStatus(400)
            ->assertJsonPath('message', 'Absensi dengan status Alpha tidak bisa checkout');
    }

    /**
     * Cekot 2x dalam waktu yang sama harus tetap aman (row lock MySQL).
     */
    public function test_double_tap_does_not_duplicate_attendance_on_mysql(): void
    {
        $this->skipIfNotMysql('Checkout/alpha tests butuh MySQL (lockForUpdate tidak didukung SQLite)');

        $divisi = Division::factory()->create();
        $employee = Employee::factory()->create([
            'rfid_uid' => 'ABC123',
            'divisi_id' => $divisi->id,
        ]);
        Schedule::factory()->create();

        Carbon::setTestNow(Carbon::parse('2026-09-20 08:05:00', config('app.timezone')));

        $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey())->assertCreated();
        $this->postJson('/api/absensi', ['uid' => 'ABC123'], $this->withApiKey())->assertStatus(400);

        $this->assertDatabaseCount('attendance', 1);
    }

    public function test_clear_today_removes_today_attendance_and_realtime_events_only(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-25 10:00:00', 'Asia/Jakarta'));
        $today = Carbon::today('Asia/Jakarta')->toDateString();
        $yesterday = Carbon::yesterday('Asia/Jakarta')->toDateString();
        Attendance::factory()->create(['tanggal' => $today]);
        Attendance::factory()->create(['tanggal' => $yesterday]);
        DB::table('realtime_events')->insert([
            ['event_type' => 'check_in', 'employee_name' => 'Today', 'employee_nip' => null, 'status' => 'Hadir', 'jam' => '08:00', 'created_at' => Carbon::parse('2026-11-25 08:00:00', 'Asia/Jakarta'), 'updated_at' => Carbon::parse('2026-11-25 08:00:00', 'Asia/Jakarta')],
            ['event_type' => 'check_in', 'employee_name' => 'Yesterday', 'employee_nip' => null, 'status' => 'Hadir', 'jam' => '08:00', 'created_at' => Carbon::parse('2026-11-24 08:00:00', 'Asia/Jakarta'), 'updated_at' => Carbon::parse('2026-11-24 08:00:00', 'Asia/Jakarta')],
        ]);

        $this->actingAs(User::factory()->create())->deleteJson('/api/absensi/clear-today')
            ->assertOk()
            ->assertJsonPath('data.deleted', 1)
            ->assertJsonPath('data.events_deleted', 1);

        $this->assertDatabaseCount('attendance', 1);
        $this->assertDatabaseCount('realtime_events', 1);
        $this->assertTrue(Attendance::whereDate('tanggal', $yesterday)->exists());
        $this->assertTrue(DB::table('realtime_events')->where('employee_name', 'Yesterday')->exists());
    }

    public function test_authenticated_user_can_update_attendance(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $attendance = Attendance::factory()->create(['status' => 'Hadir']);

        $this->actingAs($user)
            ->putJson('/api/absensi/' . $attendance->id, [
                'status' => 'Terlambat',
                'keterangan' => 'Koreksi jam masuk',
            ])
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('attendance', [
            'id' => $attendance->id,
            'status' => 'Terlambat',
            'keterangan' => 'Koreksi jam masuk',
        ]);
    }

    public function test_authenticated_user_can_clear_attendance_optional_fields(): void
    {
        $user = User::factory()->create(['role' => 'admin']);
        $attendance = Attendance::factory()->create([
            'status' => 'Hadir',
            'jam_pulang' => '17:00:00',
            'keterangan' => 'Koreksi sebelumnya',
        ]);

        $this->actingAs($user)
            ->putJson('/api/absensi/' . $attendance->id, [
                'status' => 'Hadir',
                'jam_pulang' => null,
                'keterangan' => null,
            ])
            ->assertOk();

        $this->assertDatabaseHas('attendance', [
            'id' => $attendance->id,
            'jam_pulang' => null,
            'keterangan' => null,
        ]);
    }

    private function skipIfNotMysql(string $message): void
    {
        if (config('database.default') !== 'mysql') {
            $this->markTestSkipped($message);
        }
    }
}
