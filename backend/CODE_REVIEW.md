# Code Review: Backend Absensi IoT (Laravel 13)

> Review Date: 2026-07-22 (Updated)
> Reviewer: opencode
> Target: Production readiness assessment
> Scope: Backend folder + Database schema

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Issue Status Tracker](#issue-status-tracker)
3. [Issue List](#issue-list)
   - [CRITICAL - Security & Infrastructure](#critical---security--infrastructure)
   - [HIGH - Security & Authorization](#high---security--authorization)
   - [MEDIUM - Database & Architecture](#medium---database--architecture)
   - [LOW - Code Quality](#low---code-quality)
4. [Recommended Fixes](#recommended-fixes)
5. [Priority Roadmap](#priority-roadmap)
6. [Appendix: File-by-File Changes](#appendix-file-by-file-changes)

---

## Executive Summary

| Kategori | Score | Status |
|---|---|---|
| Keamanan (Security) | 4/10 | CRITICAL - Wajib fix sebelum production |
| Database Schema | 5/10 | Missing tables, indexes, constraints |
| Architecture | 7/10 | Sudah ada Service Layer & Form Requests |
| Business Logic | 7/10 | Race condition udah di-fix |
| Code Quality | 6/10 | Clean tapi belum siap production |
| **Overall** | **6/10** | **MVP ready, tapi BUTUH FIX sebelum production** |

**Kesimpulan:** Code ini udah mengalami beberapa perbaikan dari review pertama (race condition fix, service layer, form requests). Tapi masih ada **critical issues** yang belum di-fix: missing database migrations (cache/jobs tables), credentials bocor di .env, dan security gaps lainnya.

---

## Issue Status Tracker

### Sudah di-FIX (11 issues)

| ID | Issue | Status | Bukti |
|---|---|---|---|
| C3 | Sanctum token unlimited | FIXED | `config/sanctum.php` → expiration = 1440 (24 jam) |
| C5 | Password seeder weak | FIXED | `DatabaseSeeder.php` → pakai `env('ADMIN_PASSWORD', 'Admin@123')` |
| C6 | UserFactory field mismatch | FIXED | `UserFactory.php` → field `nama` (bukan `name`) |
| B1 | Race condition absensi ESP32 | FIXED | `AbsensiService.php` → pakai `lockForUpdate()` + `DB::transaction()` |
| B2 | Checkout gak validate status | FIXED | `AbsensiService.php` → cek status Alpha/Izin sebelum checkout |
| B3 | Manual absensi race condition | FIXED | `AbsensiService.php` → pakai `lockForUpdate()` |
| B4 | History gak di-paginate | FIXED | `AbsensiController.php` → pakai `paginate()` |
| A1 | Gak ada Service Layer | FIXED | `app/Services/AbsensiService.php` udah ada |
| A3 | Magic numbers hardcoded | FIXED | `config/absensi.php` udah ada |
| A5 | Gak ada Form Requests | FIXED | 7 FormRequest classes udah ada |
| Q3 | Stale data return | FIXED | Pakai `->fresh()` |

### BELUM di-FIX (16 issues)

| ID | Issue | Severity | Priority |
|---|---|---|---|
| C1 | `.env` ke-commit | CRITICAL | 1 |
| C2 | API Key weak + gak ada rate limiting | CRITICAL | 2 |
| C4 | `APP_DEBUG=true` | CRITICAL | 3 |
| C7 | Missing migration `cache` table | CRITICAL | 4 |
| C8 | Missing migration `jobs` table | CRITICAL | 5 |
| H1 | Timing attack di API key validation | HIGH | 6 |
| H2 | No role-based authorization | HIGH | 7 |
| H3 | `sessions.user_id` gak ada FK | HIGH | 8 |
| M1 | `divisions.nama_divisi` tidak unique | MEDIUM | 9 |
| M2 | `employees` gak ada index `status` | MEDIUM | 10 |
| M3 | `employees.divisi_id` duplicate index | MEDIUM | 11 |
| M4 | `attendance` gak ada composite index | MEDIUM | 12 |
| M5 | CORS terlalu broad | MEDIUM | 13 |
| M6 | Session `secure` cookie gak di-set | MEDIUM | 14 |
| Q1 | Gak ada test | LOW | 15 |
| Q4 | Gak ada logging | LOW | 16 |

---

## Issue List

### CRITICAL - Security & Infrastructure

---

#### C1: `.env` file ke-commit ke repository

**File:** `.env` (entire file)
**Status:** BELUM FIX

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
```bash
# 1. Hapus dari git tracking (file tetap ada di lokal)
git rm --cached .env

# 2. Generate credentials baru
php artisan key:generate

# 3. Ganti API_KEY di .env dengan value baru yang random
# Contoh: API_KEY=apa_8k2jD9f2kJ3dF8j2_kD9f2kJ3
# (gunakan random string minimal 32 karakter)

# 4. Ganti DB_PASSWORD

# 5. Commit .gitignore dulu, jangan commit .env
```

---

#### C2: API Key terlalu simple & tidak ada rate limiting

**File:** `app/Http/Middleware/ValidateApiKey.php:16`, `routes/api.php:14`
**Status:** BELUM FIX

**Problem:**
- API key `absensi_iot_rfid_2026` terlalu predictable dan gak ada rotasi mechanism
- Perbandingan pake `!==` tapi gak ada logging atau blocking kalau key salah berulang kali
- Endpoint `POST /api/absensi` gak ada rate limiting — bisa di-brute force

**Impact:** Attacker bisa brute force API key atau spam absensi data.

**Fix:**
```php
// routes/api.php - tambahin rate limiting
Route::post('/absensi', [AbsensiController::class, 'storeFromDevice'])
    ->middleware(['api.key', 'throttle:60,1']) // 60 requests per menit per IP
    ->name('api.absensi.device');
```

---

#### C4: `APP_DEBUG=true` di environment

**File:** `.env:4`
**Status:** BELUM FIX

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

#### C7: Missing migration `cache` table

**File:** TIDAK ADA (migration belum dibuat)
**Status:** BELUM FIX

**Problem:**
- `.env` set `CACHE_STORE=database`
- `config/cache.php` line 18: default table = `cache`
- **TAPI tidak ada migration untuk tabel `cache` dan `cache_locks`**
- Laravel butuh kedua tabel ini untuk cache driver database

**Impact:** App bakal error waktu cache pertama kali dipake. Query ke tabel `cache` yang gak ada = SQL error.

**Fix:**
```bash
# Generate migration otomatis
php artisan cache:table
php artisan make:migration create_cache_locks_table

# Terus jalankan
php artisan migrate
```

Isi migration yang harusnya ada:
```php
Schema::create('cache', function (Blueprint $table) {
    $table->string('key')->primary();
    $table->mediumText('value');
    $table->integer('expiration');
});

Schema::create('cache_locks', function (Blueprint $table) {
    $table->string('key')->primary();
    $table->string('owner');
    $table->integer('expiration');
});
```

---

#### C8: Missing migration `jobs` + `failed_jobs` table

**File:** TIDAK ADA (migration belum dibuat)
**Status:** BELUM FIX

**Problem:**
- `.env` set `QUEUE_CONNECTION=database`
- `config/queue.php` line 41: table = `jobs`
- **TAPI tidak ada migration untuk tabel `jobs`, `failed_jobs`, `job_batches`**
- Laravel butuh tabel-tabel ini untuk queue driver database

**Impact:** Queue system gak bisa jalan. Kalau ada job dispatch, bakal error.

**Fix:**
```bash
# Generate migration otomatis
php artisan queue:table
php artisan queue:failed-table
php artisan queue:batches-table

# Terus jalankan
php artisan migrate
```

---

### HIGH - Security & Authorization

---

#### H1: Timing attack vulnerable di API key validation

**File:** `app/Http/Middleware/ValidateApiKey.php:16`
**Status:** BELUM FIX

**Problem:**
```php
if (!$apiKey || $apiKey !== $validKey) {
```
Perbandingan `!==` punya execution time yang bervariasi tergantung berapa karakter yang match. Attacker bisaukur waktu response buat guess key satu per satu (timing attack).

**Impact:** Attacker bisa brute force API key lebih efisien.

**Fix:**
```php
if (!$apiKey || !hash_equals($validKey, $apiKey)) {
```
`hash_equals()` punya execution time constant, gak bisa di-timing attack.

---

#### H2: No role-based authorization

**File:** `routes/api.php` (semua protected routes)
**Status:** BELUM FIX

**Problem:**
Semua user dengan Sanctum token bisa akses semua endpoint. Gak ada pembatasan berdasarkan role (admin vs superadmin).

- Admin biasa bisa delete karyawan
- Admin biasa bisa update absensi orang lain
- Admin biasa bisa hapus data

**Impact:** Privilege escalation, data integrity issue.

**Fix:**
Bikin middleware `CheckRole`:
```php
// app/Http/Middleware/CheckRole.php
class CheckRole
{
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (!in_array($request->user()->role, $roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Insufficient role',
            ], 403);
        }
        return $next($request);
    }
}

// Register di bootstrap/app.php
$middleware->alias([
    'role' => \App\Http\Middleware\CheckRole::class,
]);

// Pakai di routes
Route::delete('/karyawan/{id}', [KaryawanController::class, 'destroy'])
    ->middleware('role:superadmin');
```

---

#### H3: `sessions.user_id` gak ada FK constraint

**File:** `database/migrations/2026_07_17_000006_create_sessions_and_password_resets_table.php:19`
**Status:** BELUM FIX

**Problem:**
```php
$table->foreignId('user_id')->nullable()->index();
```
Ada index tapi **tidak ada `->constrained()`**. Harusnya:
```php
$table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
```

**Impact:** Orphaned session data kalau user dihapus. Gak ada referential integrity.

**Fix:** Bikin migration baru:
```php
Schema::table('sessions', function (Blueprint $table) {
    $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
});
```

---

### MEDIUM - Database & Architecture

---

#### M1: `divisions.nama_divisi` tidak unique di database

**File:** `database/migrations/2026_07_17_000002_create_divisions_table.php:13`
**Status:** BELUM FIX

**Problem:**
Di form request ada `unique:divisions,nama_divisi` tapi di migration **tidak ada unique constraint**. Kalau 2 request create divisi bersamaan, bisa kecreate duplikat.

**Impact:** Data duplikat, race condition.

**Fix:** Bikin migration baru:
```php
Schema::table('divisions', function (Blueprint $table) {
    $table->unique('nama_divisi');
});
```

---

#### M2: `employees` gak ada index di `status`

**File:** `database/migrations/2026_07_17_000003_create_employees_table.php`
**Status:** BELUM FIX

**Problem:**
Banyak query filter by `status` (aktif/nonaktif) tapi gak ada index. Query bakal full table scan.

**Impact:** Query lambat kalau data karyawan banyak.

**Fix:**
```php
Schema::table('employees', function (Blueprint $table) {
    $table->index('status');
});
```

---

#### M3: `employees.divisi_id` duplicate index

**File:** `database/migrations/2026_07_17_000003_create_employees_table.php:16,21`
**Status:** BELUM FIX

**Problem:**
```php
// Line 16: sudah auto-bikin index via constrained()
$table->foreignId('divisi_id')->nullable()->constrained('divisions')->onDelete('set null');

// Line 21: duplicate index!
$table->index('divisi_id');
```

**Impact:** Redundant storage, write performance sedikit lebih lambat.

**Fix:** Hapus line 21 di migration, atau bikin migration baru:
```php
Schema::table('employees', function (Blueprint $table) {
    $table->dropIndex('employees_divisi_id_index');
});
```

---

#### M4: `attendance` gak ada composite index untuk laporan

**File:** `database/migrations/2026_07_17_000005_create_attendance_table.php`
**Status:** BELUM FIX

**Problem:**
Laporan query filter `whereBetween('tanggal')` + `orderBy('employee_id')` butuh composite index. Index terpisah di `tanggal` dan `employee_id` kurang optimal.

**Impact:** Laporan query lambat kalau data absensi banyak.

**Fix:**
```php
Schema::table('attendance', function (Blueprint $table) {
    $table->index(['tanggal', 'employee_id']);
});
```

---

#### M5: CORS terlalu broad

**File:** `config/cors.php:17,25`
**Status:** BELUM FIX

**Problem:**
```php
'allowed_methods' => ['*'],    // Line 17
'allowed_headers' => ['*'],    // Line 25
```
Terlalu broad. Bisa terima HTTP methods dan headers yang gak perlu.

**Impact:** Security risk — attacker bisa kirim request dengan method/header berbahaya.

**Fix:**
```php
'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
'allowed_headers' => ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
```

---

#### M6: Session `secure` cookie tidak di-set

**File:** `config/session.php:172`
**Status:** BELUM FIX

**Problem:**
```php
'secure' => env('SESSION_SECURE_COOKIE'),
```
Default `null` — cookie bisa dikirim via HTTP (gak aman).

**Impact:** Session hijacking via HTTP request.

**Fix:**
```php
'secure' => env('SESSION_SECURE_COOKIE', true),
```
Set `SESSION_SECURE_COOKIE=true` di `.env` production.

---

### LOW - Code Quality

---

#### Q1: Gak ada test sama sekali

**File:** `tests/` directory
**Status:** BELUM FIX

**Problem:**
`phpunit.xml` ada, tapi `tests/Feature/` cuma ada `ExampleTest` default. Zero test coverage untuk fitur absensi, auth, CRUD.

**Impact:** Regresi bugs gak ke-deteksi, refactor jadi scary.

**Fix:** Minimal buat feature test:
```php
// tests/Feature/AbsensiDeviceTest.php
class AbsensiDeviceTest extends TestCase
{
    use RefreshDatabase;

    public function test_device_can_post_attendance(): void
    {
        $employee = Employee::factory()->create(['rfid_uid' => 'TEST123']);

        $response = $this->postJson('/api/absensi', ['uid' => 'TEST123'], [
            'X-API-Key' => config('services.api_key'),
        ]);

        $response->assertOk()
            ->assertJson(['success' => true]);
    }

    public function test_invalid_api_key_returns_401(): void
    {
        $response = $this->postJson('/api/absensi', ['uid' => 'TEST123'], [
            'X-API-Key' => 'wrong-key',
        ]);

        $response->assertStatus(401);
    }
}
```

---

#### Q4: Gak ada logging di critical paths

**File:** Multiple controllers
**Status:** BELUM FIX

**Problem:**
Gak ada `Log::info()` atau `Log::warning()` di:
- Absensi device (tap card)
- Login attempts
- Failed API key validation
- CRUD operations

**Impact:** No audit trail, hard to debug production issues.

**Fix:**
```php
// Di AbsensiController / AbsensiService
Log::info('RFID absensi processed', [
    'employee_id' => $karyawan->id,
    'rfid_uid' => $validated['uid'],
    'status' => $status,
    'ip' => $request->ip(),
]);

// Di ValidateApiKey middleware
Log::warning('Invalid API key attempt', [
    'ip' => $request->ip(),
    'key_prefix' => substr($apiKey ?? '', 0, 8) . '...',
]);
```

---

## Recommended Fixes

### Quick Wins (< 30 minutes total)

| # | Action | Command/Change |
|---|---|---|
| 1 | Generate cache + jobs migrations | `php artisan cache:table && php artisan queue:table && php artisan queue:failed-table && php artisan queue:batches-table && php artisan migrate` |
| 2 | Hapus .env dari tracking | `git rm --cached .env` |
| 3 | Set APP_DEBUG=false | Edit `.env` |
| 4 | Fix timing attack | Ganti `!==` ke `hash_equals()` di `ValidateApiKey.php` |
| 5 | Tambahin rate limiting | Tambah `throttle:60,1` di `routes/api.php` |

### Medium Effort (1-2 hours total)

| # | Action | Detail |
|---|---|---|
| 6 | Bikin migration indexes | Composite index attendance, unique divisi, index employees status |
| 7 | Fix CORS config | Restrict methods & headers |
| 8 | Set session secure cookie | Edit config + .env |
| 9 | Add basic logging | Log::info/warning di critical paths |

### Long Term (1+ days)

| # | Action | Detail |
|---|---|---|
| 10 | Bikin role middleware | CheckRole middleware + register |
| 11 | Fix sessions FK constraint | Migration tambah foreign key |
| 12 | Write feature tests | Minimal absensi device + auth tests |
| 13 | Hapus duplicate index | Drop redundant divisi_id index |

---

## Priority Roadmap

```
╔══════════════════════════════════════════════════════════════╗
║  HARI INI (30 menit) - CRITICAL FIXES                       ║
╠══════════════════════════════════════════════════════════════╣
║  [C7/C8] Generate cache + jobs migrations + migrate         ║
║  [C1]    git rm --cached .env                               ║
║  [C4]    APP_DEBUG=false di .env                            ║
║  [H1]    hash_equals() di ValidateApiKey                    ║
║  [C2]    Tambah throttle di routes/api.php                  ║
╠══════════════════════════════════════════════════════════════╣
║  MINGGU INI (2 jam) - HIGH + MEDIUM FIXES                   ║
╠══════════════════════════════════════════════════════════════╣
║  [M1-M4] Database indexes migration                         ║
║  [M5]    CORS restrict                                      ║
║  [M6]    Session secure cookie                              ║
║  [Q4]    Tambah logging                                     ║
╠══════════════════════════════════════════════════════════════╣
║  BULAN INI (1-2 hari) - LONG TERM                           ║
╠══════════════════════════════════════════════════════════════╣
║  [H2]    Bikin role middleware                               ║
║  [H3]    Fix sessions FK constraint                         ║
║  [M3]    Hapus duplicate index                              ║
║  [Q1]    Write feature tests                                ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Appendix: File-by-File Changes

### Quick Fix Commands

```bash
# 1. Generate missing migrations
php artisan cache:table
php artisan queue:table
php artisan queue:failed-table
php artisan queue:batches-table
php artisan migrate

# 2. Hapus .env dari git
git rm --cached .env

# 3. Generate new APP_KEY
php artisan key:generate
```

### `.env` Changes

```ini
# TAMBAHIN ini:
APP_DEBUG=false
SESSION_SECURE_COOKIE=true

# GANTI ini (generate random string 32+ karakter):
API_KEY=<random-string-baru>

# GANTI ini:
DB_PASSWORD=<password-baru>
```

### `app/Http/Middleware/ValidateApiKey.php`

```php
// GANTI line 16:
// SEKARANG:
if (!$apiKey || $apiKey !== $validKey) {

// HARUSNYA:
if (!$apiKey || !hash_equals($validKey, $apiKey)) {
```

### `routes/api.php`

```php
// TAMBAHIN throttle di line 14-16:
Route::post('/absensi', [AbsensiController::class, 'storeFromDevice'])
    ->middleware(['api.key', 'throttle:60,1'])
    ->name('api.absensi.device');
```

### `config/cors.php`

```php
// GANTI line 17:
'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

// GANTI line 25:
'allowed_headers' => ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With'],
```

### `config/session.php`

```php
// GANTI line 172:
'secure' => env('SESSION_SECURE_COOKIE', true),
```

### Database Migration Baru (indexes)

```php
// database/migrations/2026_07_22_add_indexes.php
return new class extends Migration
{
    public function up(): void
    {
        // Unique constraint di divisions
        Schema::table('divisions', function (Blueprint $table) {
            $table->unique('nama_divisi');
        });

        // Index di employees.status
        Schema::table('employees', function (Blueprint $table) {
            $table->index('status');
        });

        // Hapus duplicate index
        Schema::table('employees', function (Blueprint $table) {
            $table->dropIndex('employees_divisi_id_index');
        });

        // Composite index di attendance
        Schema::table('attendance', function (Blueprint $table) {
            $table->index(['tanggal', 'employee_id']);
        });

        // FK constraint di sessions
        Schema::table('sessions', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('sessions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('attendance', function (Blueprint $table) {
            $table->dropIndex(['tanggal', 'employee_id']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->index('divisi_id');
            $table->dropIndex('employees_status_index');
        });

        Schema::table('divisions', function (Blueprint $table) {
            $table->dropIndex('divisions_nama_divisi_unique');
        });
    }
};
```

---

**End of Review**

*Last updated: 2026-07-22*
*Total issues: 27 (11 fixed, 16 remaining)*
