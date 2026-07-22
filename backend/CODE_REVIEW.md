# Code Review: Backend Absensi IoT (Laravel 13)

> Review Date: 2026-07-22
> Reviewer: opencode
> Target: Production readiness assessment

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Issue List](#issue-list)
   - [CRITICAL - Security](#critical---security)
   - [HIGH - Business Logic](#high---business-logic)
   - [MEDIUM - Architecture](#medium---architecture)
   - [LOW - Code Quality](#low---code-quality)
3. [Recommended Fixes](#recommended-fixes)
4. [Priority Roadmap](#priority-roadmap)

---

## Executive Summary

| Kategori | Score | Status |
|---|---|---|
| Keamanan (Security) | 4/10 | CRITICAL - Wajib fix sebelum production |
| Architecture | 6/10 | Perlu refactor untuk maintainability |
| Business Logic | 5/10 | Ada race condition & edge cases |
| Code Quality | 6/10 | Clean tapi belum siap production |
| **Overall** | **5/10** | **MVP/Prototype ready, NOT production ready** |

**Kesimpulan:** Code ini **bukan code buruk** — ini code yang **belum siap production**. Strukturnya clean, follow Laravel conventions, arsitekturnya masuk akal. Tapi ada beberapa masalah serius yang wajib di-fix sebelum go live.

---

## Issue List

### CRITICAL - Security

#### C1: `.env` file ke-commit ke repository

**File:** `.env`
**Line:** All (entire file)

**Problem:**
`APP_KEY`, `DB_PASSWORD`, `API_KEY` semua visible di repository. Kalau repo public, attacker udah punya semua credentials.

**Evidence:**
```
APP_KEY=base64:7sH+ERfUkNvrE6H0OiDCqbDz1BSQTrl5GBCa5YfUjTE=
DB_PASSWORD=passwordbaru
API_KEY=absensi_iot_rfid_2026
```

**Impact:** Full system compromise. Attacker bisa akses database, impersonate ESP32 devices, dan decrypt data.

**Fix:**
- Tambahin `.env` ke `.gitignore` (pastikan belum ke-track: `git rm --cached .env`)
- Revoke semua key yang udah bocor
- Generate新的 `APP_KEY` via `php artisan key:generate`
- Generate new API key
- Kalau repo udah public, assume compromise — rotate semua credentials

---

#### C2: API Key terlalu simple & tidak ada rate limiting

**File:** `app/Http/Middleware/ValidateApiKey.php:16`
**File:** `routes/api.php:14`

**Problem:**
- API key `absensi_iot_rfid_2026` terlalu predictable dan gak ada rotasi mechanism
- Perbandingan pake `!==` tapi gak ada logging atau blocking kalau key salah berulang kali
- Endpoint `POST /api/absensi` gak ada rate limiting — bisa di-brute force

**Impact:** Attacker bisa brute force API key atau spam absensi data.

**Fix:**
```php
// routes/api.php - tambahin rate limiting
Route::post('/absensi', [AbsensiController::class, 'storeFromDevice'])
    ->middleware(['api.key', 'throttle:60,1'])
    ->name('api.absensi.device');
```

```php
// ValidateApiKey.php - tambahin logging
Log::warning('Failed API key attempt', [
    'ip' => $request->ip(),
    'key_provided' => substr($apiKey ?? '', 0, 8) . '...',
]);
```

---

#### C3: Sanctum token expiration = unlimited

**File:** `config/sanctum.php:53`

**Problem:**
```php
'expiration' => null,
```
Token gak pernah expired. Kalau token bocor, attacker bisa akses selamanya.

**Impact:** Compromised token = permanent access.

**Fix:**
```php
'expiration' => 1440, // 24 jam
```

---

#### C4: `APP_DEBUG=true` di environment

**File:** `.env:4`

**Problem:**
```ini
APP_DEBUG=true
```
Kalau debug mode aktif di production, error messages nge-leak stack trace, file paths, database queries ke client.

**Impact:** Information disclosure → attacker bisa map application internals.

**Fix:**
```ini
APP_DEBUG=false
```

---

#### C5: Password seeder terlalu weak

**File:** `database/seeders/DatabaseSeeder.php:18`

**Problem:**
```php
'password' => Hash::make('password'),
```
Password admin default = `password`. Kalau lupa ganti di production = game over.

**Fix:**
```php
'password' => Hash::make(Str::random(16)),
```
Atau jangan seed password di production environment.

---

#### C6: UserFactory field mismatch dengan Model

**File:** `database/factories/UserFactory.php:28-32`

**Problem:**
```php
return [
    'name' => fake()->name(),           // Model pake 'nama', bukan 'name'
    'email_verified_at' => now(),       // Gak ada di migration
    'remember_token' => Str::random(10), // Gak ada di migration
];
```

**Impact:** Kalau factory dipake buat testing, bakal error atau data inconsistent.

**Fix:**
```php
return [
    'nama' => fake()->name(),
    'email' => fake()->unique()->safeEmail(),
    'password' => static::$password ??= Hash::make('password'),
    'role' => 'admin',
];
```

---

### HIGH - Business Logic

#### B1: Race condition di absensi ESP32

**File:** `app/Http/Controllers/Api/AbsensiController.php:34-55, 74-82`

**Problem:**
Ada gap antara cek `$sudahAbsen` (line 34) dan `DB::transaction` (line 75). Kalau 2 request RFID masuk bersamaan:

```
Timeline:
T1: Request A cek $sudahAbsen → null
T2: Request B cek $sudahAbsen → null
T3: Request A → DB::transaction → create absensi ✓
T4: Request B → DB::transaction → create absensi → UNIQUE CONSTRAINT VIOLATION
```

Unique constraint bakal catch ini, tapi error-nya gak graceful — ESP32 dapet error 500.

**Impact:** Inconsistent data, ESP32 confusion, potential double attendance.

**Fix:**
```php
public function storeFromDevice(Request $request)
{
    $validated = $request->validate([
        'uid' => 'required|string',
    ]);

    $absensi = DB::transaction(function () use ($validated) {
        $karyawan = Employee::where('rfid_uid', $validated['uid'])->lockForUpdate()->first();

        if (!$karyawan) {
            throw new \Exception('Kartu RFID tidak terdaftar');
        }

        if ($karyawan->status !== 'aktif') {
            throw new \Exception('Karyawan tidak aktif');
        }

        $today = Carbon::today('Asia/Jakarta')->toDateString();
        $sudahAbsen = Attendance::where('employee_id', $karyawan->id)
            ->where('tanggal', $today)
            ->first();

        if ($sudahAbsen) {
            if ($sudahAbsen->jam_pulang) {
                throw new \Exception('Sudah checkout hari ini');
            }

            $jamPulang = Carbon::now('Asia/Jakarta')->format('H:i:s');
            $sudahAbsen->update(['jam_pulang' => $jamPulang]);

            return [
                'nama' => $karyawan->nama,
                'status' => 'Checkout Berhasil',
                'jam_pulang' => $jamPulang,
            ];
        }

        // ... logic absensi masuk
    });

    return $this->successResponse($absensi, 'Absensi berhasil');
}
```

---

#### B2: Checkout gak validate attendance status

**File:** `app/Http/Controllers/Api/AbsensiController.php:39-55`

**Problem:**
Kalau status absensi = "Alpha" atau "Izin" (dari admin input manual), terus employee tap lagi, bakal keisi `jam_pulang` — which is wrong.

**Impact:** Data absensi inconsistent, laporan salah.

**Fix:**
```php
if ($sudahAbsen) {
    // Cek status dulu
    if (in_array($sudahAbsen->status, ['Alpha', 'Izin'])) {
        return $this->errorResponse('Absensi dengan status ' . $sudahAbsen->status . ' tidak bisa checkout', 400);
    }

    if ($sudahAbsen->jam_pulang) {
        return $this->errorResponse('Anda sudah checkout hari ini', 400);
    }

    // ... checkout logic
}
```

---

#### B3: Absensi manual race condition

**File:** `app/Http/Controllers/Api/AbsensiController.php:103-113`

**Problem:**
Sama kayak B1 — cek duplikat di luar transaction.

**Fix:**
```php
public function storeManual(Request $request)
{
    $validated = $request->validate([...]);

    $absensi = DB::transaction(function () use ($validated, $request) {
        $sudahAda = Attendance::where('employee_id', $validated['employee_id'])
            ->where('tanggal', $validated['tanggal'])
            ->lockForUpdate()
            ->first();

        if ($sudahAda) {
            throw new \Exception('Absensi untuk karyawan ini tanggal ini sudah ada');
        }

        $validated['input_by'] = $request->user()->id;
        return Attendance::create($validated);
    });

    return $this->successResponse($absensi, 'Absensi manual berhasil ditambahkan', 201);
}
```

---

#### B4: History absensi gak di-paginate

**File:** `app/Http/Controllers/Api/AbsensiController.php:158`

**Problem:**
```php
$absensi = $query->get();
```
Return semua records. Kalau karyawan kerja 10 tahun, bisa ribuan records.

**Impact:** Memory exhaustion, slow response.

**Fix:**
```php
$absensi = $query->paginate($request->per_page ?? 15);
```

---

#### B5: Absensi update gak ada authorization check

**File:** `app/Http/Controllers/Api/AbsensiController.php:119-132`

**Problem:**
Admin bisa update absensi orang lain tanpa authorization check. Gak ada role-based access control.

**Impact:** Data integrity issue, privilege escalation.

**Fix:**
```php
public function update(Request $request, $id)
{
    $absensi = Attendance::findOrFail($id);

    // Authorization check
    if ($request->user()->role !== 'superadmin' && $absensi->input_by !== $request->user()->id) {
        return $this->errorResponse('Unauthorized', 403);
    }

    // ... update logic
}
```

---

### MEDIUM - Architecture

#### A1: Semua logic di Controller — gak ada Service Layer

**File:** `app/Http/Controllers/Api/AbsensiController.php:15-88`

**Problem:**
Method `storeFromDevice` (~70 lines) handle:
- Validation
- Business logic (cek absen, checkout, toleransi)
- Database transaction
- Response format

Kalau logic absensi makin complex (cuti, lembur, shift), controller bakal jadi monster.

**Impact:** Hard to maintain, hard to test, tight coupling.

**Fix:** Extract ke Service Class:

```php
// app/Services/AbsensiService.php
class AbsensiService
{
    public function processFromDevice(string $rfidUid): array
    {
        // All business logic here
    }

    public function processManual(array $data, int $userId): Attendance
    {
        // Manual attendance logic
    }
}

// Controller jadi thin
class AbsensiController extends Controller
{
    public function __construct(
        private AbsensiService $absensiService
    ) {}

    public function storeFromDevice(Request $request)
    {
        $validated = $request->validate(['uid' => 'required|string']);
        $result = $this->absensiService->processFromDevice($validated['uid']);
        return $this->successResponse($result, 'Absensi berhasil');
    }
}
```

---

#### A2: Singleton pattern Jadwal fragile

**File:** `app/Http/Controllers/Api/JadwalController.php:13,26`

**Problem:**
```php
$jadwal = Schedule::first();
```
Assumes cuma ada 1 record. Kalau ada 2 record (human error), data inconsistency.

**Impact:** Business logic breaks silently.

**Fix:**
```php
// Di seeder, pastikan cuma 1 record
// Di controller, pakai firstOrCreate dengan validation
$jadwal = Schedule::firstOrCreate(
    [], // empty conditions = always create if none exists
    [
        'jam_masuk_standar' => '08:00:00',
        'jam_pulang_standar' => '17:00:00',
        'toleransi_menit' => 15,
    ]
);
```

Atau tambahin constraint di migration:
```php
// Cuma boleh 1 row di schedules table
// Implement via application logic, not DB constraint
```

---

#### A3: Magic numbers & hardcoded values

**Files:** Multiple locations

**Problem:**
- `'08:00:00'` di AbsensiController:59, DatabaseSeeder
- `'15'` menit toleransi
- `paginate(15)` di LaporanController
- Status enums di multiple places

**Impact:** Hard to maintain, hard to change.

**Fix:** Kumpulin di config file:

```php
// config/absensi.php
return [
    'default_schedule' => [
        'jam_masuk' => env('DEFAULT_JAM_MASUK', '08:00:00'),
        'jam_pulang' => env('DEFAULT_JAM_PULANG', '17:00:00'),
        'toleransi_menit' => env('DEFAULT_TOLERANSI', 15),
    ],
    'pagination' => [
        'per_page' => env('DEFAULT_PER_PAGE', 15),
    ],
    'statuses' => ['Hadir', 'Terlambat', 'Alpha', 'Izin'],
];
```

---

#### A4: Route parameter name gak konsisten

**File:** `routes/api.php:36`

**Problem:**
```php
Route::get('/karyawan/{karyawan}/absensi', [AbsensiController::class, 'history'])
```
Parameter name `{karyawan}` tapi di controller:
```php
public function history(Request $request, $employeeId)
```

**Impact:** Confusing, inconsistent naming.

**Fix:** Pakai route model binding:
```php
// routes/api.php
Route::get('/karyawan/{employee}/absensi', [AbsensiController::class, 'history'])
    ->name('karyawan.absensi.history');

// Controller
public function history(Request $request, Employee $employee)
{
    // $employee auto-resolved by Laravel
}
```

---

#### A5: Gak ada Form Request classes

**Files:** All controllers

**Problem:**
Validasi langsung di controller pake `$request->validate([...])`. Untuk project kecil fine, tapi kalau validasi makin complex, bakal susah maintain.

**Impact:** Duplicate validation logic, hard to reuse.

**Fix:**
```php
// app/Http/Requests/StoreAbsensiRequest.php
class StoreAbsensiRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'employee_id' => 'required|exists:employees,id',
            'tanggal' => 'required|date',
            'jam_masuk' => 'nullable|date_format:H:i:s',
            'jam_pulang' => 'nullable|date_format:H:i:s',
            'status' => 'required|in:Hadir,Terlambat,Alpha,Izin',
            'keterangan' => 'nullable|string|max:255',
        ];
    }

    public function authorize(): bool
    {
        return true; // or check role
    }
}

// Controller
public function storeManual(StoreAbsensiRequest $request)
{
    // $request->validated() automatically available
    $validated = $request->validated();
    // ...
}
```

---

### LOW - Code Quality

#### Q1: Gak ada test sama sekali

**Problem:**
`phpunit.xml` ada, tapi `tests/` directory kosong. Zero test coverage.

**Impact:** Regresi bugs gak ke-deteksi, refactor jadi scary.

**Fix:** Minimal buat feature test:

```php
// tests/Feature/AbsensiTest.php
class AbsensiTest extends TestCase
{
    public function test_device_can_post_attendance(): void
    {
        // Seed data
        $employee = Employee::factory()->create(['rfid_uid' => 'TEST123']);

        $response = $this->postJson('/api/absensi', ['uid' => 'TEST123'], [
            'X-API-Key' => config('services.api_key'),
        ]);

        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_duplicate_attendance_returns_error(): void
    {
        // ...
    }
}
```

---

#### Q2: Attendance model cast format

**File:** `app/Models/Attendance.php:18-19`

**Problem:**
```php
'jam_masuk' => 'datetime:H:i:s',
'jam_pulang' => 'datetime:H:i:s',
```
Format `datetime:H:i:s` bakal parse time jadi datetime object. Tapi kolom di DB tipenya `time`. Bisa jadi unexpected behavior.

**Impact:** Potential time parsing issues.

**Fix:**
```php
'jam_masuk' => 'string',
'jam_pulang' => 'string',
```
Atau custom accessor:
```php
public function getJamMasukAttribute($value)
{
    return $value ? Carbon::parse($value)->format('H:i:s') : null;
}
```

---

#### Q3: Controller update methods gak return fresh data

**File:** `app/Http/Controllers/Api/AbsensiController.php:130`

**Problem:**
```php
$absensi->update($validated);
return $this->successResponse($absensi, 'Absensi berhasil diupdate');
```
Kalau ada mutator/accessor, data yang di-return mungkin stale.

**Impact:** Stale data returned to client.

**Fix:**
```php
$absensi->update($validated);
return $this->successResponse($absensi->fresh(), 'Absensi berhasil diupdate');
```

---

#### Q4: Gak ada logging di critical paths

**Problem:**
Gak ada `Log::info()` atau `Log::warning()` di:
- Absensi device (tap card)
- Login attempts
- Failed API key validation
- CRUD operations

**Impact:** No audit trail, hard to debug production issues.

**Fix:**
```php
// Di AbsensiController
Log::info('RFID absensi processed', [
    'employee_id' => $karyawan->id,
    'rfid_uid' => $validated['uid'],
    'status' => $status,
    'ip' => $request->ip(),
]);

// Di ValidateApiKey middleware
Log::warning('Invalid API key attempt', [
    'ip' => $request->ip(),
    'key_provided' => substr($apiKey ?? '', 0, 8) . '...',
]);
```

---

#### Q5: Export endpoint misleading response

**File:** `app/Http/Controllers/Api/LaporanController.php:42-44`

**Problem:**
```php
public function export(Request $request)
{
    return $this->successResponse(null, 'Fitur export akan segera tersedia');
}
```
Return 200 success dengan message "akan segera tersedia" — misleading.

**Impact:** Client confusion, poor API design.

**Fix:**
```php
public function export(Request $request)
{
    return response()->json([
        'success' => false,
        'message' => 'Fitur export belum diimplementasi',
    ], 501); // 501 Not Implemented
}
```

---

## Recommended Fixes

### Quick Wins (< 30 minutes)

1. **Add `.env` to `.gitignore`** + `git rm --cached .env`
2. **Set `APP_DEBUG=false`** in `.env`
3. **Set Sanctum token expiry** to `1440` (24 hours)
4. **Fix UserFactory** field names
5. **Add rate limiting** to `/api/absensi` route
6. **Add basic logging** to AbsensiController

### Medium Effort (1-3 hours)

1. **Fix race condition** in `storeFromDevice` (move logic inside transaction)
2. **Add checkout status validation**
3. **Paginate history endpoint**
4. **Extract to AbsensiService** class
5. **Create Form Request classes** for validation

### Long Term (1+ days)

1. **Write feature tests** for critical endpoints
2. **Implement role-based authorization**
3. **Add audit logging system**
4. **Create config file** for magic numbers
5. **Add API documentation** (OpenAPI/Swagger)

---

## Priority Roadmap

```
Week 1: SECURITY HARDENING
├── Fix .env leak (C1)
├── Rotate all credentials (C1, C2, C5)
├── Set APP_DEBUG=false (C4)
├── Set token expiry (C3)
└── Add rate limiting (C2)

Week 2: BUSINESS LOGIC FIX
├── Fix race condition (B1)
├── Add checkout validation (B2)
├── Paginate history (B4)
└── Add authorization checks (B5)

Week 3: ARCHITECTURE
├── Extract AbsensiService (A1)
├── Create Form Requests (A5)
├── Add config file (A3)
└── Fix route parameters (A4)

Week 4: TESTING & QUALITY
├── Write feature tests (Q1)
├── Add logging (Q4)
├── Fix model casts (Q2)
└── Fix stale data (Q3)
```

---

## Appendix: File-by-File Changes

### `.gitignore` — Tambahin:
```
.env
.env.backup
.env.production
```

### `.env` — Ubah:
```ini
APP_DEBUG=false
```

### `config/sanctum.php:53` — Ubah:
```php
'expiration' => 1440, // 24 hours
```

### `routes/api.php:14` — Ubah:
```php
Route::post('/absensi', [AbsensiController::class, 'storeFromDevice'])
    ->middleware(['api.key', 'throttle:60,1'])
    ->name('api.absensi.device');
```

### `app/Http/Middleware/ValidateApiKey.php` — Tambahin logging:
```php
use Illuminate\Support\Facades\Log;

// Di dalam method handle, sebelum return 401:
Log::warning('Invalid API key attempt', [
    'ip' => $request->ip(),
]);
```

### `app/Http/Controllers/Api/AbsensiController.php` — Fix race condition:
- Pindahkan semua logic ke dalam `DB::transaction()`
- Pakai `lockForUpdate()` untuk prevent race condition

### `database/factories/UserFactory.php` — Fix fields:
```php
'nama' => fake()->name(),
// Hapus 'email_verified_at' dan 'remember_token'
```

---

**End of Review**

*Last updated: 2026-07-22*
