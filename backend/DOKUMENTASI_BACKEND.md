# Sistem Absensi Karyawan Berbasis IoT RFID

## Backend REST API Documentation

---

| | |
|---|---|
| **Proyek** | Sistem Absensi Karyawan Berbasis IoT RFID |
| **Arsitektur** | ESP32 (Device) → Laravel API (Backend) → MySQL (Database) |
| **Tech Stack** | Laravel 13, MySQL 8, Laravel Sanctum |
| **PHP Version** | 8.3+ |
| **Author** | Fathir |
| **Tanggal** | Juli 2026 |

---

## Daftar Isi

1. [Gambaran Umum Sistem](#1-gambaran-umum-sistem)
2. [Arsitektur & Tech Stack](#2-arsitektur--tech-stack)
3. [Database Schema](#3-database-schema)
4. [API Endpoints Summary](#4-api-endpoints-summary)
5. [Autentikasi & Keamanan](#5-autentikasi--keamanan)
6. [Fitur Utama](#6-fitur-utama)
7. [Testing & Kualitas Kode](#7-testing--kualitas-kode)
8. [Deployment & Setup](#8-deployment--setup)
9. [Struktur Folder](#9-struktur-folder)
10. [Kesimpulan & Hasil](#10-kesimpulan--hasil)

---

## 1. Gambaran Umum Sistem

Sistem ini merupakan aplikasi absensi karyawan otomatis yang menggunakan teknologi **RFID (Radio-Frequency Identification)**. Setiap karyawan memiliki kartu RFID yang unik, dan saat kartu didekatkan ke pembaca RFID di perangkat ESP32, data kehadiran akan tercatat secara otomatis ke dalam database.

### Komponen Utama

| Komponen | Teknologi | Fungsi |
|---|---|---|
| **Hardware** | ESP32 + RFID Reader | Membaca kartu RFID karyawan dan mengirim data ke API |
| **Backend** | Laravel 13 (REST API) | Memproses data absensi, autentikasi, manajemen data |
| **Frontend** | React.js | Admin panel untuk mengelola data dan melihat laporan |
| **Database** | MySQL 8 | Menyimpan seluruh data sistem |

### Alur Kerja Sistem

```
┌─────────────┐     HTTP POST      ┌──────────────┐     SQL Query     ┌─────────────┐
│   ESP32     │ ──────────────────► │   Laravel    │ ────────────────► │   MySQL     │
│  (Device)   │  {uid: "RFID001"}  │   (API)      │                   │ (Database)  │
└─────────────┘                     └──────────────┘                   └─────────────┘
                                          ▲
                                          │ HTTP Request
                                    ┌─────┴──────┐
                                    │  React.js  │
                                    │(Admin Panel)│
                                    └────────────┘
```

### Arsitektur 3-Tier

```
┌──────────────────────────────────────────────────────────┐
│                    Presentation Layer                     │
│            React.js Admin Panel + ESP32 Device           │
├──────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│          Laravel 13 REST API (Business Logic)            │
│          ┌──────────────┐  ┌────────────────┐           │
│          │ Controllers  │  │    Services    │           │
│          │  (8 files)   │  │ (2 services)   │           │
│          └──────────────┘  └────────────────┘           │
├──────────────────────────────────────────────────────────┤
│                      Data Layer                          │
│              MySQL 8 Database (15 tables)                │
│              Eloquent ORM + Migrations                   │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Arsitektur & Tech Stack

### Backend Stack

| Komponen | Versi | Keterangan |
|---|---|---|
| **Laravel** | 13.20 | Framework PHP untuk REST API |
| **PHP** | 8.3+ | Bahasa pemrograman backend |
| **MySQL** | 8 | Database relational |
| **Laravel Sanctum** | 4.3 | Autentikasi token untuk SPA & API |
| **PHPUnit** | 12.5 | Framework testing |

### Key Design Decisions

| Keputusan | Alasan |
|---|---|
| **Zero external packages** | Hanya menggunakan Laravel + Sanctum, tanpa dependency tambahan |
| **Service Layer pattern** | `AbsensiService` dan `AuditLogService` memisahkan business logic dari controller |
| **Form Request classes** | 7 class untuk validasi input yang terisolasi dan reusable |
| **Configurable constants** | Semua konfigurasi absensi ada di `config/absensi.php` |
| **Dual authentication** | Sanctum Token untuk admin panel, API Key untuk ESP32 device |

### Middleware Stack

| Middleware | Alias | Fungsi |
|---|---|---|
| `ValidateApiKey` | `api.key` | Validasi API Key untuk ESP32 |
| `Authenticate` | `auth` | Autentikasi Sanctum Bearer Token |
| `CheckRole` | `role` | Authorization berdasarkan role user |
| Throttle | `throttle:login` | Rate limiting login (5/menit) |
| Throttle | `throttle:change-password` | Rate limiting ganti password (3/menit) |
| Throttle | `throttle:60,1` | Rate limiting umum (60/menit) |

---

## 3. Database Schema

### Total Tabel: 15

| No | Nama Tabel | Fungsi | Tipe |
|---|---|---|---|
| 1 | `users` | Data admin/superadmin | Core |
| 2 | `divisions` | Data divisi karyawan | Core |
| 3 | `employees` | Data karyawan + RFID UID | Core |
| 4 | `schedules` | Jadwal kerja standar | Core |
| 5 | `attendance` | Data absensi harian | Core |
| 6 | `sessions` | Session management | Laravel |
| 7 | `password_reset_tokens` | Reset password token | Laravel |
| 8 | `personal_access_tokens` | Sanctum API tokens | Laravel |
| 9 | `audit_logs` | Log aktivitas user | Custom |
| 10 | `cache` | Application cache | Laravel |
| 11 | `cache_locks` | Cache lock mechanism | Laravel |
| 12 | `jobs` | Queue jobs | Laravel |
| 13 | `job_batches` | Batch job processing | Laravel |
| 14 | `failed_jobs` | Failed queue jobs | Laravel |
| 15 | `migrations` | Migration tracking | Laravel |

### Core Tables Detail

#### Tabel `users`

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('admin', 'superadmin') DEFAULT 'admin',
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### Tabel `divisions`

```sql
CREATE TABLE divisions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama_divisi VARCHAR(100),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### Tabel `employees`

```sql
CREATE TABLE employees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(100),
    nip VARCHAR(50) UNIQUE,
    jabatan VARCHAR(100) NULL,
    divisi_id BIGINT UNSIGNED NULL,
    rfid_uid VARCHAR(50) UNIQUE,
    status ENUM('aktif', 'nonaktif') DEFAULT 'aktif',
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (divisi_id) REFERENCES divisions(id) ON DELETE SET NULL
);
```

#### Tabel `schedules`

```sql
CREATE TABLE schedules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    jam_masuk_standar TIME DEFAULT '08:00:00',
    jam_pulang_standar TIME DEFAULT '17:00:00',
    toleransi_menit INT DEFAULT 15,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### Tabel `attendance`

```sql
CREATE TABLE attendance (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id BIGINT UNSIGNED,
    tanggal DATE,
    jam_masuk TIME NULL,
    jam_pulang TIME NULL,
    status ENUM('Hadir', 'Terlambat', 'Alpha', 'Izin') DEFAULT 'Hadir',
    keterangan VARCHAR(255) NULL,
    input_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE KEY unique_employee_date (employee_id, tanggal),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (input_by) REFERENCES users(id) ON DELETE SET NULL
);
```

#### Tabel `audit_logs`

```sql
CREATE TABLE audit_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    action VARCHAR(255),
    model_type VARCHAR(255) NULL,
    model_id BIGINT UNSIGNED NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### Entity Relationship Diagram (ERD)

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │  divisions   │       │  schedules   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)      │       │ id (PK)      │
│ nama         │       │ nama_divisi  │       │ jam_masuk    │
│ email (UQ)   │       │ created_at   │       │ jam_pulang   │
│ password     │       │ updated_at   │       │ toleransi    │
│ role         │       └──────┬───────┘       │ created_at   │
│ created_at   │              │               │ updated_at   │
│ updated_at   │              │               └──────────────┘
└──────┬───────┘              │
       │                      │ 1:N
       │                      ▼
       │               ┌──────────────┐       ┌──────────────┐
       │               │  employees   │       │  audit_logs  │
       │               ├──────────────┤       ├──────────────┤
       │ 1:N           │ id (PK)      │       │ id (PK)      │
       │               │ nama         │       │ user_id (FK) │◄───┐
       │               │ nip (UQ)     │       │ action       │    │
       │               │ jabatan      │       │ model_type   │    │
       │               │ divisi_id(FK)│       │ model_id     │    │
       │               │ rfid_uid(UQ) │       │ old_values   │    │
       │               │ status       │       │ new_values   │    │
       │               │ created_at   │       │ ip_address   │    │
       │               │ updated_at   │       │ user_agent   │    │
       │               └──────┬───────┘       └──────────────┘    │
       │                      │ 1:N                               │
       │                      ▼                                   │
       │               ┌──────────────┐                           │
       └──────────────►│  attendance  │                           │
          input_by(FK) ├──────────────┤                           │
                       │ id (PK)      │                           │
                       │ employee_id  │                           │
                       │ tanggal      │                           │
                       │ jam_masuk    │                           │
                       │ jam_pulang   │                           │
                       │ status       │                           │
                       │ keterangan   │                           │
                       │ input_by(FK) │───────────────────────────┘
                       │ created_at   │
                       │ updated_at   │
                       └──────────────┘
```

### Relasi Antar Tabel

| Relasi | Tipe | Keterangan |
|---|---|---|
| `User` → `AuditLog` | 1:N | Satu user bisa punya banyak log aktivitas |
| `Division` → `Employee` | 1:N | Satu divisi punya banyak karyawan |
| `Employee` → `Attendance` | 1:N | Satu karyawan punya banyak data absensi |
| `User` → `Attendance` | 1:N | Satu user (admin) input banyak absensi manual |
| `Employee` → `Division` | N:1 | Karyawan tergabung dalam satu divisi |
| `Attendance` → `Employee` | N:1 | Data absensi milik satu karyawan |
| `Attendance` → `User` | N:1 | Absensi manual diinput oleh satu user |

---

## 4. API Endpoints Summary

### Total: 25 Endpoints

| Kategori | Jumlah | Metode |
|---|---|---|
| Autentikasi | 4 | POST, GET |
| Dashboard | 1 | GET |
| Karyawan | 6 | GET, POST, PUT, DELETE |
| Divisi | 5 | GET, POST, PUT, DELETE |
| Jadwal | 2 | GET, PUT |
| Absensi Manual | 3 | POST, PUT, DELETE |
| Device ESP32 | 1 | POST |
| Laporan | 2 | GET |
| Global Search | 1 | GET |
| **Total** | **25** | |

### Detail Endpoints

#### Public Endpoints (Tanpa Autentikasi)

| Metode | Endpoint | Middleware | Deskripsi |
|---|---|---|---|
| `POST` | `/api/login` | `throttle:login` | Login admin, return Sanctum token |
| `POST` | `/api/absensi` | `api.key`, `throttle:60,1` | Absensi via ESP32 (kirim RFID UID) |

#### Protected Endpoints (Sanctum Auth)

**Autentikasi**

| Metode | Endpoint | Middleware | Deskripsi |
|---|---|---|---|
| `GET` | `/api/user` | `auth:sanctum` | Ambil data user yang login |
| `POST` | `/api/logout` | `auth:sanctum` | Logout, hapus token |
| `POST` | `/api/change-password` | `auth:sanctum`, `throttle:change-password` | Ganti password |

**Dashboard**

| Metode | Endpoint | Middleware | Deskripsi |
|---|---|---|---|
| `GET` | `/api/dashboard` | `auth:sanctum` | Statistik dashboard hari ini |

**Karyawan (CRUD + Riwayat)**

| Metode | Endpoint | Middleware | Deskripsi |
|---|---|---|---|
| `GET` | `/api/karyawan` | `auth:sanctum` | List karyawan (search, filter, pagination) |
| `POST` | `/api/karyawan` | `auth:sanctum` | Tambah karyawan baru |
| `GET` | `/api/karyawan/{id}` | `auth:sanctum` | Detail karyawan |
| `PUT` | `/api/karyawan/{id}` | `auth:sanctum` | Update data karyawan |
| `DELETE` | `/api/karyawan/{id}` | `auth:sanctum`, `role:superadmin` | Hapus karyawan |
| `GET` | `/api/karyawan/{id}/absensi` | `auth:sanctum` | Riwayat absensi per karyawan |

**Divisi (CRUD)**

| Metode | Endpoint | Middleware | Deskripsi |
|---|---|---|---|
| `GET` | `/api/divisi` | `auth:sanctum` | List semua divisi + jumlah karyawan |
| `POST` | `/api/divisi` | `auth:sanctum` | Tambah divisi baru |
| `GET` | `/api/divisi/{id}` | `auth:sanctum` | Detail divisi + daftar karyawan |
| `PUT` | `/api/divisi/{id}` | `auth:sanctum` | Update nama divisi |
| `DELETE` | `/api/divisi/{id}` | `auth:sanctum`, `role:superadmin` | Hapus divisi |

**Jadwal Kerja**

| Metode | Endpoint | Middleware | Deskripsi |
|---|---|---|---|
| `GET` | `/api/jadwal` | `auth:sanctum` | Lihat jadwal kerja standar |
| `PUT` | `/api/jadwal` | `auth:sanctum` | Update jam masuk/pulang/toleransi |

**Absensi Manual (Admin)**

| Metode | Endpoint | Middleware | Deskripsi |
|---|---|---|---|
| `POST` | `/api/absensi/manual` | `auth:sanctum` | Input absensi manual |
| `PUT` | `/api/absensi/{id}` | `auth:sanctum`, `role:admin,superadmin` | Update data absensi |
| `DELETE` | `/api/absensi/{id}` | `auth:sanctum`, `role:superadmin` | Hapus data absensi |

**Laporan**

| Metode | Endpoint | Middleware | Deskripsi |
|---|---|---|---|
| `GET` | `/api/laporan` | `auth:sanctum` | Laporan absensi (filter tanggal/divisi/status) |
| `GET` | `/api/laporan/export` | `auth:sanctum` | Export laporan ke CSV |

**Global Search**

| Metode | Endpoint | Middleware | Deskripsi |
|---|---|---|---|
| `GET` | `/api/search` | `auth:sanctum` | Pencarian silang karyawan + divisi |

---

## 5. Autentikasi & Keamanan

### 5.1 Dual Auth System

Sistem menggunakan **dua mekanisme autentikasi** yang berbeda tergantung client:

#### Sanctum Bearer Token (Admin Panel)

```
┌─────────────┐    POST /api/login     ┌──────────────┐
│  React.js   │ ─────────────────────► │   Laravel    │
│  (Browser)  │  {email, password}     │    (API)     │
│             │ ◄───────────────────── │              │
│             │  {token, user}         │              │
└─────────────┘                        └──────────────┘

Request berikutnya:
Authorization: Bearer {sanctum_token}
```

- **Endpoint login:** `POST /api/login`
- **Response:** `{ token: "1|abc...", user: {...} }`
- **Penggunaan:** `Authorization: Bearer {token}`
- **Expiration:** 24 jam (1440 menit) via `SANCTUM_TOKEN_EXPIRATION_MINUTES`

#### API Key (ESP32 Device)

```
┌─────────────┐   POST /api/absensi    ┌──────────────┐
│    ESP32    │ ─────────────────────► │   Laravel    │
│   (Device)  │  {uid: "RFID001"}      │    (API)     │
│             │  X-API-Key: xxx        │              │
│             │ ◄───────────────────── │              │
│             │  {success, data}       │              │
└─────────────┘                        └──────────────┘
```

- **Header:** `X-API-Key: {api_key}`
- **Config:** `config/services.php` → `api_keys` array
- **Multi-key support:** Bisa ada beberapa key aktif sekaligus
- **Rotation:** `php artisan api:generate-key --rotate`

### 5.2 Role-Based Access Control (RBAC)

| Role | Keterangan | Permissions |
|---|---|---|
| `admin` | Admin biasa | CRUD karyawan, divisi, jadwal, absensi manual |
| `superadmin` | Super admin | Semua akses admin + **hapus data** |

**Implementasi via middleware `role`:**

```php
// Hanya superadmin yang bisa hapus
Route::delete('/karyawan/{karyawan}', [...])
    ->middleware('role:superadmin');

// Admin dan superadmin bisa update absensi
Route::put('/absensi/{attendance}', [...])
    ->middleware('role:admin,superadmin');
```

### 5.3 Security Features

| Fitur | Implementasi | Keterangan |
|---|---|---|
| **Rate Limiting** | `throttle:login` (5/menit) | Brute force protection login |
| **Rate Limiting** | `throttle:change-password` (3/menit) | Proteksi ganti password |
| **Rate Limiting** | `throttle:60,1` (60/menit) | Proteksi endpoint ESP32 |
| **Timing Attack Prevention** | `hash_equals()` | Perbandingan API key aman dari timing attack |
| **CORS Restriction** | Explicit `allowed_methods` + `allowed_headers` | Hanya domain tertentu yang boleh akses |
| **Session Security** | `secure` cookie | Cookie hanya dikirim via HTTPS |
| **API Key Rotation** | `php artisan api:generate-key --rotate` | Multi-key support, key lama masih aktif |
| **SQL Injection Prevention** | Parameterized queries (Eloquent) | Semua query menggunakan binding |
| **XSS Prevention** | Input sanitization | Validasi + escaping input |
| **CSV Injection Prevention** | `addcslashes()` + `sanitizeCsvCell()` | Prefix `\t` untuk cell yang dimulai `=`, `+`, `-`, `@` |
| **Audit Logging** | `AuditLogService` | Log semua aktivitas CRUD |
| **Hard Delete Protection** | `exists()` check sebelum delete | Karyawan dengan absensi tidak bisa dihapus |
| **Unique Constraints** | Database level | NIP, RFID UID, email harus unik |
| **Hashed Passwords** | `bcrypt` via Laravel | Password di-hash otomatis |

### 5.4 Audit Logging

Sistem mencatat **11 jenis aktivitas** dalam `audit_logs`:

| Action | Keterangan |
|---|---|
| `login` | Login berhasil |
| `login_failed` | Login gagal (wrong password) |
| `change_password` | Ganti password |
| `create_karyawan` | Tambah karyawan baru |
| `update_karyawan` | Update data karyawan |
| `delete_karyawan` | Hapus karyawan |
| `create_divisi` | Tambah divisi baru |
| `update_divisi` | Update data divisi |
| `delete_divisi` | Hapus divisi |
| `create_absensi_manual` | Input absensi manual |
| `update_absensi` | Update data absensi |
| `delete_absensi` | Hapus data absensi |
| `update_jadwal` | Update jadwal kerja |

**Setiap log menyimpan:**
- `user_id` - Siapa yang melakukan
- `action` - Jenis aktivitas
- `model_type` + `model_id` - Record mana yang terpengaruh
- `old_values` - Data sebelum diubah
- `new_values` - Data setelah diubah
- `ip_address` - IP address client
- `user_agent` - Browser/device info

### 5.5 Exception Handling

Laravel dikonfigurasi untuk return **format JSON yang konsisten** untuk semua error:

| Exception | HTTP Code | Format Response |
|---|---|---|
| `ModelNotFoundException` | 404 | `{success: false, message: "Data Employee tidak ditemukan"}` |
| `ValidationException` | 422 | `{success: false, message: "Validasi gagal", errors: {...}}` |
| `AuthenticationException` | 401 | `{success: false, message: "Unauthenticated"}` |
| `ApiException` | Custom | `{success: false, message: "...", data: {...}}` |
| Generic `Throwable` | 500 | `{success: false, message: "Terjadi kesalahan server"}` |

---

## 6. Fitur Utama

### 6.1 Absensi IoT (Check-in / Check-out)

Fitur inti sistem yang memproses absensi dari perangkat ESP32.

**Alur Logika:**

```
ESP32 Kirim RFID UID
        │
        ▼
┌─────────────────┐
│ Cari Karyawan   │ ◄── Employee::where('rfid_uid', $uid)
│ by RFID UID     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     TIDAK    ┌──────────────────┐
│ Karyawan Aktif? │ ────────────►│ Return Error 403  │
└────────┬────────┘              │ "Tidak aktif"     │
         │ YA                    └──────────────────┘
         ▼
┌─────────────────┐
│ Sudah Absen     │ ◄── Attendance::where('employee_id', $id)
│ Hari Ini?       │       ->where('tanggal', today)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
  BELUM    SUDAH
    │         │
    ▼         ▼
┌────────┐ ┌────────────┐
│CHECK-IN│ │ CHECK-OUT  │
└────────┘ └────────────┘
```

**Check-in Logic:**

```php
// Hitung status berdasarkan toleransi
$jamMasukCarbon = Carbon::parse($jamMasuk);
$jamStandarCarbon = Carbon::parse($jamStandar); // default 08:00
$batasTerlambat = $jamStandarCarbon->copy()->addMinutes($toleransi); // +15 menit

if ($jamMasukCarbon->gt($batasTerlambat)) {
    $status = 'Terlambat';
} else {
    $status = 'Hadir';
}
```

**Status Absensi:**

| Status | Keterangan | Kondisi |
|---|---|---|
| `Hadir` | Tepat waktu | Jam masuk ≤ jam standar + toleransi |
| `Terlambat` | Terlambat | Jam masuk > jam standar + toleransi |
| `Alpha` | Tidak hadir | Tidak tap kartu sama sekali |
| `Izin` | Izin tidak hadir | Diinput manual oleh admin |

**Database Transaction + Lock:**

```php
// Menggunakan DB::transaction() + lockForUpdate()
// untuk mencegah race condition saat 2 tap bersamaan
return DB::transaction(function () use ($rfidUid) {
    $karyawan = Employee::where('rfid_uid', $rfidUid)
        ->lockForUpdate()
        ->first();
    // ...
});
```

### 6.2 Manajemen Karyawan

**CRUD Operations dengan:**
- **Search:** Cari berdasarkan nama, NIP, atau RFID UID
- **Filter:** Berdasarkan divisi_id dan status (aktif/nonaktif)
- **Pagination:** Default 15 per page, max 100
- **RFID UID Mapping:** Setiap karyawan punya RFID UID unik
- **Soft Status:** Status aktif/nonaktif (bukan hard delete)

**Validasi Input (StoreKaryawanRequest):**

| Field | Rule | Keterangan |
|---|---|---|
| `nama` | required, string, max:100 | Nama lengkap |
| `nip` | required, string, max:50, unique | Nomor induk pegawai |
| `jabatan` | nullable, string, max:100 | Jabatan |
| `divisi_id` | nullable, exists:divisions,id | ID divisi |
| `rfid_uid` | required, string, max:50, unique | UID kartu RFID |
| `status` | in:aktif,nonaktif | Status keaktifan |

### 6.3 Laporan Absensi

**Filter yang tersedia:**
- **Tanggal:** Rentang `dari` s/d `sampai` (required)
- **Divisi:** Filter berdasarkan divisi tertentu
- **Status:** Filter Hadir/Terlambat/Alpha/Izin
- **Search:** Cari berdasarkan nama atau NIP karyawan

**Export CSV:**
- Format: CSV (Comma-Separated Values)
- Kolom: No, Tanggal, NIP, Nama, Divisi, Jam Masuk, Jam Pulang, Status, Keterangan
- **CSV Injection Prevention:** Cell yang dimulai `=`, `+`, `-`, `@` akan di-prefix `\t`
- **Zero dependency:** Menggunakan native PHP `fputcsv()` tanpa library tambahan

### 6.4 Dashboard

Statistik real-time untuk admin panel:

```json
{
    "total_karyawan": 6,
    "karyawan_aktif": 5,
    "absensi_hari_ini": {
        "total_hadir": 4,
        "hadir": 3,
        "terlambat": 1,
        "izin": 0,
        "alpha": 1
    },
    "karyawan_per_divisi": {
        "IT": 2,
        "HRD": 1,
        "Marketing": 1,
        "Finance": 1,
        "Operations": 1
    }
}
```

**Logika Alpha:**
```php
$totalAlpha = max(0, $karyawanAktif - $totalHadir - $totalIzin);
// Alpha = karyawan aktif yang tidak hadir dan tidak izin
```

### 6.5 Global Search

Pencarian silang antara karyawan dan divisi:

**Endpoint:** `GET /api/search?q={query}`

**Response:**
```json
{
    "karyawan": [
        {
            "type": "karyawan",
            "id": 1,
            "title": "Budi Santoso",
            "subtitle": "NIP001 - IT"
        }
    ],
    "divisi": [
        {
            "type": "divisi",
            "id": 1,
            "title": "IT",
            "subtitle": "2 karyawan"
        }
    ],
    "total": 2
}
```

**Search Fields:**
- Karyawan: `nama`, `nip`, `rfid_uid`
- Divisi: `nama_divisi`
- Limit: 10 karyawan + 5 divisi

### Contoh Request & Response

Semua response API menggunakan format konsisten:
```json
{
    "success": true/false,
    "message": "Deskripsi",
    "data": { ... }
}
```

#### Autentikasi

**Login**
```
POST /api/login
Content-Type: application/json
```
Request:
```json
{
    "email": "admin@example.com",
    "password": "Admin@123"
}
```
Success (200):
```json
{
    "success": true,
    "message": "Login berhasil",
    "data": {
        "user": {
            "id": 1,
            "nama": "Super Admin",
            "email": "admin@example.com",
            "role": "superadmin"
        },
        "token": "1|abc123def456..."
    }
}
```
Error - wrong password (422):
```json
{
    "success": false,
    "message": "Validasi gagal",
    "errors": {
        "email": ["Email atau password salah."]
    }
}
```
Error - rate limited (429):
```json
{
    "message": "Too Many Attempts."
}
```

**User (Ambil Data User Login)**
```
GET /api/user
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Data user berhasil diambil",
    "data": {
        "id": 1,
        "nama": "Super Admin",
        "email": "admin@example.com",
        "role": "superadmin"
    }
}
```
Error - unauthenticated (401):
```json
{
    "message": "Unauthenticated."
}
```

**Change Password**
```
POST /api/change-password
Authorization: Bearer {token}
Content-Type: application/json
```
Request:
```json
{
    "old_password": "Admin@123",
    "new_password": "NewPass@456",
    "new_password_confirmation": "NewPass@456"
}
```
Success (200):
```json
{
    "success": true,
    "message": "Password berhasil diubah",
    "data": null
}
```
Error - wrong old password (422):
```json
{
    "success": false,
    "message": "Password lama salah"
}
```

**Logout**
```
POST /api/logout
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Logout berhasil",
    "data": null
}
```

#### Karyawan

**List Karyawan**
```
GET /api/karyawan?search=budi&divisi_id=1&status=aktif&per_page=15
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Data karyawan berhasil diambil",
    "data": {
        "data": [
            {
                "id": 1,
                "nama": "Budi Santoso",
                "nip": "NIP001",
                "jabatan": "Software Developer",
                "divisi_id": 1,
                "rfid_uid": "RFID001",
                "status": "aktif",
                "created_at": "2026-07-17T00:00:00.000000Z",
                "updated_at": "2026-07-17T00:00:00.000000Z",
                "division": {
                    "id": 1,
                    "nama_divisi": "IT",
                    "created_at": "2026-07-17T00:00:00.000000Z",
                    "updated_at": "2026-07-17T00:00:00.000000Z"
                }
            }
        ],
        "links": { "...pagination links..." },
        "meta": { "...pagination meta..." }
    }
}
```

**Store Karyawan**
```
POST /api/karyawan
Authorization: Bearer {token}
Content-Type: application/json
```
Request:
```json
{
    "nama": "Andi Pratama",
    "nip": "NIP007",
    "jabatan": "Staff Marketing",
    "divisi_id": 3,
    "rfid_uid": "RFID007",
    "status": "aktif"
}
```
Success (201):
```json
{
    "success": true,
    "message": "Karyawan berhasil ditambahkan",
    "data": {
        "id": 7,
        "nama": "Andi Pratama",
        "nip": "NIP007",
        "jabatan": "Staff Marketing",
        "divisi_id": 3,
        "rfid_uid": "RFID007",
        "status": "aktif",
        "created_at": "2026-07-26T10:00:00.000000Z",
        "updated_at": "2026-07-26T10:00:00.000000Z"
    }
}
```
Error - validation (422):
```json
{
    "message": "Validasi gagal",
    "errors": {
        "nama": ["The nama field is required."],
        "nip": ["The nip field is required."],
        "rfid_uid": ["The rfid_uid field is required."]
    }
}
```

**Show Karyawan**
```
GET /api/karyawan/1
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Data karyawan berhasil diambil",
    "data": {
        "id": 1,
        "nama": "Budi Santoso",
        "nip": "NIP001",
        "jabatan": "Software Developer",
        "divisi_id": 1,
        "rfid_uid": "RFID001",
        "status": "aktif",
        "created_at": "2026-07-17T00:00:00.000000Z",
        "updated_at": "2026-07-17T00:00:00.000000Z",
        "division": {
            "id": 1,
            "nama_divisi": "IT"
        }
    }
}
```
Error - not found (404):
```json
{
    "success": false,
    "message": "Data Employee tidak ditemukan"
}
```

**Update Karyawan**
```
PUT /api/karyawan/1
Authorization: Bearer {token}
Content-Type: application/json
```
Request:
```json
{
    "nama": "Budi Santoso",
    "jabatan": "Senior Developer",
    "status": "aktif"
}
```
Success (200):
```json
{
    "success": true,
    "message": "Karyawan berhasil diupdate",
    "data": {
        "id": 1,
        "nama": "Budi Santoso",
        "nip": "NIP001",
        "jabatan": "Senior Developer",
        "divisi_id": 1,
        "rfid_uid": "RFID001",
        "status": "aktif",
        "created_at": "2026-07-17T00:00:00.000000Z",
        "updated_at": "2026-07-26T10:00:00.000000Z"
    }
}
```

**Delete Karyawan** (superadmin only)
```
DELETE /api/karyawan/7
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Karyawan berhasil dihapus",
    "data": null
}
```
Error - karyawan punya absensi (422):
```json
{
    "success": false,
    "message": "Karyawan masih memiliki data absensi, tidak bisa dihapus"
}
```
Error - forbidden (403):
```json
{
    "message": "Forbidden."
}
```

**Riwayat Absensi Karyawan**
```
GET /api/karyawan/1/absensi?bulan=2026-07&per_page=15
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Riwayat absensi berhasil diambil",
    "data": {
        "karyawan": {
            "id": 1,
            "nama": "Budi Santoso",
            "nip": "NIP001"
        },
        "riwayat": {
            "data": [
                {
                    "id": 10,
                    "employee_id": 1,
                    "tanggal": "2026-07-25",
                    "jam_masuk": "07:55:00",
                    "jam_pulang": "17:05:00",
                    "status": "Hadir",
                    "keterangan": null,
                    "input_by": null,
                    "created_at": "2026-07-25T00:00:00.000000Z",
                    "updated_at": "2026-07-25T00:00:00.000000Z"
                }
            ],
            "links": { "...pagination links..." },
            "meta": { "...pagination meta..." }
        }
    }
}
```

#### Divisi

**List Divisi**
```
GET /api/divisi
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Data divisi berhasil diambil",
    "data": [
        {
            "id": 1,
            "nama_divisi": "IT",
            "created_at": "2026-07-17T00:00:00.000000Z",
            "updated_at": "2026-07-17T00:00:00.000000Z",
            "employees_count": 2
        },
        {
            "id": 2,
            "nama_divisi": "HRD",
            "created_at": "2026-07-17T00:00:00.000000Z",
            "updated_at": "2026-07-17T00:00:00.000000Z",
            "employees_count": 1
        }
    ]
}
```

**Store Divisi**
```
POST /api/divisi
Authorization: Bearer {token}
Content-Type: application/json
```
Request:
```json
{
    "nama_divisi": "Engineering"
}
```
Success (201):
```json
{
    "success": true,
    "message": "Divisi berhasil ditambahkan",
    "data": {
        "id": 6,
        "nama_divisi": "Engineering",
        "created_at": "2026-07-26T10:00:00.000000Z",
        "updated_at": "2026-07-26T10:00:00.000000Z"
    }
}
```
Error - duplicate name (422):
```json
{
    "message": "Validasi gagal",
    "errors": {
        "nama_divisi": ["The nama_divisi has already been taken."]
    }
}
```

**Show Divisi**
```
GET /api/divisi/1
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Data divisi berhasil diambil",
    "data": {
        "id": 1,
        "nama_divisi": "IT",
        "created_at": "2026-07-17T00:00:00.000000Z",
        "updated_at": "2026-07-17T00:00:00.000000Z",
        "employees": [
            {
                "id": 1,
                "nama": "Budi Santoso",
                "nip": "NIP001"
            },
            {
                "id": 2,
                "nama": "Rina Wati",
                "nip": "NIP002"
            }
        ]
    }
}
```

**Update Divisi**
```
PUT /api/divisi/1
Authorization: Bearer {token}
Content-Type: application/json
```
Request:
```json
{
    "nama_divisi": "Information Technology"
}
```
Success (200):
```json
{
    "success": true,
    "message": "Divisi berhasil diupdate",
    "data": {
        "id": 1,
        "nama_divisi": "Information Technology",
        "created_at": "2026-07-17T00:00:00.000000Z",
        "updated_at": "2026-07-26T10:00:00.000000Z"
    }
}
```

**Delete Divisi** (superadmin only)
```
DELETE /api/divisi/6
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Divisi berhasil dihapus",
    "data": null
}
```
Error - divisi punya karyawan (422):
```json
{
    "success": false,
    "message": "Divisi masih memiliki karyawan, tidak bisa dihapus"
}
```

#### Jadwal Kerja

**Lihat Jadwal**
```
GET /api/jadwal
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Data jadwal berhasil diambil",
    "data": {
        "id": 1,
        "jam_masuk_standar": "08:00:00",
        "jam_pulang_standar": "17:00:00",
        "toleransi_menit": 15,
        "created_at": "2026-07-17T00:00:00.000000Z",
        "updated_at": "2026-07-17T00:00:00.000000Z"
    }
}
```

**Update Jadwal**
```
PUT /api/jadwal
Authorization: Bearer {token}
Content-Type: application/json
```
Request:
```json
{
    "jam_masuk_standar": "08:30:00",
    "jam_pulang_standar": "17:30:00",
    "toleransi_menit": 20
}
```
Success (200):
```json
{
    "success": true,
    "message": "Jadwal kerja berhasil diupdate",
    "data": {
        "id": 1,
        "jam_masuk_standar": "08:30:00",
        "jam_pulang_standar": "17:30:00",
        "toleransi_menit": 20,
        "created_at": "2026-07-17T00:00:00.000000Z",
        "updated_at": "2026-07-26T10:00:00.000000Z"
    }
}
```
Error - validation (422):
```json
{
    "message": "Validasi gagal",
    "errors": {
        "jam_masuk_standar": ["The jam masuk standar field is required."],
        "toleransi_menit": ["The toleransi menit field is required."]
    }
}
```

#### Absensi Manual (Admin)

**Input Absensi Manual**
```
POST /api/absensi/manual
Authorization: Bearer {token}
Content-Type: application/json
```
Request:
```json
{
    "employee_id": 3,
    "tanggal": "2026-07-25",
    "jam_masuk": null,
    "jam_pulang": null,
    "status": "Izin",
    "keterangan": "Sakit flu"
}
```
Success (201):
```json
{
    "success": true,
    "message": "Absensi manual berhasil ditambahkan",
    "data": {
        "id": 20,
        "employee_id": 3,
        "tanggal": "2026-07-25",
        "jam_masuk": null,
        "jam_pulang": null,
        "status": "Izin",
        "keterangan": "Sakit flu",
        "input_by": 1,
        "created_at": "2026-07-26T10:00:00.000000Z",
        "updated_at": "2026-07-26T10:00:00.000000Z"
    }
}
```
Error - sudah ada absensi di tanggal itu (422):
```json
{
    "success": false,
    "message": "Absensi untuk karyawan ini tanggal ini sudah ada"
}
```

**Update Absensi**
```
PUT /api/absensi/20
Authorization: Bearer {token}
Content-Type: application/json
```
Request:
```json
{
    "jam_masuk": "09:00:00",
    "jam_pulang": "17:00:00",
    "status": "Terlambat",
    "keterangan": "Terlambat karena macet"
}
```
Success (200):
```json
{
    "success": true,
    "message": "Absensi berhasil diupdate",
    "data": {
        "id": 20,
        "employee_id": 3,
        "tanggal": "2026-07-25",
        "jam_masuk": "09:00:00",
        "jam_pulang": "17:00:00",
        "status": "Terlambat",
        "keterangan": "Terlambat karena macet",
        "input_by": 1,
        "created_at": "2026-07-26T10:00:00.000000Z",
        "updated_at": "2026-07-26T10:05:00.000000Z"
    }
}
```

**Delete Absensi** (superadmin only)
```
DELETE /api/absensi/20
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Absensi berhasil dihapus",
    "data": null
}
```

#### Device ESP32 (Absensi IoT)

**Check-in (Tap Pertama)**
```
POST /api/absensi
Content-Type: application/json
X-API-Key: {api_key}
```
Request:
```json
{
    "uid": "RFID001"
}
```
Success (201):
```json
{
    "success": true,
    "message": "Absensi berhasil",
    "data": {
        "nama": "Budi Santoso",
        "status": "Hadir",
        "jam_masuk": "07:55:30"
    }
}
```

**Check-in Terlambat**
```json
{
    "success": true,
    "message": "Absensi berhasil",
    "data": {
        "nama": "Rina Wati",
        "status": "Terlambat",
        "jam_masuk": "08:20:15"
    }
}
```

**Check-out (Tap Kedua)**
```json
{
    "success": true,
    "message": "Absensi berhasil",
    "data": {
        "nama": "Budi Santoso",
        "status": "Checkout Berhasil",
        "jam_pulang": "17:05:00"
    }
}
```
Error - RFID tidak terdaftar (404):
```json
{
    "success": false,
    "message": "Kartu RFID tidak terdaftar"
}
```
Error - karyawan nonaktif (403):
```json
{
    "success": false,
    "message": "Karyawan tidak aktif"
}
```
Error - API key invalid (401):
```json
{
    "success": false,
    "message": "API Key tidak valid"
}
```
Error - sudah checkout (400):
```json
{
    "success": false,
    "message": "Anda sudah checkout hari ini"
}
```

#### Laporan

**Laporan Absensi**
```
GET /api/laporan?dari=2026-07-01&sampai=2026-07-31&divisi_id=1&status=Hadir
Authorization: Bearer {token}
```
Success (200):
```json
{
    "success": true,
    "message": "Laporan absensi berhasil diambil",
    "data": {
        "data": [
            {
                "id": 10,
                "employee_id": 1,
                "tanggal": "2026-07-25",
                "jam_masuk": "07:55:00",
                "jam_pulang": "17:05:00",
                "status": "Hadir",
                "keterangan": null,
                "input_by": null,
                "created_at": "2026-07-25T00:00:00.000000Z",
                "updated_at": "2026-07-25T00:00:00.000000Z",
                "employee": {
                    "id": 1,
                    "nama": "Budi Santoso",
                    "nip": "NIP001",
                    "divisi_id": 1,
                    "division": {
                        "id": 1,
                        "nama_divisi": "IT"
                    }
                },
                "input_by_user": null
            }
        ],
        "links": { "...pagination links..." },
        "meta": { "...pagination meta..." }
    }
}
```
Error - missing date range (422):
```json
{
    "message": "Validasi gagal",
    "errors": {
        "dari": ["The dari field is required."],
        "sampai": ["The sampai field is required."]
    }
}
```

**Export Laporan ke CSV**
```
GET /api/laporan/export?dari=2026-07-01&sampai=2026-07-31
Authorization: Bearer {token}
```
Response: File CSV (Content-Type: text/csv)
```
No,Tanggal,NIP,Nama Divisi,Jam Masuk,Jam Pulang,Status,Keterangan
1,2026-07-25,NIP001,Budi Santoso,IT,07:55:00,17:05:00,Hadir,
2,2026-07-25,NIP002,Rina Wati,IT,08:10:00,17:00:00,Terlambat,Terlambat 10 menit
3,2026-07-25,NIP003,Dedi Kurniawan,HRD,,,Izin,Sakit flu
```
Filename: `laporan_absensi_2026-07-01_sd_2026-07-31.csv`

---

## 7. Testing & Kualitas Kode

### 7.1 Feature Tests

| Test File | Tests | Assertions | Coverage |
|---|---|---|---|
| `AuthTest.php` | 6 | 14 | Login, logout, user, change-password |
| `KaryawanTest.php` | 11 | 34 | CRUD, search, filter, role protection, hard delete guard |
| `DivisiTest.php` | 11 | 26 | CRUD, validation, role protection, relational delete guard |
| `AbsensiDeviceTest.php` | 6 | 10 | Device absensi, API key, RFID handling (1 skipped - MySQL only) |
| `DashboardTest.php` | 3 | 8 | Auth, stats structure, zero-data defaults |
| `LaporanTest.php` | 4 | 10 | Auth, required params, filtered results, CSV export |
| `GlobalSearchTest.php` | 4 | 8 | Auth, min-length, karyawan+divisi results, empty results |
| `JadwalTest.php` | 4 | 8 | Auth, index, update, validation |
| `ExampleTest.php` | 2 | 5 | Basic application tests |
| **Total** | **51** | **123** | **8 dari 8 controller ter-test** |

**Test Scenarios Covered:**

**Auth Testing (6 tests):**
- ✅ Login success + token returned
- ✅ Login wrong password → 422
- ✅ User endpoint requires auth → 401
- ✅ User endpoint with token → 200
- ✅ Logout success
- ✅ Change password success

**Karyawan Testing (11 tests):**
- ✅ Index requires auth → 401
- ✅ Index returns paginated data
- ✅ Search by nama
- ✅ Filter by divisi
- ✅ Store creates karyawan
- ✅ Store validation (empty body → 422)
- ✅ Show returns karyawan
- ✅ Update karyawan
- ✅ Destroy karyawan (superadmin only)
- ✅ Destroy forbidden for non-superadmin → 403
- ✅ Destroy blocked if karyawan has attendance → 422

**Divisi Testing (11 tests):**
- ✅ Index requires auth → 401
- ✅ Index returns list of divisions
- ✅ Store creates divisi
- ✅ Store validation (empty body → 422)
- ✅ Store duplicate name → 422
- ✅ Show returns divisi with employees
- ✅ Show not found → 404
- ✅ Update divisi
- ✅ Destroy divisi (superadmin only)
- ✅ Destroy forbidden for non-superadmin → 403
- ✅ Destroy blocked if divisi has employees → 422

**Device Absensi Testing (6 tests):**
- ✅ Device post attendance success
- ✅ Invalid API key → 401
- ✅ Missing API key → 401
- ✅ Unknown RFID → 404
- ✅ Inactive employee rejected → 403
- ⏭️ Checkout/alpha flows (skipped - requires MySQL)

**Dashboard Testing (3 tests):**
- ✅ Index requires auth → 401
- ✅ Index returns stats with correct structure
- ✅ Index returns zero counts when no data

**Laporan Testing (4 tests):**
- ✅ Index requires auth → 401
- ✅ Index requires dari and sampai params
- ✅ Index returns filtered attendance
- ✅ Export returns CSV

**Global Search Testing (4 tests):**
- ✅ Search requires auth → 401
- ✅ Search requires min 2 chars
- ✅ Search returns karyawan and divisi results
- ✅ Search with no results

**Jadwal Testing (4 tests):**
- ✅ Index requires auth → 401
- ✅ Index returns schedule
- ✅ Update schedule
- ✅ Update validation (invalid format → 422)

### 7.2 Code Quality

| Aspek | Implementasi |
|---|---|
| **Thin Controller** | Controller hanya handle HTTP concern, business logic di Service |
| **Service Layer** | `AbsensiService` (absensi logic), `AuditLogService` (logging) |
| **Form Request** | 7 request classes untuk validasi terisolasi |
| **Configurable** | Semua konfigurasi di `config/absensi.php` |
| **Route Model Binding** | Otomatis resolve model dari URL parameter |
| **Base Controller** | `successResponse()` dan `errorResponse()` untuk format konsisten |
| **Custom Exception** | `ApiException` untuk error handling yang terstruktur |
| **Factories** | 5 factories (User, Division, Employee, Attendance, Schedule) |
| **Zero External Packages** | Hanya Laravel + Sanctum, tanpa dependency tambahan |

### 7.3 Form Request Classes

| Class | Fungsi |
|---|---|
| `StoreKaryawanRequest` | Validasi tambah karyawan |
| `UpdateKaryawanRequest` | Validasi update karyawan (unique ignore self) |
| `StoreDivisiRequest` | Validasi tambah divisi |
| `UpdateDivisiRequest` | Validasi update divisi (unique ignore self) |
| `StoreAbsensiManualRequest` | Validasi absensi manual |
| `UpdateAbsensiRequest` | Validasi update absensi |
| `LaporanRequest` | Validasi filter laporan |

---

## 8. Deployment & Setup

### Prasyarat

- PHP 8.3+
- MySQL 8
- Composer
- Node.js (untuk frontend)

### Instalasi Backend

```bash
# 1. Clone repository
git clone <repository-url>
cd absensi_iot

