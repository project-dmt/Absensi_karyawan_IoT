# Frontend — Sistem Absensi Karyawan IoT (RFID)

Panel admin berbasis web untuk mengelola sistem absensi karyawan berbasis IoT/RFID.

## Tech Stack

- React 19 + Vite 8
- React Router DOM 7 (SPA routing)
- Bootstrap 5 + Bootstrap Icons
- Axios (HTTP client)

## Fitur

- **Login** — Autentikasi admin via email + password (Laravel Sanctum)
- **Dashboard** — Ringkasan absensi hari ini (total karyawan, hadir, terlambat, tidak hadir)
- **Data Karyawan** — CRUD data karyawan + search dengan debounce
- **Data Divisi** — CRUD divisi/departemen + search dengan debounce
- **Jam Kerja** — Atur jam masuk, jam pulang, toleransi keterlambatan
- **Absensi Manual** — Input absensi untuk karyawan yang tidak bisa tap RFID
- **Laporan Absensi** — Filter tanggal/divisi + export PDF/Excel

## Cara Install

```bash
npm install
cp .env .env.local  # optional, sesuaikan VITE_API_URL
npm run dev
```

## Struktur

```
src/
  api/          # Axios instance + interceptors
  components/   # Komponen reusable (StatusBadge, Modal, FormInput, dll)
  hooks/        # Custom hooks (useAuth, useDebounce)
  layouts/      # AdminLayout (sidebar + topbar)
  pages/        # Halaman-halaman aplikasi
```

## Backend

Frontend ini mengkonsumsi REST API dari branch `be` (Laravel). Pastikan backend berjalan di `http://localhost:8000`.
