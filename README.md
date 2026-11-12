# Sistem Absensi Karyawan IoT RFID

![Laravel](https://img.shields.io/badge/Laravel-13.8-FF2D20?logo=laravel)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![ESP32](https://img.shields.io/badge/ESP32-PlatformIO-1A2B3C?logo=espressif)
![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?logo=php)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql)
![AI](https://img.shields.io/badge/AI-Gemini%202.0--flash%20%7C%20backup%202.5--flash--lite-8E75B2)

Sistem presensi karyawan berbasis **Internet of Things (IoT)** menggunakan kartu **RFID (MFRC522)** pada **ESP32**, dengan backend **Laravel 13**, frontend **React 19** (admin dashboard), dan asisten **AI Chat** streaming untuk bertanya seputar data absensi. Setiap tap kartu RFID otomatis tercatat sebagai absensi (check-in / check-out) dan tampil real-time di dashboard admin via **SSE**.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
  - [Firmware ESP32](#firmware-esp32)
  - [Backend (Laravel API)](#backend-laravel-api)
  - [Frontend (React Admin Dashboard)](#frontend-react-admin-dashboard)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Hardware yang Dibutuhkan](#hardware-yang-dibutuhkan)
  - [Wiring ESP32](#wiring-esp32)
- [Tech Stack](#tech-stack)
- [Struktur Repository](#struktur-repository)
- [Skema Database](#skema-database)
- [API Reference](#api-reference)
- [Realtime (Server-Sent Events)](#realtime-server-sent-events)
- [AI Chat Assistant](#ai-chat-assistant)
- [Keamanan](#keamanan)
- [Setup & Menjalankan Project](#setup--menjalankan-project)
- [Troubleshooting](#troubleshooting)
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
- Notifikasi suara via **buzzer** (check-in 1×, check-out 2×, error 3×)
- **Offline mode** untuk testing hardware tanpa backend
- Auto-reconnect WiFi, debounce kartu (0,5 detik), heartbeat serial (5 detik), fault-tolerant LCD/RFID

### Backend (Laravel API)
- Autentikasi **Sanctum token** (admin) + **API Key** (ESP32, rotasi multi-key)
- Role-based access: `admin` dan `superadmin`
- Absensi otomatis dari ESP32: check-in / check-out dengan aturan toleransi keterlambatan + `lockForUpdate`
- Absensi manual oleh admin (termasuk update status: `Izin`/`Sakit` di tengah hari) + validasi `Sakit`
- Dashboard statistik harian + detail (terlambat / tidak hadir / hadir) + global search
- Laporan absensi rentang tanggal + **export Excel/CSV** (anti formula injection via `PhpSpreadsheet`)
- **SSE (Server-Sent Events)** untuk update real-time dashboard (jendela 10 detik, keepalive, cleanup 24 jam)
- **AI Chat Assistant** dengan SQL read-only tool + **3-layer PromptInjectionGuard** + backup provider failover
- Audit log semua perubahan data, rate limiting, security hardening
- `GET /api/server-time` untuk sinkron jam server (TopbarClock)

### Frontend (React Admin Dashboard)
- Login + session management (auto-logout saat token invalid, `useAuth` ready promise)
- Dashboard dengan stat cards + tabel absensi terbaru real-time (SSE)
- CRUD Karyawan (list, search, detail + riwayat absensi + filter tanggal + `Sakit`)
- CRUD Divisi (list, search, detail + rekap kehadiran per karyawan)
- Pengaturan Jam Kerja (jam masuk/pulang standar + toleransi menit)
- Input Absensi Manual + Update Status Absensi
- Laporan Absensi (filter tanggal/divisi/status/search + export Excel/CSV + edit per record)
- **AI Chat Widget** floating streaming (`@ai-sdk/react` + `TextStreamChatTransport`) + quick questions + sanitize
- **Sidebar** responsif grouped nav + hamburger overlay + TopbarClock server-time (sync 60s)
- Modern stack: Tailwind v4 + shadcn/ui (Nova), TanStack Router & Query, Zod + React Hook Form, code-splitting lazy

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

#### RC522 RFID (SPI) — SISI KANAN
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
> **Perhatian:** RC522 **wajib 3.3V** — jangan 5V (bisa merusak modul). Cek `MFRC522` version di serial monitor jika tidak terbaca.

#### LCD 16x2 I2C — SISI KIRI
```
ESP32          LCD
─────          ───
5V/VIN   →    VCC
GND      →    GND
GPIO 32  →    SDA
GPIO 33  →    SCL
```
> Alamat I2C default `0x27`, fallback `0x3F` (atur di `include/config.h` → `LCD_ADDRESS`). Beberapa modul LCD butuh **5V**, bukan 3.3V — jika tidak menyala coba ganti alamat atau tegangan.

#### Buzzer — SISI KIRI

**Buzzer 2 pin (active):**
```
ESP32          Buzzer
─────          ──────
GPIO 26  →    (+)
GND      →    (-)
```

**Modul buzzer 3 pin (VCC / I/O / GND):**
```
ESP32          Modul Buzzer
─────          ────────────
3.3V/5V  →    VCC
GND      →    GND
GPIO 26  →    I/O (trigger)
```

> Set `BUZZER_ACTIVE_LOW` di `include/config.h`:
> - `1` = modul **low level trigger** (I/O LOW = bunyi) — umum di modul 3 pin murah.
> - `0` = modul **high level trigger** (I/O HIGH = bunyi).
>
> Kalau modul 5V dan pin I/O-nya ikut 5V, jangan langsung ke GPIO26 — pakai level shifter/transistor, atau cek apakah modul mendukung VCC 3.3V.
> Konfigurasi pin terpusat di `firmware/include/config.example.h` (SISI KANAN: SS=GPIO5, RST=GPIO4, SCK=18, MOSI=23, MISO=19 — SISI KIRI: SDA=32, SCL=33, Buzzer=26). [↑ Kembali ke Setup Firmware](#3-firmware-esp32)

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
| Auth API | Laravel Sanctum `^4.3` (personal access token, 1440 menit) |
| AI | `laravel/ai ^0.10.3` (agent + tools + streaming, dual provider) |
| Export Excel/CSV | PhpSpreadsheet `^5.9` |
| Testing | PHPUnit `^12.5` |

### Frontend

| Komponen | Teknologi |
|---|---|
| Framework | React `^19.2` |
| Build Tool | Vite `^8.1` |
| Styling | Tailwind CSS v4 + shadcn/ui (Nova preset) + lucide-react |
| Routing | TanStack Router `^1.170` (code-based, lazy) |
| Data Fetching | TanStack Query `^5.101` (`staleTime 30s`) |
| Form & Validasi | React Hook Form `^7.85` + Zod `^4.4` |
| AI Streaming | AI SDK `^7.0` (`@ai-sdk/react` + `TextStreamChatTransport`) |
| HTTP Client | Axios (interceptor token + auto-logout 401) |

---

## Struktur Repository

```
Absensi_karyawan_IoT/
├── backend/                         # Laravel API
│   ├── app/
│   │   ├── Agents/AttendanceAgent.php      # AI agent (chat absensi, 3-layer guard)
│   │   ├── Console/Commands/GenerateApiKey.php
│   │   ├── Exceptions/ApiException.php
│   │   ├── Http/
│   │   │   ├── Controllers/Api/            # 11 API controllers (Ai, Absensi, Dashboard, Karyawan, Divisi, Jadwal, Laporan, Sse, ServerTime, Auth, GlobalSearch)
│   │   │   ├── Middleware/                 # Authenticate, CheckRole, ValidateApiKey
│   │   │   └── Requests/                   # Form request validation (8 file)
│   │   ├── Models/                         # User, Employee, Division, Schedule, Attendance, AuditLog, RealtimeEvent
│   │   ├── Services/                       # AbsensiService, AuditLogService, RealtimeEventService, PromptInjectionGuard
│   │   └── Tools/QueryDatabaseTool.php     # Tool SQL read-only untuk AI (5 status, LIMIT 100)
│   ├── config/                             # Laravel config + absensi.php + ai.php (dual provider)
│   ├── database/
│   │   ├── migrations/                     # 13 migration (termasuk rfid_scans 2026_09_05)
│   │   ├── factories/                      # Model factories (5)
│   │   └── seeders/DatabaseSeeder.php
│   ├── routes/api.php                      # Seluruh endpoint API (public + sanctum)
│   ├── scripts/patch-laravel-ai.php        # Patch vendor laravel/ai (streaming tool-call)
│   ├── tests/Feature/                      # 9 test suite + tests/Unit/LaravelAiPatchTest
│   ├── API_DOCUMENTATION.md
│   ├── DB_SETUP.md
│   └── docs_dokumentasi/ + docs_laporan_pkl/   # Dokumen .docx (11 + 7 BAB, termasuk 11_Fitur_AI_Chatbot.docx)
│
├── frontend/                        # React SPA
│   ├── src/
│   │   ├── api/axios.js             # Axios instance + interceptors
│   │   ├── api/queries.js           # Query/mutation hooks + normalizeList
│   │   ├── components/              # Sidebar, TopbarClock, AiChatWidget, MessageBubble, TypingIndicator, + ui/shadcn (15)
│   │   ├── hooks/useAuth.js         # Auth state (ready promise + /user verify)
│   │   ├── hooks/useRealtime.js     # SSE EventSource ?token&lastId
│   │   ├── layouts/AdminLayout.jsx  # Sidebar + topbar + konten (hamburger overlay)
│   │   ├── pages/                   # 14 halaman (Dashboard, DetailDashboard, DataKaryawan, DetailKaryawan, DataDivisi, DetailDivisi, JamKerja, InputAbsensiManual, LaporanAbsensi, LiveMonitoring, SemuaAbsensi, PerangkatIoT, PengaturanSistem, Login)
│   │   ├── providers/QueryProvider.jsx
│   │   ├── schemas.js               # Zod schemas (Sakit, dll)
│   │   └── router.jsx               # TanStack Router + lazy loading
│   ├── mock-server.cjs              # Express mock API (port 8000)
│   ├── components.json              # shadcn Nova
│   └── vite.config.js
│
├── firmware/                        # ESP32 PlatformIO project
│   ├── platformio.ini               # esp32dev, 115200, ttyUSB0, ArduinoJson, MFRC522, LiquidCrystal_I2C
│   ├── include/config.example.h     # Template config (pin, timing, fallback API)
│   └── src/main.cpp                 # Firmware utama (~717 baris, beep, LCD, WiFi, HTTP POST)
│
├── docs/                            # Diagram & dokumentasi
│   ├── dfd/                         # DFD Level 0 & 1 (.puml + .png)
│   ├── erd/                         # ERD (gambar)
│   ├── usecase/                     # Use case diagram
│   └── ui-mockup/                   # Mockup UI (.pdf + .drawio, 8 file)
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

<details>
<summary>Detail tabel (klik untuk buka)</summary>

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

</details>

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
| POST | `/api/rfid/announce` | **Legacy** — firmware lama saja; versi sekarang gabung ke `/api/absensi` | `X-API-Key` + throttle 60/menit |
| POST | `/api/login` | Login admin → token Sanctum | throttle 5/menit |
| GET | `/api/server-time` | Jam server `Asia/Jakarta` untuk TopbarClock | public |
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
| GET/POST | `/api/karyawan` | List (paginate, `per_page` max 500) / tambah karyawan |
| GET/PUT/DELETE | `/api/karyawan/{id}` | Detail / update / hapus (delete: `role:superadmin`) |
| GET | `/api/karyawan/{id}/absensi` | Riwayat absensi + summary (filter `dari`/`sampai`, `per_page`) |
| POST | `/api/rfid/register` | Mulai sesi scan kartu (dipakai form karyawan) |
| GET | `/api/rfid/register/{token}` | Cek status sesi scan (polling dari frontend) |
| GET/POST | `/api/divisi` | List / tambah divisi |
| GET/PUT/DELETE | `/api/divisi/{id}` | Detail / update / hapus (delete: `role:superadmin`) |
| GET/PUT | `/api/jadwal` | Ambil / update jam kerja standar |
| GET | `/api/absensi` | Absensi per karyawan + tanggal (wajib) |
| POST | `/api/absensi/manual` | Input absensi manual (cek duplikat) |
| PUT/PATCH/DELETE | `/api/absensi/{id}` | Update / hapus absensi (role admin, superadmin) |
| GET | `/api/laporan?dari=&sampai=` | Laporan rentang tanggal (paginate, filter divisi/status/search) |
| GET | `/api/laporan/export?format=xlsx\|csv` | Export laporan (blob download, tidak terpengaruh paginate) |
| POST | `/api/ai/chat` | AI chat (SSE stream teks, auth Sanctum) |

Dokumentasi API lengkap: [`backend/API_DOCUMENTATION.md`](backend/API_DOCUMENTATION.md)

---

## Realtime (Server-Sent Events)

1. **ESP32** tap kartu → `AbsensiService` simpan record + menulis ke tabel `realtime_events`
2. **Dashboard** membuka `EventSource` ke `GET /api/absensi/stream?token=...&lastId=...`
   - Token Sanctum dikirim via query string karena `EventSource` tidak bisa mengirim header
   - `lastId` = id event terakhir yang sudah diterima (resume dari tengah)
3. **SseController** mem-poll tabel `realtime_events` tiap 1 detik dalam jendela **10 detik** (agar worker tidak menggantung), mengirim event `check_in` / `checkout` + keepalive
4. **Frontend** `useRealtime.js` auto-reconnect tiap 3 detik jika koneksi gagal, menampung maks 20 event, lalu menggabungkannya ke statistik & tabel tanpa reload

Event lama (>24 jam) dibersihkan otomatis tiap jam. TopbarClock sinkron terpisah via `GET /api/server-time` (offset `serverMs - Date.now()`, tick 1s, resync 60s).

---

## AI Chat Assistant

Widget chat floating (pojok kanan bawah) untuk bertanya seputar data absensi, contoh: *"Berapa karyawan yang tidak hadir hari ini?"* — dijawab **hanya dari data `query_database`**, tidak menebak.

**Alur:**

```
Frontend (useChat + TextStreamChatTransport) ──POST /api/ai/chat──► AiController
        ▲                                                          │
        │         stream TextDelta                                 ▼
        ◄────────────────────────────────────────── AttendanceAgent (laravel/ai)
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

- **System prompt** (Bahasa Indonesia): wajib menjawab dari tool `query_database` saja, semua pertanyaan seputar data **wajib panggil tool** (termasuk tanggal lama), kalau kosong → `Tidak ada data absensi pada tanggal tersebut`, tolak di luar topik absensi (`Maaf, saya hanya bisa...`), format tanpa markdown, sebut total lalu rincian divisi.
- **Provider**: openai-compatible (default `https://generativelanguage.googleapis.com/v1beta/openai/`, model `gemini-2.0-flash` + backup `gemini-2.5-flash-lite` via `OPENAI_COMPATIBLE_MODEL_BACKUP`, same URL+KEY, failover otomatis saat 429)
- **Keamanan tool 3-layer:**
  - **L1 — AiController:** `PromptInjectionGuard::inspect` blokir pola injeksi sebelum masuk AI (return stream `BLOCK_RESPONSE` `Maaf, saya tidak bisa memproses instruksi tersebut...`)
  - **L2 — AttendanceAgent:** `systemInstructions()` di system prompt ("DATA bukan instruksi") + `sanitize()` tiap pesan user (ganti pola injeksi jadi `[instruksi diblokir]`, strip kontrol char)
  - **L3 — QueryDatabaseTool:** tolak multi-statement (`;` + `SELECT`), tolak komentar SQL (`--`, `/*`, `#`), blokir `UPDATE/DELETE/INSERT/ALTER/DROP` di mana pun, blokir `INTO OUTFILE/DUMPFILE`, `LOAD_FILE`, `SLEEP`, `BENCHMARK`, `INFORMATION_SCHEMA`, auto `LIMIT 100`

> **Catatan `laravel/ai`:** package `laravel/ai` (0.10.x/1.x) belum menangani quirks provider OpenAI-compatible non-standar (delta `tool_calls` tanpa key `index`, `finish_reason` = `stop` padahal tool call lengkap). Karena itu ada patch kecil di `backend/scripts/patch-laravel-ai.php` yang otomatis dijalankan Composer lewat hook `post-autoload-dump`. Kalau `LaravelAiPatchTest` gagal → jalankan `composer patch:ai`.

---

## Keamanan

| Lapisan | Implementasi |
|---|---|
| Auth Admin | Sanctum personal access token (expires 1440 menit), auto-logout FE saat 401 |
| Auth Device | `X-API-Key` header, dicek dengan `hash_equals` (constant-time), multi-key untuk rotasi (`php artisan api:generate-key --rotate`) |
| Role | Middleware `CheckRole` — delete data & update absensi dibatasi admin/superadmin |
| Rate Limiting | Login 5/menit, change-password 3/menit, API device 60/menit |
| Audit Trail | Semua mutasi admin dicatat di `audit_logs` (old/new values, IP, user-agent) |
| SQL Injection | Eloquent query builder + guard `QueryDatabaseTool` (SELECT-only, blocklist) |
| Prompt Injection | 3-layer `PromptInjectionGuard` (22 pola ID+EN, MAX 2000, strip kontrol char) |
| CSV Injection | `sanitizeCsvCell` anti formula (`=`, `+`, `-`, `@`, tab) pada export CSV |
| Validasi | Form Request + error 422 terstruktur; aturan `no_checkout_statuses` (`Alpha`/`Izin`/`Sakit` tidak boleh checkout) |
| Race Condition | `DB::transaction` + `lockForUpdate` pada proses tap RFID |
| Response Error | Exception handler global JSON (404/422/401/500) — tidak bocorkan detail di production |

---

## Setup & Menjalankan Project

### Prasyarat

- PHP ≥ 8.3 + Composer
- MySQL (database `absensi_iot`, timezone `Asia/Jakarta`)
- Node.js ≥ 20 + npm
- PlatformIO (untuk firmware) — opsional jika hanya develop web
- ESP32 + RC522 + LCD 16x2 + buzzer (untuk hardware — lihat [Hardware yang Dibutuhkan](#hardware-yang-dibutuhkan))

### 1. Backend (Laravel)

```bash
cd backend
cp .env.example .env          # isi DB_DATABASE, API_KEY, OPENAI_COMPATIBLE_*
composer install               # hook post-autoload-dump otomatis patch vendor laravel/ai
php artisan key:generate
php artisan migrate --seed    # buat tabel + data demo
php artisan api:generate-key  # generate API key untuk ESP32 (isi API_KEY)
php artisan serve             # http://localhost:8000 (pakai -d max_execution_time=0 untuk AI streaming)
```

> Kalau AI chat streaming error saat memakai tool database → jalankan `composer patch:ai`.

Atau sekali jalan: `composer setup`

Env penting (`backend/.env.example`):
```
APP_URL=http://localhost:8000
DB_DATABASE=absensi_iot
API_KEY=your-esp32-api-key-here (bisa comma-separated untuk rotasi)
OPENAI_COMPATIBLE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OPENAI_COMPATIBLE_API_KEY=... (dari aistudio.google.com)
OPENAI_COMPATIBLE_MODEL=gemini-2.0-flash
OPENAI_COMPATIBLE_MODEL_BACKUP=gemini-2.5-flash-lite
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:8000/api
```

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

`.env.development` berisi `VITE_API_URL=http://127.0.0.1:8000/api` — ganti ke `http://192.168.x.x:8000/api` untuk LAN.

### 3. Firmware (ESP32)

```bash
cd firmware
cp include/config.example.h include/config.h
# opsional: isi FALLBACK_API_BASE_URL + FALLBACK_API_KEY di config.h
#           (kalau kosong, wajib konfigurasi lewat captive portal)
pio run --target upload
pio device monitor
```

**WiFi & server tidak ada di `config.h`.** Konfigurasi device dilakukan lewat web:

1. Sambungkan HP/laptop ke Access Point **`AbsensiRFID-Config`** (membuat AP `AbsensiRFID-Config`).
2. Buka `http://192.168.4.1` → isi **SSID WiFi**, **password**, **URL server** (`http://192.168.x.x:8000`), dan **API Key** → Save.
3. ESP32 restart, konek ke WiFi asli, lalu POST ke backend.

Alternatif (tanpa HP): dari halaman **Perangkat IoT** di web admin, isi IP ESP32 → kirim konfigurasi via listener LAN (port 8080).

Reset konfigurasi: **tahan tombol BOOT (GPIO0) 5 detik** → config dihapus & portal terbuka lagi.

Konfigurasi penting (`include/config.h` — lihat [Wiring ESP32](#wiring-esp32) untuk pin):
- `OFFLINE_MODE` — `false` = online (butuh backend), `true` = testing hardware tanpa server (cuma tampilkan UID di LCD/Serial)
- `FALLBACK_API_BASE_URL` / `FALLBACK_API_KEY` — fallback kalau device belum pernah diset via portal (biarkan `""` untuk wajib setup lewat portal)
- Pin: SISI KANAN: SS=GPIO5, RST=GPIO4, SCK=18, MOSI=23, MISO=19 — SISI KIRI: SDA=32, SCL=33, alamat LCD `0x27` (fallback `0x3F`), Buzzer GPIO26
- Timeout: WIFI 15s, HTTP 5s, DISPLAY 1s, DEBOUNCE 0,5s, RECONNECT 5s, PORTAL_AUTO 180s

---

## Troubleshooting

### LCD tidak menyala
- Cek wiring SDA/SCL (GPIO32 → SDA, GPIO33 → SCL)
- Coba ganti `LCD_ADDRESS` di `config.h` dari `0x27` ke `0x3F`
- Cek voltage (beberapa modul LCD butuh **5V/VIN → VCC**, bukan 3.3V)

### RFID tidak terbaca
- Cek wiring SPI (SS=GPIO5, SCK=18, MOSI=23, MISO=19, RST=GPIO4)
- Pastikan **3.3V** (jangan 5V, bisa merusak RC522)
- Cek MFRC522 version di serial monitor (`pio device monitor`)

### ESP32 gagal koneksi backend
- Cek **URL server** yang tersimpan di device (port 8000, IP LAN — **bukan** `localhost`). Lihat di serial monitor: `[CFG]` / `[HTTP]`
- Kalau device belum pernah diset: buka portal `http://192.168.4.1` (AP `AbsensiRFID-Config`) lalu isi lagi
- Reset paksa: tahan **BOOT (GPIO0) 5 detik** → config dihapus, portal kebuka
- Pastikan backend sudah running (`php artisan serve` atau `backend/serve.sh` / `backend/serve-multi.sh`)
- Pastikan ESP32 dan server di network yang sama (WiFi sama, firewall tidak blokir 8000)
- Cek **API Key** device sama dengan `API_KEY` di `backend/.env` (generate: `php artisan api:generate-key`)
- Listener LAN (port 8080) buat kirim config dari web admin — pastikan port 8080 tidak diblokir firewall

### Checkout ditolak
- Backend mencegah checkout sebelum jam pulang standar — cek jam kerja di tabel `schedules` (`jam_pulang_standar` default 17:00)
- Status `Alpha`, `Izin`, dan `Sakit` tidak bisa checkout (validasi `no_checkout_statuses`)
- Cek `toleransi_menit` (default 15) untuk status `Terlambat`

---

## Akun Demo & Data Seed

| Jenis | Nilai |
|---|---|
| Superadmin | `admin@example.com` / `Admin@123` (env `ADMIN_PASSWORD`) |
| Login mock server | `admin@example.com` / `password` |
| Divisi (5) | HRD, IT, Marketing, Finance, Operations |
| Jadwal kerja | Masuk 08:00, Pulang 17:00, Toleransi 15 menit |
| Karyawan (6) | 5 aktif (RFID001–RFID005) + 1 nonaktif (RFID006) — NIP & UID unik |

---

## Testing

```bash
cd backend
composer test          # atau: php artisan test
# dari root repo: php backend/artisan test
```

> Status saat ini: **62 test, 61 lolos, 1 di-skip** (test `lock` butuh MySQL sungguhan — DB lokal tidak jalan). Semua test lain jalan di SQLite in-memory.

| Test Suite | Cakupan |
|---|---|
| `AuthTest` | login sukses/gagal, logout, change-password, proteksi `/api/user` |
| `AbsensiDeviceTest` | tap RFID (sukses, API key salah, kartu tidak dikenal, karyawan nonaktif, UID case-insensitive, mode registrasi kartu, lock) |
| `AiChatTest` | auth wajib, validasi messages, streaming dengan agent fake (`Ai::fakeAgent`) |
| `DashboardTest` | struktur statistik + nilai nol saat kosong |
| `KaryawanTest` | CRUD, search, filter divisi, role check, paginasi |
| `DivisiTest` | CRUD, duplikat nama, hapus divisi berisi karyawan |
| `JadwalTest` | ambil/update + validasi format jam |
| `LaporanTest` | filter wajib (`dari`/`sampai`), paginasi, export xlsx/csv (tanpa formula injection) |
| `GlobalSearchTest` | min 2 char, hasil karyawan+divisi |
| `LaravelAiPatchTest` (Unit) | memastikan patch vendor `laravel/ai` untuk streaming tool-call masih terpasang |

> Kalau `LaravelAiPatchTest` gagal → jalankan `composer patch:ai` (atau `composer install`).
> Detail alasannya ada di `backend/scripts/patch-laravel-ai.php`.

Mock server frontend: `node mock-server.cjs` → login `admin@example.com` / `password`.

---

## Struktur Branch

| Branch | Deskripsi |
|---|---|
| `main` | Branch default — base project (setup awal) — **tidak stale setelah PR #21** |
| `develop` | **Branch integrasi utama** — full monorepo (backend+frontend+firmware+docs) + AI lengkap (67e576a, 77 commit di depan main sebelum PR #21, sekarang sinkron) |
| `dev` | **Branch kerja aktif (HEAD)** — 1 commit di depan `develop`: sinkronisasi backend + frontend + hardware (`001de457`) |
| `backend` | **Baru Opsi A** — dari `develop` 67e576a, full 6 folder, **hanya ubah `backend/`** → PR CLEAN ke `develop` |
| `frontend` | **Baru Opsi A** — dari `develop` 67e576a, full 6 folder, **hanya ubah `frontend/`** → PR CLEAN |
| `be` | Lama orphan (cuma `backend/`, 22 commit) — **dibiarin arsip**, jangan dipakai baru |
| `fe` | Lama orphan (cuma `frontend/`) — dibiarin arsip |
| `hardware` | Firmware ESP32 — 4 commit orphan, sudah merge ke `develop` via `a935a1f` (firmware diff 0) — nanti `firmware/*` baru dari `develop` |
| `feature/ai-assistant` | Branch utama pengembangan AI — sudah **MERGED ke `develop` via PR #21** (7dd672d) |
| `feature/ai-assistant-be` / `feature/ai-assistant-fe` | Sub-branch AI lama (sudah merge via PR #20/#19) — arsip |

> **Aturan baru (Opsi A):** semua branch fitur baru **wajib** `git checkout -b fiturBaru origin/develop` (atau `origin/dev` untuk lanjutan sinkronisasi hardware) — biar `merge-base` ketemu & PR CLEAN. `be`/`fe` lama jangan dipakai.

---

## Dokumentasi Tambahan

- [Backend API Documentation](backend/API_DOCUMENTATION.md) — detail seluruh endpoint + contoh request/response
- [Database Setup](backend/DB_SETUP.md) — panduan setup MySQL
- [Dokumentasi Backend](backend/DOKUMENTASI_BACKEND.md)
- [Dokumentasi Frontend](docs/Dokumentasi_Frontend_Absensi_IoT.docx)
- [Fitur AI Chatbot](backend/docs_dokumentasi/11_Fitur_AI_Chatbot.docx) — guard 3-layer + backup provider
- [Laporan PKL (BAB 1–7)](backend/docs_laporan_pkl/) — dokumen .docx
- Diagram: [DFD Level 0 & 1](docs/dfd/), [ERD](docs/erd/), [Use Case](docs/usecase/), [UI Mockup](docs/ui-mockup/ — 8 PDF + drawio)

