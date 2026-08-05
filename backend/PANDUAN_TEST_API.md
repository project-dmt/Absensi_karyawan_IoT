# Panduan Test Manual API - Absensi IoT RFID

> Versi: 1.0
> Backend: Laravel 13
> Base URL: `http://localhost:8000`

---

## Setup

```bash
# 1. Pastikan MySQL jalan
mysql -u root -ppasswordbaru -e "CREATE DATABASE IF NOT EXISTS absensi_iot;"

# 2. Jalankan migrasi + seed
cd /home/fathir/absensi_iot/backend
php artisan migrate:fresh --seed
php artisan config:clear

# 3. Jalankan server
php artisan serve
```

**Default Admin:**
- Email: `admin@example.com`
- Password: `Admin@123`
- Role: `superadmin`

---

## Format Response

Semua endpoint mengembalikan format yang sama:

```json
{
  "success": true,
  "message": "Deskripsi",
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "message": "Deskripsi error",
  "errors": {}
}
```

---

## 1. Autentikasi

### Login

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
```

**Response 200:**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {"id": 1, "nama": "Admin", "email": "admin@example.com", "role": "superadmin"},
    "token": "1|abc123..."
  }
}
```

Simpan token untuk endpoint selanjutnya. Ganti `<TOKEN>` di bawah dengan token asli.

### Lihat Profil

```bash
curl http://localhost:8000/api/user \
  -H "Authorization: Bearer <TOKEN>"
```

### Change Password

```bash
curl -X POST http://localhost:8000/api/change-password \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"Admin@123","new_password":"Baru123456","new_password_confirmation":"Baru123456"}'
```

### Logout

```bash
curl -X POST http://localhost:8000/api/logout \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 2. Dashboard

```bash
curl http://localhost:8000/api/dashboard \
  -H "Authorization: Bearer <TOKEN>"
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_karyawan": 10,
    "total_aktif": 8,
    "total_nonaktif": 2,
    "absensi_hari_ini": {"Hadir": 5, "Terlambat": 2, "Alpha": 1, "Izin": 0},
    "karyawan_per_divisi": [{"nama_divisi": "IT", "jumlah": 5}]
  }
}
```

---

## 3. Data Karyawan

### List Karyawan

```bash
# Semua data
curl http://localhost:8000/api/karyawan \
  -H "Authorization: Bearer <TOKEN>"

# Dengan search
curl "http://localhost:8000/api/karyawan?search=budi" \
  -H "Authorization: Bearer <TOKEN>"

# Filter divisi
curl "http://localhost:8000/api/karyawan?divisi_id=1" \
  -H "Authorization: Bearer <TOKEN>"

# Filter status
curl "http://localhost:8000/api/karyawan?status=aktif" \
  -H "Authorization: Bearer <TOKEN>"

# Pagination
curl "http://localhost:8000/api/karyawan?per_page=5&page=1" \
  -H "Authorization: Bearer <TOKEN>"
```

### Create Karyawan

```bash
curl -X POST http://localhost:8000/api/karyawan \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "nama": "Budi Santoso",
    "nip": "NIP123456789012",
    "rfid_uid": "RFID001",
    "divisi_id": 1,
    "jabatan": "Staff",
    "status": "aktif"
  }'
```

**Response 201:**
```json
{
  "success": true,
  "message": "Karyawan berhasil ditambahkan",
  "data": {"id": 3, "nama": "Budi Santoso", ...}
}
```

### Lihat Detail Karyawan

```bash
curl http://localhost:8000/api/karyawan/1 \
  -H "Authorization: Bearer <TOKEN>"
```

### Update Karyawan

```bash
curl -X PUT http://localhost:8000/api/karyawan/1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"nama": "Budi Updated"}'
```

### Hapus Karyawan (butuh role superadmin)

```bash
curl -X DELETE http://localhost:8000/api/karyawan/1 \
  -H "Authorization: Bearer <TOKEN>"
```

**Error 422** - Kalau karyawan masih punya data absensi:
```json
{
  "success": false,
  "message": "Karyawan masih memiliki data absensi, tidak bisa dihapus"
}
```

### Riwayat Absensi Karyawan

```bash
curl http://localhost:8000/api/karyawan/1/absensi \
  -H "Authorization: Bearer <TOKEN>"

