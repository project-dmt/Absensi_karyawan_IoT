# API Documentation — Sistem Absensi IoT RFID

**Base URL:** `http://localhost:8000/api`

## Autentikasi

| Tipe | Header | Untuk |
|------|--------|-------|
| Bearer Token | `Authorization: Bearer {token}` | Semua endpoint admin |
| API Key | `X-API-Key: {api_key}` | Device ESP32 saja |

Login → `POST /api/login` → simpan `data.token`

## Format Response

```json
{ "success": true/false, "message": "...", "data": {...} }
```
Error validasi:
```json
{ "success": false, "message": "Validasi gagal", "errors": { "field": ["pesan error"] } }
```
Pagination — `data.data[]` + `current_page`, `last_page`, `per_page`, `total`

---

## Auth

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/api/login` | Public | `{email, password}` |
| GET | `/api/user` | Token | — |
| POST | `/api/change-password` | Token | `{old_password, new_password, new_password_confirmation}` |
| POST | `/api/logout` | Token | — |

**Login response:** `{user: {id, nama, email, role}, token: "..."}`

**Roles:** `admin` (CRUD biasa) · `superadmin` (admin + hapus data)

---

## Dashboard

| Method | Endpoint | Auth | Response |
|--------|----------|------|----------|
| GET | `/api/dashboard` | Token | `{total_karyawan, karyawan_aktif, absensi_hari_ini: {total_hadir, hadir, terlambat, izin, alpha}, karyawan_per_divisi: {IT: 15, ...}}` |

---

## Karyawan

| Method | Endpoint | Auth | Body/Query |
|--------|----------|------|------------|
| GET | `/api/karyawan` | Token | Query: `search`, `divisi_id`, `status`, `per_page` (max 100) |
| POST | `/api/karyawan` | Token | `{nama, nip, rfid_uid, divisi_id, status?}` |
| GET | `/api/karyawan/{id}` | Token | — |
| PUT | `/api/karyawan/{id}` | Token | `{nama?, nip?, rfid_uid?, divisi_id?, status?}` |
| DELETE | `/api/karyawan/{id}` | Token + `superadmin` | — |
| GET | `/api/karyawan/{id}/absensi` | Token | Query: `dari`, `sampai`, `per_page` |

**Fields karyawan:**
| Field | Type | Required | Keterangan |
|-------|------|----------|------------|
| `nama` | string | Ya | Max 100 |
| `nip` | string | Ya | Unique, max 50 |
| `rfid_uid` | string | Ya | Unique, max 50 |
| `divisi_id` | integer | Ya | Harus exist di divisions |
| `status` | string | Tidak | `aktif`/`nonaktif` (default: `aktif`) |

**GET list response** — `{data: [{id, nama, nip, rfid_uid, status, division: {id, nama_divisi}, ...}], ...pagination}`

**Hard delete protection:** Karyawan punya data absensi → tidak bisa dihapus

---

## Divisi

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | `/api/divisi` | Token | — |
| POST | `/api/divisi` | Token | `{nama_divisi}` |
| GET | `/api/divisi/{id}` | Token | — |
| PUT | `/api/divisi/{id}` | Token | `{nama_divisi?}` |
| DELETE | `/api/divisi/{id}` | Token + `superadmin` | — |

**GET response** — `[{id, nama_divisi, employees_count, ...}]`
**GET detail** — `{id, nama_divisi, employees: [{id, nama, ...}]}`

**Hard delete protection:** Divisi punya karyawan → tidak bisa dihapus

---

## Jadwal Kerja

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| GET | `/api/jadwal` | Token | — |
| PUT | `/api/jadwal` | Token | `{jam_masuk_standar, jam_pulang_standar, toleransi_menit}` |

**Response** — `{id, jam_masuk_standar: "08:00:00", jam_pulang_standar: "17:00:00", toleransi_menit: 15}`

---

## Absensi Manual (Admin)

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/api/absensi/manual` | Token | `{employee_id, tanggal, status, jam_masuk?, jam_pulang?, keterangan?}` |
| PUT | `/api/absensi/{id}` | Token | `{jam_pulang?, status?, keterangan?}` |
| DELETE | `/api/absensi/{id}` | Token + `superadmin` | — |

**Status:** `Hadir`, `Terlambat`, `Alpha`, `Izin`
**Format:** `tanggal` = `YYYY-MM-DD`, waktu = `HH:MM:SS`

---

## Device ESP32

| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/api/absensi` | API Key | `{uid}` |

**Logic:** Tap pertama = check-in · Tap kedua = check-out

**Response:**
```json
// Check-in
{"success": true, "data": {"nama": "Budi", "status": "Hadir", "jam_masuk": "07:55:30"}}
// Check-out
{"success": true, "data": {"nama": "Budi", "status": "Checkout Berhasil", "jam_pulang": "17:05:00"}}
```

**Error:**
| Kode | Pesan |
|------|-------|
| 404 | Kartu RFID tidak terdaftar |
| 403 | Karyawan tidak aktif |
| 400 | Sudah checkout hari ini |
| 401 | Unauthorized: Invalid API Key |

---

## Laporan

| Method | Endpoint | Auth | Query |
|--------|----------|------|-------|
| GET | `/api/laporan` | Token | `dari` (wajib), `sampai` (wajib), `divisi_id?`, `status?`, `search?`, `per_page?` |
| GET | `/api/laporan/export` | Token | Sama, download CSV |

**Response** — `{data: [{id, tanggal, jam_masuk, jam_pulang, status, keterangan, employee: {...division: {...}}}], ...pagination}`

---

## Global Search

| Method | Endpoint | Auth | Query |
|--------|----------|------|-------|
| GET | `/api/search` | Token | `q` (min 2 char) |

**Response:**
```json
{
  "data": {
    "karyawan": [{type: "karyawan", id: 1, title: "Budi", subtitle: "NIP - Divisi"}],
    "divisi": [{type: "divisi", id: 1, title: "IT", subtitle: "15 karyawan"}],
    "total": 2
  }
}
```

---

## Error Codes

| Kode | Keterangan |
|------|------------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / sudah checkout |
| 401 | Unauthenticated (token expired/salah) |
| 403 | Forbidden (role tidak cukup) |
| 404 | Not Found |
| 422 | Validasi gagal |
| 429 | Rate limit tercapai |
| 500 | Server error |

## Rate Limiting

| Endpoint | Batas |
|----------|-------|
| Login | 5/menit |
| Change password | 3/menit |
| Admin (token) | 60/menit |
| Device ESP32 | 60/menit |

---

## Status Absensi

| Status | Keterangan | Warna UI |
|--------|------------|----------|
| `Hadir` | Tepat waktu | Hijau `#22C55E` |
| `Terlambat` | Melewati toleransi | Kuning `#F59E0B` |
| `Izin` | Izin dari karyawan | Biru `#3B82F6` |
| `Alpha` | Tidak hadir | Merah `#EF4444` |
