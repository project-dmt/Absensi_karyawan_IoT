# Remediasi 10 Temuan Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menutup 10 temuan analisa (keamanan AI, data integritas, hygiene, dokumentasi) dengan diff terkecil yang benar.

**Architecture:** Backend Laravel (fix server-side dulu), lalu frontend React, lalu firmware ESP32, lalu docs. Setiap task punya test/verifikasi sendiri dan di-commit terpisah. Task 1–4 aman & independen; Task 5–7 menyentuh flow SSE/karyawan; Task 8–10 terpisah.

**Tech Stack:** Laravel (PHP ^8.3, Pest/PHPUnit), React 19 + Vite, PlatformIO ESP32.

**Spec:** Temuan 1–10 dari analisa sesi ini (terverifikasi langsung di kode). Laporan PKL — prioritas: benar > lengkap.

## Global Constraints

- Branch kerja: `dev` (atau `fix/audit-remediasi` dari dev).
- Bahasa komentar/pesan: Indonesia (konsisten dengan kode existing).
- Jangan upgrade `laravel/ai` — patch vendor tetap diperlukan (temuan 7).
- Firmware: PlatformIO, hanya `main.cpp` + `AppConfig.h`/`config.example.h`; jangan ubah pin.
- Semua test backend via `php artisan test --filter=...`; frontend verifikasi via `npm run build` + smoke manual.

## Review Focus

1. Prompt AI menyebut tabel `users` → tool harus menolak, bukan mengeksekusi.
2. Payload SQL dengan spasi/newline aneh (`select\t*\nfrom users`) → allowlist tetap kena (regex case-insensitive, whitespace-tolerant).
3. Dashboard dengan karyawan nonaktif → tidak ikut pembilang "Tidak Hadir".
4. Halaman karyawan ke-501+ → fetch semua tak boleh berhenti diam-diam.
5. SSE reconnect → kursor `lastId` tidak mundur, auth via header (bukan query param).

---

## Fase A — Keamanan (prioritas tertinggi)

### Task 1: Allowlist tabel di QueryDatabaseTool (Temuan 1)

**Files:**
- Modify: `backend/app/Tools/QueryDatabaseTool.php` (dalam `assertReadOnly`, sebelum regex DML)
- Test: `backend/tests/Feature/AiChatTest.php` (tambah case) atau test unit baru `tests/Unit/QueryDatabaseToolTest.php`

**Interfaces:**
- Produces: `assertReadOnly(string $sql): string` (signature tetap); behavior baru → `RuntimeException('Tabel tidak diizinkan ...')` untuk tabel di luar allowlist.

- [ ] **Step 1: Write the failing test**

```php
// tests/Unit/QueryDatabaseToolTest.php
it('menolak query ke tabel di luar allowlist', function () {
    $tool = new \App\Tools\QueryDatabaseTool;
    expect(fn () => $tool->handle(['sql' => 'SELECT * FROM users']))
        ->toThrow(RuntimeException::class);
    expect(fn () => $tool->handle(['sql' => "select\tpassword\nfrom users"]))
        ->toThrow(RuntimeException::class);
});

it('menerima query ke tabel absensi', function () {
    $tool = new \App\Tools\QueryDatabaseTool;
    $result = $tool->handle(['sql' => 'SELECT id, nama FROM employees LIMIT 5']);
    expect($result)->toBeString();
});
```

- [ ] **Step 2: Run test — verify fails**

Run: `php artisan test tests/Unit/QueryDatabaseToolTest.php`
Expected: test pertama FAIL (query `users` masih lolos).

- [ ] **Step 3: Implement allowlist**

Di `assertReadOnly`, sebelum blokir DML:

```php
if (! preg_match('/\bFROM\s+(employees|divisions|schedules|attendance|rfid_scans)\b/i', $trimmed)
    && ! preg_match('/\bJOIN\s+(employees|divisions|schedules|attendance|rfid_scans)\b/i', $trimmed)) {
    throw new RuntimeException('Tabel tidak diizinkan. Gunakan: employees, divisions, schedules, attendance, rfid_scans.');
}
```

- [ ] **Step 4: Run test — verify passes**

Run: `php artisan test tests/Unit/QueryDatabaseToolTest.php && php artisan test tests/Feature/AiChatTest.php`
Expected: PASS semua.

- [ ] **Step 5: Commit** — `fix(be): allowlist tabel pada tool SQL AI untuk blokir akses tabel users`

### Task 2: Hapus endpoint & tombol clear-today (Temuan 3)

**Files:**
- Modify: `backend/routes/api.php:93-95` (hapus route)
- Modify: `backend/app/Http/Controllers/Api/AbsensiController.php` (hapus method `clearToday`)
- Modify: `frontend/src/pages/LaporanAbsensi.jsx:236-256` (hapus tombol + handler + state terkait)
- Test: jalankan suite backend; grep pastikan tidak ada pemakaian tersisa

