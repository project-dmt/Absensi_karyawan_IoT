# Sistem Absensi Karyawan Berbasis IoT (RFID)

Project PKL (Praktik Kerja Lapangan) — Sistem absensi otomatis menggunakan kartu RFID yang terhubung ke panel admin berbasis web.

## Gambaran Umum

Sistem ini memungkinkan karyawan melakukan absensi dengan cara **tap kartu RFID** ke alat pembaca yang terhubung ke mikrokontroler ESP32. Data yang terbaca dikirim melalui jaringan WiFi ke server backend, yang kemudian memproses dan menyimpan data absensi ke database. Admin dapat mengelola data karyawan, divisi, jadwal kerja, serta melihat dan mengekspor laporan absensi melalui panel admin berbasis web.

## Komponen Hardware

- **ESP32 DevKit** — Mikrokontroler utama, terhubung ke WiFi
- **RFID Reader RC522** — Membaca UID kartu/tag RFID (komunikasi SPI)
- **LCD 16x2 I2C** — Menampilkan status absensi ke karyawan
- **Buzzer Aktif** — Notifikasi suara (berhasil/gagal absen)
- Dirakit pada **perfboard 5x7**

## Arsitektur Software

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   ESP32     │ HTTP │   Laravel   │ HTTP │   React     │
│  (Firmware) │─────▶│  (Backend)  │◀─────│  (Frontend) │
│  RC522+LCD  │ API  │  REST API   │ API  │    SPA      │
└─────────────┘      └─────────────┘      └─────────────┘
                            │
                      ┌─────┴─────┐
                      │   MySQL   │
                      │ Database  │
                      └───────────┘
```

| Komponen | Tech Stack | Port |
|----------|------------|------|
| Backend | Laravel + Sanctum | 8000 |
| Frontend | React + Vite | 5173 |
| Database | MySQL | 3306 |
| Firmware | Arduino C++ (PlatformIO) | — |

## Struktur Branch

| Branch | Deskripsi | Isi |
|--------|-----------|-----|
| `main` | Dokumentasi & struktur project | `docs/`, README |
| `be` | Backend REST API | `backend/` (Laravel) |
| `fe` | Frontend SPA | `frontend/` (React) |
| `hardware` | Firmware ESP32 | `firmware/` (PlatformIO) |

## Database (5 Tabel Utama)

1. **users** — Akun login admin
2. **divisions** — Data divisi/departemen
3. **employees** — Data karyawan + UID kartu RFID
4. **schedules** — Jam kerja & toleransi keterlambatan
5. **attendance** — Riwayat absensi harian

## Alur Komunikasi

### ESP32 → Backend (Absensi Otomatis)
1. Karyawan tap kartu RFID ke alat
2. ESP32 membaca UID, kirim HTTP POST ke `/api/attendance` (dengan API Key)
3. Backend validasi UID, tentukan status (Hadir/Terlambat), simpan ke DB
4. Backend kirim response (nama + status)
5. ESP32 tampilkan di LCD + buzzer

### React → Backend (Admin Panel)
1. Admin login ke panel web
2. Setiap request menggunakan token autentikasi (Sanctum)
3. CRUD data karyawan, divisi, jadwal, laporan

## Cara Install

### Backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Edit .env (konfigurasi MySQL)
php artisan migrate
php artisan serve
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Firmware
- Buka folder `firmware/` di PlatformIO IDE
- Edit konfigurasi WiFi & API Key
- Upload ke ESP32

## Dokumentasi

Dokumentasi lengkap ada di folder `docs/`:
- ERD (Entity Relationship Diagram)
- DFD Level 0 & Level 1
- Use Case Diagram
- UI Mockup / Wireframe

## License

MIT
