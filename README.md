# Sistem Absensi Karyawan IoT RFID

Sistem presensi karyawan berbasis IoT menggunakan kartu RFID (MFRC522) pada ESP32, dengan backend Laravel dan frontend React admin dashboard.

## Arsitektur

```
┌──────────────────┐      POST /api/absensi       ┌──────────────────┐      REST API       ┌──────────────────┐
│  ESP32 Firmware  │  ──────────────────────────── │  Laravel Backend │ ◄───────────────── │  React Frontend  │
│                  │         X-API-Key Auth        │                  │      Bearer Token  │                  │
│  RC522 RFID      │                               │  MySQL Database  │                    │  Admin Dashboard │
│  LCD 16x2 I2C    │                               │  Sanctum Auth    │   SSE Stream       │  CRUD Operations │
│  Buzzer          │                               │  SSE Realtime    │ ◄════════════════ │  Realtime Update │
└──────────────────┘                               └──────────────────┘                    └──────────────────┘
```

## Fitur

### Firmware ESP32
- Baca UID kartu RFID via MFRC522 (SPI)
- Kirim data absensi ke backend via HTTP POST
- Tampilkan status di LCD 16x2 (nama, status, jam)
- Notifikasi suara via buzzer (check-in, checkout, error)
- Auto-reconnect WiFi
- Offline handling

### Backend (Laravel)
- Autentikasi: Sanctum Token (admin) + API Key (ESP32)
- Role-based access: admin, superadmin
- Absensi otomatis: check-in/check-out dari ESP32
- Absensi manual: input oleh admin
- Dashboard statistik real-time
- Laporan absensi + export Excel/CSV
- SSE (Server-Sent Events) untuk update real-time
- Rate limiting & security hardening
- Audit log semua perubahan data

### Frontend (React)
- Login + session management
- Dashboard dengan stat cards + tabel real-time
- CRUD Karyawan (list, search, detail, riwayat absensi)
- CRUD Divisi (list, search, detail)
- Pengaturan Jam Kerja (jam masuk/pulang standar + toleransi)
- Input Absensi Manual
- Laporan Absensi dengan filter + export Excel/CSV
- SSE real-time listener (auto-reconnect)
- Mock server untuk testing tanpa backend

## Struktur Repository

```
Absensi_karyawan_IoT/
├── firmware/                         # ESP32 PlatformIO project
│   ├── .gitignore
│   ├── platformio.ini                # Konfigurasi build + dependencies
│   ├── include/
│   │   ├── config.example.h          # Template config (push ke repo)
│   │   └── config.h                  # Config asli (gitignored)
│   └── src/
│       └── main.cpp                  # Firmware utama
│
├── backend/                          # (branch: be) Laravel API
│   ├── app/
│   │   ├── Console/Commands/         # Artisan commands (GenerateApiKey)
│   │   ├── Exceptions/               # ApiException handler
│   │   ├── Http/
│   │   │   ├── Controllers/Api/      # 9 API controllers
│   │   │   ├── Middleware/           # Auth, CheckRole, ValidateApiKey
│   │   │   └── Requests/            # Form request validation
│   │   ├── Models/                   # Eloquent models (6)
│   │   └── Services/                 # Business logic (3)
│   ├── config/                       # Laravel config + absensi config
│   ├── database/
│   │   ├── migrations/               # 12 migration files
│   │   ├── factories/                # Model factories
│   │   └── seeders/                  # Database seeder
│   ├── routes/api.php                # API routes
│   ├── tests/Feature/                # 9 test files
│   └── docs_*/                       # Dokumentasi + laporan PKL
│
├── fe/                               # (branch: fe) React SPA
│   ├── src/
│   │   ├── api/axios.js              # Axios instance + interceptors
│   │   ├── components/               # Reusable UI components
│   │   ├── hooks/                    # useAuth, useDebounce, useRealtime
│   │   ├── layouts/AdminLayout.jsx   # Sidebar + main content
│   │   └── pages/                    # 10 page components
│   ├── mock-server.cjs               # Express mock API
│   └── vite.config.js
│
└── README.md                         # File ini
```

