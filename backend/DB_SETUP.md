# Database Setup Guide

Panduan setup database untuk project **Sistem Absensi Karyawan IoT (RFID)**.

## Tech Stack

- **Backend:** Laravel 13.20.0
- **Database:** MySQL / MariaDB
- **Auth:** Laravel Sanctum (token-based)

## Persiapan

### 1. Pastikan MySQL/MariaDB sudah terinstall

```bash
# Cek versi MySQL
mysql --version

# Atau MariaDB
mariadb --version
```

### 2. Start MySQL/MariaDB

```bash
# systemd
sudo systemctl start mysql
sudo systemctl enable mysql

# Atau
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

## Setup Database

### 1. Clone Repository

```bash
git clone -b be https://github.com/fathir578/Absensi_karyawan_IoT.git
cd Absensi_karyawan_IoT/backend
```

### 2. Install Dependencies

```bash
composer install
```

### 3. Setup Environment

```bash
cp .env.example .env
php artisan key:generate
```

### 4. Edit .env

Buka file `.env` dan sesuaikan konfigurasi database:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=absensi_iot
DB_USERNAME=root
DB_PASSWORD=
```

**Ganti:**
- `DB_USERNAME` → username MySQL kamu
- `DB_PASSWORD` → password MySQL kamu
- `DB_DATABASE` → nama database (otomatis dibuat oleh migration)

### 5. Buat Database

```bash
# Login ke MySQL
mysql -u root -p

# Buat database
CREATE DATABASE absensi_iot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Exit
EXIT;
```

Atau langsung dari terminal:

```bash
mysql -u root -p -e "CREATE DATABASE absensi_iot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 6. Jalankan Migration

```bash
php artisan migrate
```

### 7. Jalankan Seeder (opsional)

Untuk membuat data default (admin + jadwal kerja):

```bash
php artisan db:seed
```

**Data default yang dibuat:**
| Tabel | Data |
|-------|------|
| `users` | Admin (admin@example.com / password) |
| `schedules` | Jam kerja 08:00-17:00, toleransi 15 menit |

### 8. Jalankan Server

```bash
php artisan serve
```

Server akan berjalan di `http://localhost:8000`

## Struktur Database

### ERD (Entity Relationship Diagram)

```
┌──────────────┐       ┌──────────────┐
│    users     │       │   divisions  │
├──────────────┤       ├──────────────┤
│ id           │       │ id           │
│ nama         │       │ nama_divisi  │
│ email        │       │ created_at   │
│ password     │       │ updated_at   │
│ role         │       └──────┬───────┘
│ created_at   │              │
│ updated_at   │              │ 1
└──────┬───────┘              │
       │                      │ N
       │ 1                    │
       │                      ▼
       │              ┌──────────────┐
       │              │  employees   │
       │              ├──────────────┤
       │              │ id           │
       │              │ nama         │
       │              │ nip          │
       │              │ jabatan      │
       │              │ divisi_id    │──┐
       │              │ rfid_uid     │  │
       │              │ status       │  │
       │              │ created_at   │  │
       │              │ updated_at   │  │
       │              └──────┬───────┘  │
       │                     │          │
       │ 1                   │ 1        │
       │                     │          │
       ▼ N                   ▼ N        │
┌──────────────┐       ┌──────────────┐ │
│ attendance   │       │  schedules   │ │
├──────────────┤       ├──────────────┤ │
│ id           │       │ id           │ │
│ employee_id  │──┐    │ jam_masuk    │ │
│ tanggal      │  │    │ jam_pulang   │ │
│ jam_masuk    │  │    │ toleransi    │ │
│ jam_pulang   │  │    │ created_at   │ │
│ status       │  │    │ updated_at   │ │
│ keterangan   │  │    └──────────────┘ │
│ input_by     │──┘                     │
│ created_at   │                        │
│ updated_at   │                        │
└──────────────┘                        │
                                        │
        FK attendance.employee_id ──────┘
            → employees.id (CASCADE)
```

### Tabel

| Tabel | Deskripsi |
|-------|-----------|
| `users` | Akun admin untuk login |
| `divisions` | Data divisi/departemen |
| `employees` | Data karyawan + RFID UID |
| `schedules` | Jam kerja standar & toleransi |
| `attendance` | Riwayat absensi harian |

### Foreign Keys

| Dari | Kolom | Ke | On Delete | On Update |
|------|-------|----|-----------|-----------|
| `employees` | `divisi_id` | `divisions.id` | SET NULL | CASCADE |
| `attendance` | `employee_id` | `employees.id` | CASCADE | CASCADE |
| `attendance` | `input_by` | `users.id` | SET NULL | CASCADE |

## API Endpoints

### Public (ESP32)

| Method | Endpoint | Header | Deskripsi |
|--------|----------|--------|-----------|
| POST | `/api/absensi` | `X-API-Key` | Absensi dari ESP32 |

### Public (React)

| Method | Endpoint | Body | Deskripsi |
|--------|----------|------|-----------|
| POST | `/api/login` | `email`, `password` | Login admin |

### Protected (React + Sanctum)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/logout` | Logout |
| GET | `/api/user` | Data user login |
| GET/POST | `/api/karyawan` | List/Create karyawan |
| GET/PUT/DELETE | `/api/karyawan/{id}` | Show/Update/Delete karyawan |
| GET/POST | `/api/divisi` | List/Create divisi |
| GET/PUT/DELETE | `/api/divisi/{id}` | Show/Update/Delete divisi |
| GET | `/api/jadwal` | Lihat jadwal kerja |
| PUT | `/api/jadwal` | Update jadwal kerja |
| POST | `/api/absensi/manual` | Input absensi manual |
| GET | `/api/laporan` | Laporan absensi |

## Troubleshooting

### Error: "Access denied for user"

```bash
# Pastikan MySQL running
sudo systemctl status mysql

# Login manual untuk cek koneksi
mysql -u root -p
```

### Error: "Database not found"

```bash
# Buat database manual
mysql -u root -p -e "CREATE DATABASE absensi_iot"
```

### Error: "Table not found"

```bash
# Jalankan migration
php artisan migrate
```

### Reset Database

```bash
# Hapus semua data dan jalankan ulang migration
php artisan migrate:fresh --seed
```