# Filter per bulan
curl "http://localhost:8000/api/karyawan/1/absensi?bulan=2026-07" \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 4. Data Divisi

### List Divisi

```bash
curl http://localhost:8000/api/divisi \
  -H "Authorization: Bearer <TOKEN>"
```

### Create Divisi

```bash
curl -X POST http://localhost:8000/api/divisi \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"nama_divisi": "Marketing"}'
```

### Update Divisi

```bash
curl -X PUT http://localhost:8000/api/divisi/1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"nama_divisi": "IT Updated"}'
```

### Hapus Divisi (butuh role superadmin)

```bash
curl -X DELETE http://localhost:8000/api/divisi/1 \
  -H "Authorization: Bearer <TOKEN>"
```

**Error 422** - Kalau divisi masih punya karyawan:
```json
{
  "success": false,
  "message": "Divisi masih memiliki karyawan, tidak bisa dihapus"
}
```

---

## 5. Jadwal Kerja

### Lihat Jadwal

```bash
curl http://localhost:8000/api/jadwal \
  -H "Authorization: Bearer <TOKEN>"
```

### Update Jadwal

```bash
curl -X PUT http://localhost:8000/api/jadwal \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "jam_masuk_standar": "08:00:00",
    "jam_pulang_standar": "17:00:00",
    "toleransi_menit": 15
  }'
```

---

## 6. Absensi (CRUD dari Admin)

### Create Manual

```bash
curl -X POST http://localhost:8000/api/absensi/manual \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "tanggal": "2026-07-22",
    "jam_masuk": "08:30:00",
    "status": "Hadir",
    "keterangan": "Masuk pagi"
  }'
```

### Update Absensi

```bash
curl -X PUT http://localhost:8000/api/absensi/1 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"jam_pulang": "17:30:00"}'
```

### Hapus Absensi (butuh role superadmin)

```bash
curl -X DELETE http://localhost:8000/api/absensi/1 \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 7. Device ESP32 (API Key Auth)

Endpoint ini pakai header `X-API-Key` bukan `Authorization`.

**Default API Key:** `absensi_iot_rfid_2026`

### Checkin (Tap RFID Pertama)

```bash
curl -X POST http://localhost:8000/api/absensi \
  -H "X-API-Key: absensi_iot_rfid_2026" \
  -H "Content-Type: application/json" \
  -d '{"uid": "RFID001"}'
```

**Response 201:**
```json
{
  "success": true,
  "message": "Absensi berhasil",
  "data": {
    "nama": "Budi Santoso",
    "status": "Hadir",
    "jam_masuk": "08:30:00"
  }
}
```

Status otomatis:
- **Hadir** = sebelum jam masuk + toleransi
- **Terlambat** = setelah jam masuk + toleransi

### Checkout (Tap RFID Kedua)

```bash
curl -X POST http://localhost:8000/api/absensi \
  -H "X-API-Key: absensi_iot_rfid_2026" \
  -H "Content-Type: application/json" \
  -d '{"uid": "RFID001"}'
```

**Response 200:**
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

---

## 8. Laporan

### Lihat Laporan

```bash
curl "http://localhost:8000/api/laporan?dari=2026-07-01&sampai=2026-07-31" \
  -H "Authorization: Bearer <TOKEN>"

# Dengan filter divisi
curl "http://localhost:8000/api/laporan?dari=2026-07-01&sampai=2026-07-31&divisi_id=1" \
  -H "Authorization: Bearer <TOKEN>"

# Dengan filter status
curl "http://localhost:8000/api/laporan?dari=2026-07-01&sampai=2026-07-31&status=Hadir" \
  -H "Authorization: Bearer <TOKEN>"

# Dengan search nama/nip
curl "http://localhost:8000/api/laporan?dari=2026-07-01&sampai=2026-07-31&search=budi" \
  -H "Authorization: Bearer <TOKEN>"
```

### Export CSV

```bash
curl "http://localhost:8000/api/laporan/export?dari=2026-07-01&sampai=2026-07-31" \
  -H "Authorization: Bearer <TOKEN>" -o laporan.csv

