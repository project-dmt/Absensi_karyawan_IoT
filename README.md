# Sistem Absensi Karyawan IoT RFID

Sistem presensi karyawan berbasis **Internet of Things (IoT)** menggunakan kartu **RFID (MFRC522)** pada **ESP32**, dengan backend **Laravel 13**, frontend **React 19** (admin dashboard), dan asisten **AI Chat** untuk bertanya seputar data absensi. Setiap tap kartu RFID otomatis tercatat sebagai absensi (check-in / check-out) dan tampil real-time di dashboard admin.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Tech Stack](#tech-stack)
- [Struktur Repository](#struktur-repository)
- [Skema Database](#skema-database)
- [API Reference](#api-reference)
- [Realtime (Server-Sent Events)](#realtime-server-sent-events)
- [AI Chat Assistant](#ai-chat-assistant)
- [Keamanan](#keamanan)
- [Setup & Menjalankan Project](#setup--menjalankan-project)
- [Akun Demo & Data Seed](#akun-demo--data-seed)
- [Testing](#testing)
- [Struktur Branch](#struktur-branch)
- [Dokumentasi Tambahan](#dokumentasi-tambahan)

---

## Fitur Utama

### Firmware ESP32
- Baca UID kartu RFID via **MFRC522** (SPI)
- Kirim data absensi ke backend via **HTTP POST** (X-API-Key auth)
- Tampilkan status di **LCD 16x2 I2C** (nama karyawan, status, jam)
- Notifikasi suara via **buzzer** (check-in 1×, check-out 2×, error)
- **Offline mode** untuk testing hardware tanpa backend
- Auto-reconnect WiFi, debounce kartu (2 detik), heartbeat serial (5 detik)

### Backend (Laravel API)
- Autentikasi **Sanctum token** (admin) + **API Key** (ESP32)
- Role-based access: `admin` dan `superadmin`
- Absensi otomatis dari ESP32: check-in / check-out dengan aturan toleransi keterlambatan
- Absensi manual oleh admin (termasuk update status: izin/sakit di tengah hari)
- Dashboard statistik harian + detail (terlambat / tidak hadir / hadir)
- Laporan absensi rentang tanggal + **export Excel/CSV** (dengan anti formula injection)
- **SSE (Server-Sent Events)** untuk update real-time dashboard
- **AI Chat Assistant** dengan SQL read-only tool
- Audit log semua perubahan data, rate limiting, security hardening
- Global search karyawan & divisi

### Frontend (React Admin Dashboard)
- Login + session management (auto-logout saat token invalid)
- Dashboard dengan stat cards + tabel absensi terbaru real-time
- CRUD Karyawan (list, search, detail + riwayat absensi + filter tanggal)
- CRUD Divisi (list, search, detail + rekap kehadiran per karyawan)
- Pengaturan Jam Kerja (jam masuk/pulang standar + toleransi menit)
- Input Absensi Manual + Update Status Absensi
- Laporan Absensi (filter tanggal/divisi + export Excel/CSV + edit per record)
- **AI Chat Widget** floating (streaming response)
- Modern stack: Tailwind v4 + shadcn/ui, TanStack Router & Query, Zod + React Hook Form

---

## Arsitektur Sistem

```
┌──────────────────┐      POST /api/absensi      ┌─────────────────────────┐
│  ESP32 Firmware  │  ─────────────────────────► │     Laravel Backend     │
│                  │        X-API-Key Auth       │                         │
│  RC522 RFID      │                             │  MySQL Database         │
│  LCD 16x2 I2C    │                             │  Sanctum Auth           │
│  Buzzer          │                             │  AbsensiService         │
└──────────────────┘                             │  AuditLogService        │
                                                 │  RealtimeEventService   │
                                                 │  AI Agent + SQL Tool    │
                                                 └─────┬─────────▲────────┘
                                    REST API (Bearer)   │         │ SSE
                                    ┌───────────────────┘         │ GET /absensi/stream
                                    ▼                             │ (?token & lastId)
                              ┌────────────────────────┐   ┌──────┴───────────┐
                              │  React Frontend (Vite) │◄──┤  Dashboard      │
                              │  Admin Dashboard       │   │  real-time      │
                              │  + AI Chat Widget      │   │  auto-reconnect │
                              └────────────────────────┘   └──────────────────┘
```

**Alur tap RFID (check-in):**

```
Karyawan menempel kartu
        │
        ▼
ESP32 baca UID (MFRC522) ──► POST /api/absensi {uid} + X-API-Key
        │
        ▼
AbsensiService (DB transaction + lockForUpdate)
  ├─ Kartu belum absen hari ini  → handleCheckin  → status Hadir/Terlambat
  └─ Sudah absen                 → handleCheckout → isi jam_pulang
        │
        ▼
Simpan ke tabel attendance + dispatch realtime_events (check_in/checkout)
        │
        ▼
Dashboard admin menerima SSE → statistik & tabel ter-update otomatis
```

---

## Tech Stack

### Firmware

| Komponen | Teknologi |
|---|---|
| Microcontroller | ESP32 (`esp32dev`) |
| Framework | Arduino (PlatformIO) |
| RFID Reader | MFRC522 (`miguelbalboa/MFRC522 ^1.4.10`) |
| Display | LCD 16x2 I2C (`LiquidCrystal_I2C ^1.1.4`) |
| JSON Parsing | ArduinoJson (`^7.4.1`) |
| Komunikasi | WiFi + HTTP Client |

### Backend

| Komponen | Teknologi |
|---|---|
| Framework | Laravel `^13.8` |
| Bahasa | PHP `^8.3` |
| Database | MySQL (timezone `Asia/Jakarta`) |
| Auth API | Laravel Sanctum `^4.3` (personal access token) |
| AI | `laravel/ai ^0.10.3` (agent + tools + streaming) |
| Export Excel/CSV | PhpSpreadsheet `^5.9` |
| Testing | PHPUnit `^12.5` |

### Frontend

| Komponen | Teknologi |
|---|---|
| Framework | React `^19.2` |
| Build Tool | Vite `^8.1` |
| Styling | Tailwind CSS v4 + shadcn/ui (Nova preset) + lucide-react |
| Routing | TanStack Router `^1.170` |
| Data Fetching | TanStack Query `^5.101` |
| Form & Validasi | React Hook Form `^7.85` + Zod `^4.4` |
| AI Streaming | AI SDK `^7.0` (`@ai-sdk/react`) |
| HTTP Client | Axios (interceptor token + auto-logout 401) |

---

## Struktur Repository

```
Absensi_karyawan_IoT/
├── backend/                         # Laravel API
│   ├── app/
│   │   ├── Agents/AttendanceAgent.php      # AI agent (chat absensi)
│   │   ├── Console/Commands/GenerateApiKey.php
│   │   ├── Exceptions/ApiException.php
│   │   ├── Http/
│   │   │   ├── Controllers/Api/            # 10 API controllers
│   │   │   ├── Middleware/                 # Authenticate, CheckRole, ValidateApiKey
│   │   │   └── Requests/                   # Form request validation (8 file)
│   │   ├── Models/                         # User, Employee, Division, Schedule, Attendance, AuditLog
│   │   ├── Services/                       # AbsensiService, AuditLogService, RealtimeEventService
│   │   └── Tools/QueryDatabaseTool.php     # Tool SQL read-only untuk AI
│   ├── config/                             # Laravel config + absensi.php + ai.php
│   ├── database/
│   │   ├── migrations/                     # 12 migration files
│   │   ├── factories/                      # Model factories
│   │   └── seeders/DatabaseSeeder.php
│   ├── routes/api.php                      # Seluruh endpoint API
│   ├── tests/Feature/                      # 9 test suite
│   ├── API_DOCUMENTATION.md                # Dokumentasi API lengkap
│   ├── DB_SETUP.md                         # Panduan setup database
│   ├── DOKUMENTASI_BACKEND.md
│   └── docs_dokumentasi/ + docs_laporan_pkl/   # Dokumen .docx (BAB 1–7)
│
├── frontend/                        # React SPA
│   ├── src/
│   │   ├── api/axios.js             # Axios instance + interceptors
│   │   ├── api/queries.js           # Semua query/mutation hooks + normalizeList
│   │   ├── components/              # Reusable UI + AiChatWidget
│   │   ├── components/ui/           # shadcn/ui primitives
│   │   ├── hooks/useAuth.js         # Auth state (login, logout, ready promise)
│   │   ├── layouts/AdminLayout.jsx  # Sidebar + topbar + konten
│   │   ├── pages/                   # 10 halaman
│   │   ├── providers/QueryProvider.jsx
│   │   ├── schemas.js               # Zod schemas
│   │   └── router.jsx               # TanStack Router + lazy loading
│   ├── mock-server.cjs              # Express mock API (port 8000)
│   ├── .env.development             # VITE_API_URL
│   └── vite.config.js
│
├── firmware/                        # ESP32 PlatformIO project
│   ├── platformio.ini
│   ├── include/config.example.h     # Template config
│   └── src/main.cpp                 # Firmware utama
│
├── docs/                            # Diagram & dokumentasi
│   ├── dfd/                         # DFD Level 0 & 1 (.puml + .png)
│   ├── erd/                         # ERD (gambar)
│   ├── usecase/                     # Use case diagram
│   └── ui-mockup/                   # Mockup UI (.pdf + .drawio)
│
└── README.md                        # File ini
```

---

## Skema Database

Total **12 tabel** (7 tabel bisnis + 5 tabel infrastruktur Laravel).

```
┌─────────────┐ 1        * ┌─────────────┐ 1        * ┌─────────────┐
│  divisions  │────────────│  employees  │────────────│  attendance │
└─────────────┘  divisi_id │             │ employee_id│             │
                           └─────────────┘            └─────────────┘
                                                    │ input_by
                                                    ▼
                                           ┌─────────────┐ 1    * ┌──────────────┐
                                           │    users    │────────│  audit_logs  │
                                           └─────────────┘ user_id└──────────────┘
┌─────────────┐        ┌──────────────────┐
│  schedules  │(1 baris)│ realtime_events  │
└─────────────┘        └──────────────────┘
```

### Tabel Bisnis

**`users`** — pengguna admin sistem
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | auto-increment |
| nama | varchar(100) | NOT NULL |
| email | varchar(100) | NOT NULL, **UNIQUE** |
| password | varchar(255) | NOT NULL (hashed) |
| role | enum(`admin`,`superadmin`) | default `admin` |
| created_at / updated_at | timestamp | nullable |

**`divisions`** — divisi organisasi
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | auto-increment |
| nama_divisi | varchar(100) | NOT NULL |
| timestamps | | |

**`employees`** — data karyawan
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | auto-increment |
| nama | varchar(100) | NOT NULL |
| nip | varchar(50) | NOT NULL, **UNIQUE** |
| jabatan | varchar(100) | nullable |
| divisi_id | bigint unsigned | **FK → `divisions.id`**, `onDelete set null`, **indexed** |
| rfid_uid | varchar(50) | NOT NULL, **UNIQUE** (UID kartu RFID) |
| status | enum(`aktif`,`nonaktif`) | default `aktif` |
| timestamps | | |

**`schedules`** — jadwal kerja standar (single row)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| jam_masuk_standar | time | default `08:00:00` |
| jam_pulang_standar | time | default `17:00:00` |
| toleransi_menit | integer | default `15` |
| timestamps | | |

**`attendance`** — data absensi (tabel inti)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| employee_id | bigint unsigned | **FK → `employees.id`**, `onDelete cascade` |
| tanggal | date | NOT NULL |
| jam_masuk | time | nullable |
| jam_pulang | time | nullable |
| status | enum(`Hadir`,`Terlambat`,`Alpha`,`Izin`,`Sakit`) | default `Hadir` |
| keterangan | varchar(255) | nullable |
| input_by | bigint unsigned | **FK → `users.id`**, `onDelete set null` |
| timestamps | | |
| **Constraint** | | **UNIQUE `(employee_id, tanggal)`** — 1 absensi/karyawan/hari; index `tanggal`, index `status` |

**`realtime_events`** — antrian event untuk SSE dashboard
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| event_type | varchar(50) | `check_in` / `checkout` |
| employee_name | varchar(100) | NOT NULL |
| employee_nip | varchar(50) | nullable |
| status | varchar(20) | `Hadir`, `Terlambat`, `Checkout` |
| jam | varchar(20) | NOT NULL |
| timestamps | | index `created_at` |

**`audit_logs`** — jejak audit semua aksi admin
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | bigint PK | |
| user_id | bigint unsigned | FK → `users.id`, nullOnDelete |
| action | string | indexed (`login`, `create_karyawan`, `update_absensi`, ...) |
| model_type | string | nullable |
| model_id | bigint unsigned | nullable; index gabungan `(model_type, model_id)` |
| old_values / new_values | json | nullable (cast array) |
| ip_address | varchar(45) | nullable |
| user_agent | text | nullable |
| timestamps | | index `created_at` |

### Tabel Infrastruktur Laravel

| Tabel | Fungsi |
|---|---|
| `personal_access_tokens` | Token Sanctum (morphs, token UNIQUE, abilities, expires_at) |
| `sessions` | Session web Laravel (FK user, index last_activity) |
| `password_reset_tokens` | Reset password |
| `cache` / `cache_locks` | Cache database |

### Relasi Antar Tabel

- `divisions 1 ──── * employees` (divisi dihapus → karyawan `divisi_id` jadi NULL)
- `employees 1 ──── * attendance` (karyawan dihapus → absensinya ikut terhapus)
- `users 1 ──── * attendance` (kolom `input_by`)
- `users 1 ──── * audit_logs`
- `schedules` = single row, tidak berelasi

---

## API Reference

Semua respons memakai format konsisten:

```json
// sukses
{ "success": true, "message": "Berhasil", "data": ... }

// gagal
{ "success": false, "message": "Pesan error", "errors": { "field": ["..."] } }
```

### Public (tanpa auth)

| Method | Endpoint | Fungsi | Middleware |
|---|---|---|---|
| POST | `/api/absensi` | Tap RFID dari ESP32 (body `{uid}`) | `X-API-Key` + throttle 60/menit |
| POST | `/api/login` | Login admin → token Sanctum | throttle 5/menit |
| GET | `/api/absensi/stream` | SSE realtime (`?token=...&lastId=...`) | token via query |

### Protected (`auth:sanctum`)

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/logout` | Logout (hapus token aktif) |
| GET | `/api/user` | Data user login |
| POST | `/api/change-password` | Ganti password (throttle 3/menit) |
| GET | `/api/dashboard` | Statistik hari ini |
| GET | `/api/dashboard/terlambat` | Detail karyawan terlambat |
| GET | `/api/dashboard/hadir` | Detail karyawan hadir |
| GET | `/api/dashboard/tidak-hadir` | Detail karyawan tidak hadir |
| GET | `/api/search?q=` | Global search (karyawan + divisi, min 2 char) |
| GET/POST | `/api/karyawan` | List / tambah karyawan |
| GET/PUT/DELETE | `/api/karyawan/{id}` | Detail / update / hapus (delete: `role:superadmin`) |
| GET | `/api/karyawan/{id}/absensi` | Riwayat absensi + summary (filter `dari`/`sampai`) |
| GET/POST | `/api/divisi` | List / tambah divisi |
| GET/PUT/DELETE | `/api/divisi/{id}` | Detail / update / hapus (delete: `role:superadmin`) |
| GET/PUT | `/api/jadwal` | Ambil / update jam kerja standar |
| GET | `/api/absensi` | Absensi per karyawan + tanggal (wajib) |
| POST | `/api/absensi/manual` | Input absensi manual (cek duplikat) |
| PUT/PATCH/DELETE | `/api/absensi/{id}` | Update / hapus absensi (role admin, superadmin) |
| GET | `/api/laporan?dari=&sampai=` | Laporan rentang tanggal (filter divisi/status/search) |
| GET | `/api/laporan/export?format=xlsx\|csv` | Export laporan (blob download) |
| POST | `/api/ai/chat` | AI chat (SSE stream teks) |

Dokumentasi API lengkap: [`backend/API_DOCUMENTATION.md`](backend/API_DOCUMENTATION.md)

---

## Realtime (Server-Sent Events)

1. **ESP32** tap kartu → `AbsensiService` simpan record + menulis ke tabel `realtime_events`
2. **Dashboard** membuka `EventSource` ke `GET /api/absensi/stream?token=...&lastId=...`
   - Token Sanctum dikirim via query string karena `EventSource` tidak bisa mengirim header
   - `lastId` = id event terakhir yang sudah diterima (resume dari tengah)
3. **SseController** mem-poll tabel `realtime_events` tiap 1 detik dalam jendela **10 detik** (agar worker tidak menggantung), mengirim event `check_in` / `checkout` + keepalive
4. **Frontend** auto-reconnect tiap 3 detik jika koneksi gagal, menampung maks 20 event, lalu menggabungkannya ke statistik & tabel tanpa reload

Event lama (>24 jam) dibersihkan otomatis tiap jam.

---

## AI Chat Assistant

Widget chat floating (pojok kanan bawah) untuk bertanya seputar data absensi, contoh: *"Berapa karyawan yang tidak hadir hari ini?"*

**Alur:**

```
Frontend (useChat) ──POST /api/ai/chat──► AiController
        ▲                                  │
        │         stream TextDelta         ▼
        ◄─────────────────────────── AttendanceAgent (laravel/ai)
                                         │ tools()
                                         ▼
                                    QueryDatabaseTool
                                    ├─ SELECT-only (read-only)
                                    ├─ Blocklist SQL berbahaya
                                    └─ Auto LIMIT 100
                                         │
                                         ▼
                                      MySQL
```

- **System prompt** (Bahasa Indonesia): wajib menjawab dari tool `query_database` saja, tidak menebak, tolak pertanyaan di luar topik absensi, format tanpa markdown
- **Provider**: openai-compatible (default endpoint Gemini `generativelanguage.googleapis.com`, model `gemini-2.0-flash`) — bisa diganti lewat env `OPENAI_COMPATIBLE_*`
- **Keamanan tool**: komentar SQL dibuang, harus diawali `SELECT`, blokir `UPDATE/DELETE/INSERT/ALTER/DROP` dll, blokir `INTO OUTFILE`, `LOAD_FILE`, `SLEEP`, `BENCHMARK`, `INFORMATION_SCHEMA`; otomatis tambah `LIMIT 100`

---

## Keamanan

| Lapisan | Implementasi |
|---|---|
| Auth Admin | Sanctum personal access token (expires 1440 menit), auto-logout FE saat 401 |
| Auth Device | `X-API-Key` header, dicek dengan `hash_equals` (constant-time), multi-key untuk rotasi (`php artisan api:generate-key --rotate`) |
| Role | Middleware `CheckRole` — delete data & update absensi dibatasi admin/superadmin |
| Rate Limiting | Login 5/menit, change-password 3/menit, API device 60/menit |
| Audit Trail | Semua mutasi admin dicatat di `audit_logs` (old/new values, IP, user-agent) |
| SQL Injection | Eloquent query builder + guard `QueryDatabaseTool` |
| CSV Injection | `sanitizeCsvCell` anti formula (`=`, `+`, `-`, `@`, tab) pada export CSV |
| Validasi | Form Request + error 422 terstruktur; aturan `no_checkout_statuses` (Alpha/Izin/Sakit tidak boleh checkout) |
| Race Condition | `DB::transaction` + `lockForUpdate` pada proses tap RFID |
| Response Error | Exception handler global JSON (404/422/401/500) — tidak bocorkan detail di production |

---

## Setup & Menjalankan Project

### Prasyarat

- PHP ≥ 8.3 + Composer
- MySQL
- Node.js ≥ 20 + npm
- PlatformIO (untuk firmware) — opsional jika hanya develop web
- ESP32 + RC522 + LCD 16x2 + buzzer (untuk hardware)

### 1. Backend (Laravel)

```bash
cd backend
cp .env.example .env          # isi DB_DATABASE, API_KEY, OPENAI_COMPATIBLE_*
composer install
php artisan key:generate
php artisan migrate --seed    # buat tabel + data demo
php artisan api:generate-key  # generate API key untuk ESP32
php artisan serve             # http://localhost:8000
```

Atau sekali jalan: `composer setup`

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Tanpa backend: jalankan mock server dulu di terminal lain:

```bash
cd frontend
node mock-server.cjs          # http://localhost:8000 (API mock)
```

`.env.development` berisi `VITE_API_URL=http://127.0.0.1:8000/api` — ganti sesuai URL backend.

### 3. Firmware (ESP32)

```bash
cd firmware
cp include/config.example.h include/config.h
# edit config.h: WIFI_SSID, WIFI_PASSWORD, API_BASE_URL, API_KEY
pio run --target upload
```

Konfigurasi penting (`include/config.h`):
- Pin RC522 (SPI): SS=GPIO5, RST=GPIO4 (SCK 18, MOSI 23, MISO 19)
- Pin LCD I2C: SDA=21, SCL=22, alamat 0x27 (fallback 0x3F)
- Pin Buzzer: GPIO15
- `OFFLINE_MODE=true` → testing hardware tanpa server (hanya tampilkan UID)

---

## Akun Demo & Data Seed

| Jenis | Nilai |
|---|---|
| Superadmin | `admin@example.com` / `Admin@123` (bisa diubah via env `ADMIN_PASSWORD`) |
| Login mock server | `admin@example.com` / `password` |
| Divisi (5) | HRD, IT, Marketing, Finance, Operations |
| Jadwal kerja | Masuk 08:00, Pulang 17:00, Toleransi 15 menit |
| Karyawan (6) | 5 aktif (RFID001–RFID005) + 1 nonaktif (RFID006) |

---

## Testing

```bash
cd backend
composer test
```

| Test Suite | Cakupan |
|---|---|
| `AuthTest` | login sukses/gagal, logout, change-password, proteksi `/api/user` |
| `AbsensiDeviceTest` | tap RFID (sukses, API key salah, kartu tidak dikenal, karyawan nonaktif) |
| `AiChatTest` | auth wajib, validasi messages, streaming dengan agent fake |
| `DashboardTest` | struktur statistik + nilai nol saat kosong |
| `KaryawanTest` | CRUD, search, filter divisi, role check |
| `DivisiTest` | CRUD, duplikat nama, hapus divisi berisi karyawan |
| `JadwalTest` | ambil/update + validasi format jam |
| `LaporanTest` | filter wajib, export xlsx/csv |
| `GlobalSearchTest` | min 2 char, hasil karyawan+divisi |

---

## Struktur Branch

| Branch | Deskripsi |
|---|---|
| `main` | Branch default — base project (setup awal, CORS + Sanctum, mockup UI) |
| `develop` | Integrasi FE + BE lama; restruktur frontend ke folder `frontend/` |
| `be` | Backend Laravel (sebelum AI) — flat-array response fix, CORS LAN + serve.sh |
| `fe` | Frontend React lama (sebelum modern stack) — restruktur folder, bug fixes |
| `hardware` | Firmware ESP32 — RFID, LCD, buzzer, fault-tolerant + heartbeat |
| `feature/ai-assistant` | **Branch utama pengembangan** — backend + frontend modern stack + AI chat (aktif saat ini) |
| `feature/ai-assistant-be` | Backend AI — AiController, AttendanceAgent, QueryDatabaseTool, SSE |
| `feature/ai-assistant-fe` | Frontend AI widget + modern stack (Tailwind/shadcn, TanStack, Zod+RHF) |

---

## Dokumentasi Tambahan

- [Backend API Documentation](backend/API_DOCUMENTATION.md) — detail seluruh endpoint + contoh request/response
- [Database Setup](backend/DB_SETUP.md) — panduan setup MySQL
- [Dokumentasi Backend](backend/DOKUMENTASI_BACKEND.md)
- [Dokumentasi Frontend](docs/Dokumentasi_Frontend_Absensi_IoT.docx)
- [Laporan PKL (BAB 1–7)](backend/docs_laporan_pkl/) — dokumen .docx
- Diagram: [DFD Level 0 & 1](docs/dfd/), [ERD](docs/erd/), [Use Case](docs/usecase/), [UI Mockup](docs/ui-mockup/)