## Branch

| Branch | Deskripsi | Status |
|--------|-----------|--------|
| `hardware` | Firmware ESP32 | Active |
| `be` | Backend Laravel | Stable |
| `fe` | Frontend React | Stable |
| `main` | Gabungan (belum merge) | Base |

## Hardware yang Dibutuhkan

| Komponen | Qty | Keterangan |
|----------|-----|------------|
| ESP32 DevKit | 1 | Microcontroller utama |
| RC522 RFID Reader | 1 | Pembaca kartu RFID (MFRC522) |
| LCD 16x2 I2C | 1 | Tampilan status absensi |
| Buzzer aktif | 1 | Notifikasi suara |
| Kartu RFID | N | Untuk karyawan (Mifare Classic 1K) |
| Kabel jumper | - | Untuk wiring |
| Breadboard / PCB | 1 | Prototyping |

### Wiring ESP32

#### RC522 RFID (SPI)
```
ESP32          RC522
─────          ─────
3.3V     →    3.3V
GND      →    GND
GPIO 5   →    SDA (SS)
GPIO 18  →    SCK
GPIO 23  →    MOSI
GPIO 19  →    MISO
GPIO 4   →    RST
```

#### LCD 16x2 I2C
```
ESP32          LCD
─────          ───
5V/VIN   →    VCC
GND      →    GND
GPIO 21  →    SDA
GPIO 22  →    SCL
```

#### Buzzer
```
ESP32          Buzzer
─────          ──────
GPIO 15  →    (+)
GND      →    (-)
```

## Setup

### 1. Backend (Laravel)

```bash
# Clone branch be
git checkout be
cd backend

# Install dependencies
composer install

# Setup environment
cp .env.example .env
php artisan key:generate

# Konfigurasi database di .env
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=absensi_iot
# DB_USERNAME=root
# DB_PASSWORD=

# Migrate + seed
php artisan migrate --force
php artisan db:seed

# Generate API Key untuk ESP32
php artisan api:generate-key

# Simpan API Key yang di-generate (butuh untuk firmware)

# Jalankan server
php artisan serve
```

**Default Login:**
- Email: `admin@example.com`
- Password: `Admin@123`

### 2. Frontend (React)

```bash
# Clone branch fe
git checkout fe
cd fe

# Install dependencies
npm install

# Konfigurasi .env
echo "VITE_API_URL=http://localhost:8000/api" > .env

# Jalankan dev server
npm run dev
```

Akses: `http://localhost:5173`

### 3. Firmware ESP32

```bash
# Clone branch hardware
git checkout hardware
cd firmware

# Install PlatformIO (jika belum)
# pip install platformio

# Install dependencies
pio pkg install

# Edit config.h
cp include/config.example.h include/config.h
# Edit include/config.h:
#   WIFI_SSID       = nama WiFi
#   WIFI_PASSWORD   = password WiFi
#   API_BASE_URL    = http://IP_BACKEND:8000
#   API_KEY         = key dari php artisan api:generate-key

# Upload ke ESP32
pio run -t upload

# Monitor serial
pio device monitor
```

## API Documentation

### Base URL
```
http://localhost:8000/api
```

### Autentikasi

| Tipe | Header | Untuk |
|------|--------|-------|
| Bearer Token | `Authorization: Bearer {token}` | Admin (React) |
| API Key | `X-API-Key: {api_key}` | ESP32 Device |

### Endpoint