# Lihat isinya
cat laporan.csv
```

---

## 9. Global Search

```bash
curl "http://localhost:8000/api/search?q=budi" \
  -H "Authorization: Bearer <TOKEN>"
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {"type": "karyawan", "id": 1, "nama": "Budi Santoso", "detail": "NIP123... | IT"},
    {"type": "divisi", "id": 1, "nama_divisi": "Budi Division"}
  ]
}
```

Minimum 2 karakter untuk search.

---

## 10. Test Security

### API Key Salah → 401

```bash
curl -X POST http://localhost:8000/api/absensi \
  -H "X-API-Key: KEY_SALAH" \
  -H "Content-Type: application/json" \
  -d '{"uid": "RFID001"}'
```

### Token Salah → 401

```bash
curl http://localhost:8000/api/user \
  -H "Authorization: Bearer token_palsu"
```

### Tanpa Auth → 401

```bash
curl http://localhost:8000/api/karyawan
```

### Admin Biasa Hapus Karyawan → 403

Buat user admin biasa dulu:
```bash
# Login superadmin, buat admin baru
curl -X POST http://localhost:8000/api/karyawan \
  -H "Authorization: Bearer <TOKEN_SUPERADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"nama":"Admin Biasa","nip":"NIP_ADMIN","rfid_uid":"RFID_ADMIN","divisi_id":1,"status":"aktif"}'

# Login admin biasa (bikin user-nya dulu lewat DB atau API register kalau ada)
# Terus coba delete:
curl -X DELETE http://localhost:8000/api/karyawan/1 \
  -H "Authorization: Bearer <TOKEN_ADMIN_BIASA>"
```

### Hapus Karyawan dengan Absensi → 422

```bash
# Pastikan karyawan 1 punya data absensi dulu, terus coba delete
curl -X DELETE http://localhost:8000/api/karyawan/1 \
  -H "Authorization: Bearer <TOKEN_SUPERADMIN>"
```

### Rate Limiting Login (5x per menit)

```bash
# Jalankan 6x login dengan password salah
for i in {1..6}; do
  curl -s -X POST http://localhost:8000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"salah"}'
  echo ""
done
# Request ke-6 harusnya kena rate limit (429)
```

---

## 11. Generate API Key Baru

```bash
# Generate key baru (ganti semua)
php artisan api:generate-key
php artisan config:clear

# Rotation (tambah key baru, lama masih aktif)
php artisan api:generate-key --rotate
php artisan config:clear
```

---

## Ringkasan Endpoint

| Method | Endpoint | Auth | Role | Deskripsi |
|--------|----------|------|------|-----------|
| POST | `/api/login` | - | - | Login |
| POST | `/api/logout` | Token | - | Logout |
| GET | `/api/user` | Token | - | Profil user |
| POST | `/api/change-password` | Token | - | Ubah password |
| GET | `/api/dashboard` | Token | - | Statistik |
| GET | `/api/search` | Token | - | Global search |
| GET | `/api/karyawan` | Token | - | List karyawan |
| POST | `/api/karyawan` | Token | - | Tambah karyawan |
| GET | `/api/karyawan/{id}` | Token | - | Detail karyawan |
| PUT | `/api/karyawan/{id}` | Token | - | Update karyawan |
| DELETE | `/api/karyawan/{id}` | Token | superadmin | Hapus karyawan |
| GET | `/api/karyawan/{id}/absensi` | Token | - | Riwayat absensi |
| GET | `/api/divisi` | Token | - | List divisi |
| POST | `/api/divisi` | Token | - | Tambah divisi |
| GET | `/api/divisi/{id}` | Token | - | Detail divisi |
| PUT | `/api/divisi/{id}` | Token | - | Update divisi |
| DELETE | `/api/divisi/{id}` | Token | superadmin | Hapus divisi |
| GET | `/api/jadwal` | Token | - | Lihat jadwal |
| PUT | `/api/jadwal` | Token | - | Update jadwal |
| POST | `/api/absensi/manual` | Token | - | Absensi manual |
| PUT | `/api/absensi/{id}` | Token | admin+ | Update absensi |
| DELETE | `/api/absensi/{id}` | Token | superadmin | Hapus absensi |
| POST | `/api/absensi` | API Key | - | Device tap RFID |
| GET | `/api/laporan` | Token | - | Laporan absensi |
| GET | `/api/laporan/export` | Token | - | Export CSV |

**Auth:**
- `Token` = Header `Authorization: Bearer <token>`
- `API Key` = Header `X-API-Key: <key>`

**Role:**
- `admin` = admin atau superadmin
- `superadmin` = hanya superadmin

---

*Last updated: 2026-07-22*