# 2. Checkout branch backend
git checkout be

# 3. Masuk ke folder backend
cd backend

# 4. Install dependencies PHP
composer install

# 5. Copy environment file
cp .env.example .env

# 6. Generate application key
php artisan key:generate

# 7. Konfigurasi database di .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=absensi_iot
DB_USERNAME=root
DB_PASSWORD=

# 8. Konfigurasi API Key untuk ESP32
API_KEY=your-api-key-here

# 9. Jalankan migration + seed data
php artisan migrate:fresh --seed

# 10. Jalankan server
php artisan serve
```

### Default Login

| Field | Value |
|---|---|
| **Email** | `admin@example.com` |
| **Password** | `Admin@123` |
| **Role** | `superadmin` |

### Seed Data

| Data | Jumlah | Keterangan |
|---|---|---|
| Admin | 1 | superadmin |
| Divisi | 5 | HRD, IT, Marketing, Finance, Operations |
| Karyawan | 6 | 5 aktif + 1 nonaktif |
| Jadwal | 1 | 08:00 - 17:00, toleransi 15 menit |

### Generate API Key untuk ESP32

```bash
# Generate key baru (replace existing)
php artisan api:generate-key

# Generate key baru dengan rotation (keep old key)
php artisan api:generate-key --rotate

# Jangan lupa clear config cache
php artisan config:clear
```

### Menjalankan Tests

```bash
# Clear config cache dulu
php artisan config:clear