#### Auth
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/login` | Public | `{email, password}` |
| GET | `/user` | Token | - |
| POST | `/change-password` | Token | `{old_password, new_password, new_password_confirmation}` |
| POST | `/logout` | Token | - |

#### Dashboard
| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `/dashboard` | Token | Statistik hari ini |
| GET | `/dashboard/terlambat` | Token | Detail karyawan terlambat |
| GET | `/dashboard/hadir` | Token | Detail karyawan hadir |
| GET | `/dashboard/tidak-hadir` | Token | Detail karyawan tidak hadir |

#### Karyawan
| Method | Endpoint | Auth | Body/Query |
|--------|----------|------|------------|
| GET | `/karyawan` | Token | `search`, `divisi_id`, `status`, `per_page` |
| POST | `/karyawan` | Token | `{nama, nip, rfid_uid, divisi_id, status?}` |
| GET | `/karyawan/{id}` | Token | - |
| PUT | `/karyawan/{id}` | Token | `{nama?, nip?, rfid_uid?, divisi_id?, status?}` |
| DELETE | `/karyawan/{id}` | Token + superadmin | - |
| GET | `/karyawan/{id}/absensi` | Token | `dari`, `sampai`, `per_page` |

#### Divisi
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | `/divisi` | Token | - |
| POST | `/divisi` | Token | `{nama_divisi}` |
| GET | `/divisi/{id}` | Token | - |
| PUT | `/divisi/{id}` | Token | `{nama_divisi?}` |
| DELETE | `/divisi/{id}` | Token + superadmin | - |

#### Jadwal Kerja
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | `/jadwal` | Token | - |
| PUT | `/jadwal` | Token | `{jam_masuk_standar, jam_pulang_standar, toleransi_menit}` |

#### Absensi
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/absensi` | API Key | `{uid}` |
| POST | `/absensi/manual` | Token | `{employee_id, tanggal, status, ...}` |
| PUT | `/absensi/{id}` | Token | `{status?, keterangan?}` |
| DELETE | `/absensi/{id}` | Token + superadmin | - |
| GET | `/absensi/stream` | Token | SSE realtime |

#### Laporan
| Method | Endpoint | Auth | Query |
|--------|----------|------|-------|
| GET | `/laporan` | Token | `dari`, `sampai`, `divisi_id?`, `status?`, `search?` |
| GET | `/laporan/export` | Token | Sama + `format` (xlsx/csv) |

### Response Format

```json
{
  "success": true,
  "message": "Deskripsi",
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "message": "Pesan error"
}
```

### Status Absensi

| Status | Keterangan | Warna |
|--------|------------|-------|
| `Hadir` | Tepat waktu | Hijau |
| `Terlambat` | Melewati toleransi | Kuning |
| `Izin` | Izin dari karyawan | Biru |
| `Alpha` | Tidak hadir | Merah |

### Rate Limiting

| Endpoint | Batas |
|----------|-------|
| Login | 5/menit |
| Change password | 3/menit |
| Admin (token) | 60/menit |
| Device ESP32 | 60/menit |

## Testing

### Backend
```bash
cd backend
php artisan test
```

### Frontend
```bash
cd fe

# Jalankan mock server (tanpa backend PHP)
node mock-server.cjs

# Buka http://localhost:5173
# Login: admin@example.com / password
```

## Troubleshooting

### LCD tidak menyala
- Cek wiring SDA/SCL
- Coba ganti `LCD_ADDRESS` di `config.h` dari `0x27` ke `0x3F`
- Cek voltage (beberapa modul LCD butuh 5V, bukan 3.3V)

### RFID tidak terbaca
- Cek wiring SPI (SS, SCK, MOSI, MISO, RST)
- Pastikan供电 3.3V (jangan 5V, bisa merusak RC522)
- Cek MFRC522 version di serial monitor

### ESP32 gagal koneksi backend
- Pastikan IP backend benar di `config.h`
- Pastikan backend sudah running (`php artisan serve`)
- Pastikan ESP32 dan server di network yang sama
- Cek API Key di `config.h` sama dengan di backend

### Checkout ditolak
- Backend mencegah checkout sebelum jam pulang standar
- Cek jam kerja di database tabel `schedules`
- Status `Alpha` dan `Izin` tidak bisa checkout

## License

Project PKL - Praktik Kerja Lapangan