- [ ] **Step 1: Hapus route + method + tombol frontend** (satu pass, grep `clear-today|clearToday` = 0 hasil di seluruh repo)
- [ ] **Step 2: Verify** — Run: `php artisan test` (backend) dan `cd frontend && npm run build`. Expected: PASS, tanpa referensi dangling.
- [ ] **Step 3: Commit** — `fix(be,fe): hapus endpoint testing clear-today dari route dan UI`

## Fase B — Integritas data & UI

### Task 3: Filter karyawan aktif di Dashboard (Temuan 6)

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx` (dalam `stats` useMemo, ~baris 82)

- [ ] **Step 1: Ubah sumber hitung** — total karyawan & pembagi `tidakHadir` hanya dari `karyawan.filter(k => k.status === "aktif")`. Kartu "Total Karyawan" ikut pakai angka aktif (label tetap).
- [ ] **Step 2: Verify** — jalankan dev server, nonaktifkan 1 karyawan via UI, kartu "Tidak Hadir" turun 1 (atau tetap jika karyawan itu punya record). Report screenshot/observasi.
- [ ] **Step 3: Commit** — `fix(fe): hitung tidak-hadir hanya dari karyawan status aktif`

### Task 4: Hapus `queue:listen` dari script dev (Temuan 8)

**Files:**
- Modify: `backend/composer.json:51` (hapus `"php artisan queue:listen ..."` dari script `dev` + sesuaikan nama/flag concurrently)

- [ ] **Step 1: Edit composer.json** — sisa script `dev`: `artisan serve`, `pail`, `vite`.
- [ ] **Step 2: Verify** — `composer run dev` menyala tanpa proses queue; Ctrl+C bersih.
- [ ] **Step 3: Commit** — `chore(be): hapus queue:listen yang tidak terpakai dari script dev`

### Task 5: Fetch semua karyawan tanpa ceiling 500 (Temuan 5)

**Files:**
- Modify: `frontend/src/api/queries.js` (`useKaryawanList` dan pemakaian `per_page: 500` di ~:32,49)

**Interfaces:**
- Produces: helper `fetchAllKaryawan(params)` → Promise<Employee[]>, loop `page=1..` sampai `data.length < per_page` (per_page=100), di-consume `useKaryawanList` (queryFn) dan pemakai lain yang diganti.

- [ ] **Step 1: Implement `fetchAllKaryawan`** di `queries.js` — loop halaman, berhenti saat halaman terakhir.
- [ ] **Step 2: Ganti queryFn** `useKaryawanList` dan pemakaian `per_page: 500` lain → pakai helper.
- [ ] **Step 3: Verify** — `npm run build` PASS; smoke: halaman DataKaryawan + Dashboard tetap render, network tab menunjukkan fetch bertahap.
- [ ] **Step 4: Commit** — `fix(fe): fetch semua karyawan bertahap, hapus ceiling per_page 500`

## Fase C — Auth & realtime

### Task 6: SSE auth via header, bukan query param (Temuan 2)

**Files:**
- Modify: `frontend/package.json` (add `@microsoft/fetch-event-source`)
- Modify: `frontend/src/hooks/useRealtime.js` (ganti `EventSource` → `fetchEventSource`, header `Authorization: Bearer`)
- Modify: `backend/app/Http/Controllers/Api/SseController.php` (terima Bearer header dulu, fallback query `token` — jaga kompatibilitas)

- [ ] **Step 1: Install dep** — `npm i @microsoft/fetch-event-source`.
- [ ] **Step 2: Backend**: `SseController` — `$token = $request->bearerToken() ?: $request->query('token')`. Test: `php artisan test --filter=Sse` atau smoke curl dengan header.
- [ ] **Step 3: Frontend**: `useRealtime` ganti ke `fetchEventSource(url, { headers: { Authorization: `Bearer ${token}` }, onmessage ... })` — pertahankan reconnect 3s + dedupe + kursor `lastId` non-mundur.
- [ ] **Step 4: Verify** — dashboard LiveMonitoring menerima event realtime saat tap (atau input manual); reconnect tidak dobel event. URL request di DevTools: token TIDAK ada di query string.
- [ ] **Step 5: Commit** — `feat(be,fe): autentikasi SSE via Bearer header, hapus token dari query param`

## Fase D — Firmware (bisa jalan paralel dengan C, butuh hardware untuk test penuh)

### Task 7: Buffer absensi offline di NVS (Temuan 4)

**Files:**
- Modify: `firmware/src/main.cpp` (di `sendAttendance` path gagal → simpan; saat WiFi reconnect → flush)
- Modify: `firmware/include/AppConfig.h` (tambah helper NVS namespace `outbox`: `outboxPush(uid, ts)`, `outboxCount()`, `outboxPopAll()`) — cap 50 record (NVS kecil), FIFO
- Modify: `firmware/include/config.example.h` (jika butuh konstanta)

**Interfaces:**
- Produces: `AppConfig::outboxPush/Count/PopAll` — dipanggil main.cpp; payload retry pakai endpoint `POST /api/absensi` yang sama dengan field tambahan `waktu_client` (ISO) agar backend bisa catat jam tap asli (backend: simpan sebagai keterangan, jangan override jam server — keputusan aman default).

- [ ] **Step 1: Implement outbox di AppConfig.h** (Preferences, key `ob_<i>`, index rotation).
- [ ] **Step 2: Wire di main.cpp** — gagal kirim → `outboxPush`; sukses koneksi kembali → kirim ulang berurutan, hapus setelah ACK `success:true`.
- [ ] **Step 3: Verify** — build `pio run`; test hardware: matikan backend, tap 2 kartu, nyalakan backend → absensi masuk dengan jam server baru (jam tap asli di keterangan). Tanpa hardware: minimal compile PASS + review logika.
- [ ] **Step 4: Commit** — `feat(fw): outbox NVS untuk retry absensi saat server offline`

### Task 8: Per-device API key (Temuan 9)

**Files:**
- Create: `backend/database/migrations/2026_11_24_xxxxxx_create_devices_table.php` (id, nama, api_key unique, status aktif/nonaktif, last_seen_at, timestamps)
- Modify: `backend/app/Http/Middleware/ValidateApiKey.php` (lookup DB dulu, fallback env keys — migrasi aman)
- Modify: `backend/app/Console/Commands/GenerateApiKey.php` (opsi `--device=Nama` buat/rotate key per device)
- Modify: `firmware` — tidak perlu ubah (key tetap via config/portal); hanya dokumentasi
- Test: `backend/tests/Feature/AbsensiDeviceTest.php` (tambah case key per device + revoke)

- [ ] **Step 1: Migration + model `Device`** (key disimpan hashed? **Tidak** — dibutuhkan plaintext untuk mencetak ke admin; batasi: unique index, hanya tampil sekali saat generate).
- [ ] **Step 2: Middleware** — validasi urutan: device aktif di DB → env fallback. Update `last_seen_at` (throttle 1x/menit via cache).
- [ ] **Step 3: Test** — case: key device valid → 200; device nonaktif → 401; key env lama tetap jalan.
- [ ] **Step 4: Verify + migrate** — `php artisan migrate` di DB dev `absensi_iot`, jalankan `api:generate-key --device=ESP-Kantor`, tap dari firmware dengan key baru.
- [ ] **Step 5: Commit** — `feat(be): per-device API key dengan revoke dan last_seen`

## Fase E — Dokumentasi & hygiene

### Task 9: Perkuat gagal-loud patch vendor (Temuan 7)

**Files:**
- Modify: `backend/scripts/patch-laravel-ai.php` (verifikasi versi package: jika `laravel/ai` versi ≠ yang di-patch → fail composer hook dengan pesan eksplisit, bukan skip silent)
- Modify: `backend/docs_dokumentasi/` (1 catatan: package beta, cara kerja patch, apa yang dilakukan saat upgrade)

- [ ] **Step 1: Tambah versi-check** di awal script — baca `vendor/laravel/ai/composer.json` versi; mismatch → `exit(1)` + instruksi.
- [ ] **Step 2: Verify** — `composer dump-autoload` sukses dengan versi cocok; simulasi mismatch → hook gagal loud.
- [ ] **Step 3: Commit** — `fix(be): patch laravel/ai gagal-loud saat versi package berubah`

### Task 10: ERD sebagai sumber file (Temuan 10)

**Files:**
- Create: `docs/erd/erd_absensi.puml` (PlantUML, konsisten: 12 tabel, termasuk status Sakit, devices dari Task 8)
- Create: `docs/erd/erd_absensi.png` (render)

- [ ] **Step 1: Tulis .puml** dari migrations (bukan dari foto) — `employees`, `divisions`, `schedules`, `attendance` (+unique employee_id,tanggal), `rfid_scans`, `realtime_events`, `audit_logs`, `users`, `devices`, `personal_access_tokens`, jobs/cache bila dipakai.
- [ ] **Step 2: Render + commit kedua file.**
- [ ] **Step 3: Verify** — bandingkan ERD vs `php artisan migrate:status`/schema DB aktual; cocok.
- [ ] **Step 4: Commit** — `docs: ERD PlantUML dari migrations, ganti foto WhatsApp`

---

## Urutan & dependensi

```
Task 1 → 2 → 3 → 4 → 5   (Fase A–B, berurutan, tiap task kecil)
Task 6 terpisah (SSE, be/fe)
Task 7 (firmware) ∥ Task 8 (be devices) — Task 10 butuh Task 8 selesai
Task 9 kapan saja
```

Estimasi: Task 1–6, 9 ±1 jam total; Task 7–8 perlu hardware + uji firmware ±2 jam; Task 10 ±30 menit.