# Jalankan semua tests
php artisan test

# Jalankan test spesifik
php artisan test --filter=AuthTest
php artisan test --filter=KaryawanTest
php artisan test --filter=DivisiTest
php artisan test --filter=JadwalTest
php artisan test --filter=DashboardTest
php artisan test --filter=LaporanTest
php artisan test --filter=GlobalSearchTest
php artisan test --filter=AbsensiDeviceTest
```

---

## 9. Struktur Folder

```
backend/
├── app/
│   ├── Console/
│   │   └── Commands/
│   │       └── GenerateApiKey.php          # Artisan command generate API key
│   ├── Exceptions/
│   │   └── ApiException.php               # Custom exception untuk API errors
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php             # Base controller (successResponse/errorResponse)
│   │   │   └── Api/
│   │   │       ├── AbsensiController.php   # Absensi device + manual + history
│   │   │       ├── AuthController.php      # Login, logout, user, change-password
│   │   │       ├── DashboardController.php # Statistik dashboard
│   │   │       ├── DivisiController.php    # CRUD divisi
│   │   │       ├── GlobalSearchController.php # Pencarian silang
│   │   │       ├── JadwalController.php    # Lihat/update jadwal
│   │   │       ├── KaryawanController.php  # CRUD karyawan + riwayat
│   │   │       └── LaporanController.php   # Laporan + export CSV
│   │   ├── Middleware/
│   │   │   ├── Authenticate.php            # Custom auth redirect
│   │   │   ├── CheckRole.php              # Role-based access control
│   │   │   └── ValidateApiKey.php          # API key validation untuk ESP32
│   │   └── Requests/
│   │       ├── LaporanRequest.php          # Validasi filter laporan
│   │       ├── StoreAbsensiManualRequest.php # Validasi absensi manual
│   │       ├── StoreDivisiRequest.php      # Validasi tambah divisi
│   │       ├── StoreKaryawanRequest.php    # Validasi tambah karyawan
│   │       ├── UpdateAbsensiRequest.php    # Validasi update absensi
│   │       ├── UpdateDivisiRequest.php     # Validasi update divisi
│   │       └── UpdateKaryawanRequest.php   # Validasi update karyawan
│   ├── Models/
│   │   ├── Attendance.php                  # Model absensi
│   │   ├── AuditLog.php                   # Model audit log
│   │   ├── Division.php                   # Model divisi
│   │   ├── Employee.php                   # Model karyawan
│   │   ├── Schedule.php                   # Model jadwal kerja
│   │   └── User.php                       # Model user (admin)
│   └── Services/
│       ├── AbsensiService.php              # Business logic absensi
│       └── AuditLogService.php            # Service audit logging
├── config/
│   ├── absensi.php                        # Konfigurasi absensi (status, toleransi, pagination)
│   ├── cors.php                           # CORS configuration
│   ├── sanctum.php                        # Sanctum token expiration config
│   └── services.php                       # API keys configuration
├── database/
│   ├── factories/
│   │   ├── AttendanceFactory.php
│   │   ├── DivisionFactory.php
│   │   ├── EmployeeFactory.php
│   │   ├── ScheduleFactory.php
│   │   └── UserFactory.php
│   ├── migrations/
│   │   ├── 2026_07_17_000001_create_users_table.php
│   │   ├── 2026_07_17_000002_create_divisions_table.php
│   │   ├── 2026_07_17_000003_create_employees_table.php
│   │   ├── 2026_07_17_000004_create_schedules_table.php
│   │   ├── 2026_07_17_000005_create_attendance_table.php
│   │   ├── 2026_07_17_000006_create_sessions_and_password_resets_table.php
│   │   ├── 2026_07_17_000007_create_personal_access_tokens_table.php
│   │   ├── 2026_07_22_000001_add_indexes_and_constraints.php
│   │   ├── 2026_07_22_095240_create_audit_logs_table.php
│   │   └── 2026_07_22_140446_create_cache_table.php
│   └── seeders/
│       └── DatabaseSeeder.php              # Seed admin + divisi + karyawan + jadwal
├── routes/
│   ├── api.php                            # Semua API routes (25 endpoints)
│   ├── console.php                        # Artisan console routes
│   └── web.php                            # Web routes (default)
├── tests/
│   ├── Feature/
│   │   ├── AbsensiDeviceTest.php          # 6 tests - Device absensi
│   │   ├── AuthTest.php                   # 6 tests - Autentikasi
│   │   ├── DashboardTest.php              # 3 tests - Dashboard stats
│   │   ├── DivisiTest.php                 # 11 tests - CRUD divisi
│   │   ├── ExampleTest.php                # 2 tests - Basic test
│   │   ├── GlobalSearchTest.php           # 4 tests - Pencarian silang
│   │   ├── JadwalTest.php                 # 4 tests - Jadwal kerja
│   │   ├── KaryawanTest.php               # 11 tests - CRUD karyawan
│   │   └── LaporanTest.php                # 4 tests - Laporan + export
│   ├── Unit/
│   │   └── ExampleTest.php                # Unit test example
│   └── TestCase.php                       # Base test case
├── bootstrap/
│   └── app.php                            # Application bootstrap + exception handling
├── public/
│   └── index.php                          # Entry point
├── .env.example                           # Environment template
├── composer.json                          # PHP dependencies
├── phpunit.xml                            # Test configuration
└── vite.config.js                         # Vite configuration
```

---

## 10. Kesimpulan & Hasil

### Pencapaian Pengembangan

Backend sistem absensi IoT RFID ini telah dikembangkan melalui **10 fase** pengembangan yang terstruktur:

| Fase | Deskripsi | Hasil |
|---|---|---|
| 1 | Setup Laravel + Database Schema | 15 tabel, 10 migrations |
| 2 | Auth System + RBAC | Sanctum token + API key + 2 roles |
| 3 | CRUD Karyawan | Full CRUD + search/filter/pagination |
| 4 | CRUD Divisi | Full CRUD + relasi karyawan |
| 5 | Device Absensi (IoT) | Check-in/check-out logic + transaction |
| 6 | Absensi Manual (Admin) | Input manual + audit log |
| 7 | Dashboard + Laporan | Statistik real-time + export CSV |
| 8 | Security Hardening | Rate limiting, CSV injection prevention, timing attack |
| 9 | Testing | 24 tests, 62 assertions |
| 10 | Documentation | API docs, code review, dokumentasi ini |

### Key Metrics

| Metrik | Nilai |
|---|---|
| **Total API Endpoints** | 25 |
| **Total Database Tables** | 15 |
| **Total Models** | 6 (User, Division, Employee, Schedule, Attendance, AuditLog) |
| **Total Controllers** | 8 |
| **Total Services** | 2 (AbsensiService, AuditLogService) |
| **Total Form Requests** | 7 |
| **Total Middleware** | 3 (ValidateApiKey, CheckRole, Authenticate) |
| **Total Feature Tests** | 51 |
| **Total Test Assertions** | 123 |
| **Total Factories** | 5 |
| **External Packages** | 0 (hanya Laravel + Sanctum) |

### Keunggulan Sistem

1. **Production-Ready Architecture**
   - Service layer pattern memisahkan business logic dari HTTP concern
   - Database transactions + row locking mencegah race condition
   - Consistent error response format untuk semua endpoint

2. **Zero External Dependencies**
   - Tidak ada package tambahan selain Laravel + Sanctum
   - CSV export menggunakan native PHP (`fputcsv`)
   - Mengurangi attack surface dan maintenance burden

3. **Comprehensive Security**
   - Dual authentication (Sanctum + API Key)
   - Role-based access control (admin + superadmin)
   - Rate limiting di semua endpoint sensitif
   - CSV injection prevention
   - Timing attack prevention (hash_equals)
   - Audit logging untuk semua aktivitas CRUD

4. **Automated Testing**
   - 51 feature tests dengan 123 assertions
   - Cover semua 8 controller (Auth, Karyawan, Divisi, Jadwal, Dashboard, Laporan, GlobalSearch, Device)
   - Menggunakan in-memory SQLite untuk testing

5. **Well-Structured Code**
   - Thin controllers, fat services
   - Form Request classes untuk validasi
   - Configurable constants via `config/absensi.php`
   - Route model binding untuk clean URLs

6. **Full API Documentation**
   - 25 endpoints terdokumentasi lengkap
   - Request/response format yang konsisten
   - Setup guide untuk deployment

---

## 11. Catatan Tambahan

### Alur Proses Izin

Status **"Izin"** tidak memiliki flow approval dari karyawan. Status ini diinput **manual oleh admin** melalui endpoint `POST /api/absensi/manual`. Alurnya:

1. Admin menerima lisan/WhatsApp dari karyawan yang tidak bisa hadir
2. Admin membuka panel admin → menu Absensi Manual
3. Admin memilih karyawan, tanggal, mengisi status **"Izin"**, dan keterangan (opsional)
4. Sistem langsung mencatat ke database tanpa approval workflow

**Alasan desain:** Pada tim kecil, admin sudah mengenal langsung semua karyawan. Approval flow menambah kompleksitas tanpa nilai signifikan untuk skala ini. Jika diperlukan di masa depan, bisa ditambahkan endpoint `POST /api/izin/request` + `PUT /api/izin/{id}/approve` dengan tabel `leave_requests` terpisah.

### Keterbatasan Employee-Facing

Sistem ini **hanya admin-panel**. Karyawan tidak bisa:
- Cek absensi sendiri via API
- Input izin sendiri
- Lihat laporan pribadi

Ini adalah **keputusan scope untuk MVP**. Alasan:
- Target pengguna utama adalah admin HRD yang mengelola absensi
- ESP32 sudah otomatis mencatat hadir/tidak hadir via kartu RFID
- Fitur employee-facing membutuhkan autentikasi terpisah (bukan Sanctum admin token)

**Enhancement untuk versi selanjutnya:** Portal karyawan dengan login NIP + password. Endpoint yang perlu ditambahkan:
- `POST /api/employee/login` (autentikasi terpisah dari admin)
- `GET /api/employee/attendance` (lihat riwayat absensi sendiri)
- `POST /api/employee/izin` (ajukan izin)

### Keamanan Token di Frontend

Sanctum token harus disimpan dengan aman di browser. Perbandingan metode penyimpanan:

| Metode | Keamanan | Keterangan |
|---|---|---|
| **httpOnly Cookie** | ★★★★★ | Paling aman. Tidak bisa diakses JS, anti-XSS. Backend set cookie, browser kirim otomatis. |
| **sessionStorage** | ★★★☆☆ | Lebih baik dari localStorage. Data hilang saat tab ditutup. Masih rentan XSS. |
| **localStorage** | ★★☆☆☆ | **Hindari.** Bisa diakses semua script, termasuk XSS payload. |

**Rekomendasi untuk production:**
- Gunakan **httpOnly cookies** jika SPA (React) satu domain dengan API
- Jika cross-domain, gunakan **sessionStorage** dengan flag `secure` dan `sameSite=strict`
- **Jangan pernah** simpan token di `localStorage` di production

**Token expiration:** 24 jam (1440 menit). Dikonfigurasi via env:
```env
SANCTUM_TOKEN_EXPIRATION_MINUTES=1440
```
Setelah expired, user harus login ulang. Frontend sebaiknya handle 401 response dengan redirect ke halaman login.

### Konfigurasi Timezone

Semua perbandingan waktu (check-in, late threshold, tanggal absensi) menggunakan timezone yang dikonfigurasi di `APP_TIMEZONE`.

```env
# .env
APP_TIMEZONE=Asia/Jakarta
```

| Pengaturan | Default | Keterangan |
|---|---|---|
| `APP_TIMEZONE` | `Asia/Jakarta` | WIB (UTC+7) |
| `APP_LOCALE` | `id` | Locale Indonesia |
| `APP_FALLBACK_LOCALE` | `en` | Fallback bahasa |

**Penting untuk deployment:**
- Semua `Carbon::today()`, `Carbon::now()` otomatis menggunakan APP_TIMEZONE
- Perhitungan toleransi terlambat berdasarkan jam standar + toleransi dalam timezone ini
- Jika deploy ke server luar Indonesia, **pastikan APP_TIMEZONE tetap `Asia/Jakarta`** agar jam masuk/pulang sesuai WIB
- Jika ingin mengubah ke timezone lain, update `APP_TIMEZONE` dan `APP_FALLBACK_TIMEZONE` di `.env`

### Deploy Produksi

#### Web Server

**Nginx (Recommended):**
```nginx
server {
    listen 80;
    server_name api.absensi.example.com;
    root /var/www/absensi_iot/backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

#### Queue Worker

Jalankan queue worker untuk background jobs (audit logs, notifikasi):
```bash
php artisan queue:work --sleep=3 --tries=3 --max-time=3600
```

**Supervisor config** (`/etc/supervisor/conf.d/absensi-worker.conf`):
```ini
[program:absensi-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/absensi_iot/backend/artisan queue:work sqs --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/absensi_iot/backend/storage/logs/worker.log
stopwaitsecs=3600
```

#### HTTPS

- **Let's Encrypt:** Gratis, auto-renew. `certbot --nginx -d api.absensi.example.com`
- **Cloudflare:** Proxy + SSL terminates di Cloudflare edge. Tambah IP trusted di Laravel:
  ```php
  // trustedproxies
  Request::setTrustedProxies($request->getClientIps(), Request::HEADER_X_FORWARDED_FOR);
  ```

#### Environment Variables

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.absensi.example.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=absensi_production
DB_USERNAME=absensi_user
DB_PASSWORD={strong_password}

SESSION_DRIVER=redis
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis

REDIS_HOST=127.0.0.1
REDIS_PASSWORD={redis_password}
REDIS_PORT=6379

SANCTUM_TOKEN_EXPIRATION_MINUTES=1440
APP_TIMEZONE=Asia/Jakarta
```

#### Optimasi Laravel

```bash
# Cache config, routes, dan views
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Install optimized autoloader
composer install --optimize-autoloader --no-dev

# Storage permissions
chmod -R 775 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache
```

---

*Dokumen ini disusun untuk keperluan presentasi proyek Sistem Absensi Karyawan Berbasis IoT RFID.*
