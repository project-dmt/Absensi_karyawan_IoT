# Update Laporan: Divisi Wajib

Laporan acuan: `/home/fathir/Downloads/Laporan Pkl DMT 24 (2)(2).docx`

Folder ini berisi potongan teks/tabel dan screenshot untuk ditempel manual ke laporan. Tidak ada DOCX laporan final di sini. Nomor tabel dan gambar tidak berubah.

## Cukup Update Ini Dulu

### Wajib
1. `Tabel_3.5_Ringkasan_PDM.docx` — **Tabel 3.5 Ringkasan PDM**
2. `Tabel_3.4_Relasi_Antar_Entitas.docx` — **Tabel 3.4 Relasi Antar Entitas**
3. `Tabel_3.8_Definisi_Use_Case.docx` — **Tabel 3.8 Definisi Use Case**
4. `Teks_5.5.3_Data_Karyawan.docx` — **5.5.3 Data Karyawan**
5. `Tabel_6.1_Kasus_Uji_Backend.docx` — **Tabel 6.1 Kasus Uji Backend**
6. `Tabel_6.4_Kasus_Uji_Frontend.docx` — **Tabel 6.4 Kasus Uji Frontend**
7. `Tabel_6.6_Ringkasan_Hasil_Pengujian.docx` — **Tabel 6.6 Ringkasan Hasil Pengujian**
8. `screenshots/Gambar_5.3_Data_Karyawan.png` — ganti **Gambar 5.3 Data Karyawan**

### Opsional
- `Tabel_5.4_Mapping_Halaman_Frontend_Backend.docx` — kalau mau mapping teknis ikut akurat.
- `Teks_5.5.4_Data_Divisi.docx` — sekalian betulkan typo `backen` dan tambah info tambah divisi.
- `screenshots/Gambar_5.3_Data_Karyawan_Modal_Tambah_Divisi.png` — screenshot tambahan, bukan gambar baru.

**Kalau mau cepat:** kerjakan 8 item wajib di atas saja. Sisanya opsional.

## Isi Folder

```text
update_divisi_wajib/
├── README_DAFTAR_UPDATE.md
├── screenshots/
│   ├── Gambar_5.3_Data_Karyawan.png
│   └── Gambar_5.3_Data_Karyawan_Modal_Tambah_Divisi.png
└── snippets/
    ├── Tabel_3.4_Relasi_Antar_Entitas.docx
    ├── Tabel_3.5_Ringkasan_PDM.docx
    ├── Tabel_3.8_Definisi_Use_Case.docx
    ├── Tabel_5.4_Mapping_Halaman_Frontend_Backend.docx
    ├── Teks_5.5.3_Data_Karyawan.docx
    ├── Teks_5.5.4_Data_Divisi.docx
    ├── Tabel_6.1_Kasus_Uji_Backend.docx
    ├── Tabel_6.4_Kasus_Uji_Frontend.docx
    └── Tabel_6.6_Ringkasan_Hasil_Pengujian.docx
```

## Daftar Perubahan

| File | Caption / Nomor | Yang Diganti |
|---|---|---|
| `Tabel_3.4_Relasi_Antar_Entitas.docx` | **Tabel 3.4 Relasi Antar Entitas** | Relasi `Division ke Employee` jadi wajib: setiap karyawan punya tepat satu divisi |
| `Tabel_3.5_Ringkasan_PDM.docx` | **Tabel 3.5 Ringkasan Physical Data Model (PDM)** | Baris `employees`: `divisi wajib (NOT NULL); jabatan opsional` |
| `Tabel_3.8_Definisi_Use_Case.docx` | **Tabel 3.8 Definisi Use Case** | `Kelola Karyawan` dan `Kelola Divisi` ditambah info divisi wajib + tambah divisi dari form |
| `Tabel_5.4_Mapping_Halaman_Frontend_Backend.docx` | **Tabel 5.4 Mapping Halaman Frontend ke Backend** | Baris Data Karyawan dan Data Divisi disesuaikan |
| `Teks_5.5.3_Data_Karyawan.docx` | **5.5.3 Data Karyawan / Gambar 5.3 Data Karyawan** | Paragraf baru soal divisi wajib, tombol `+`, dan auto-select divisi baru |
| `Teks_5.5.4_Data_Divisi.docx` | **5.5.4 Data Divisi / Gambar 5.4 Data Divisi** | Paragraf baru soal tambah divisi; typo `backen` diperbaiki |
| `Tabel_6.1_Kasus_Uji_Backend.docx` | **Tabel 6.1 Kasus Uji Backend** | Tambah baris 7–9 |
| `Tabel_6.4_Kasus_Uji_Frontend.docx` | **Tabel 6.4 Kasus Uji Frontend** | Tambah baris 7–9 |
| `Tabel_6.6_Ringkasan_Hasil_Pengujian.docx` | **Tabel 6.6 Ringkasan Hasil Pengujian** | Backend `6 → 9`, Frontend `6 → 9` |

## Screenshot

- `Gambar_5.3_Data_Karyawan.png`: screenshot utama. Menampilkan form karyawan dengan tombol `+` di samping divisi dan pesan `Divisi wajib dipilih`.
- `Gambar_5.3_Data_Karyawan_Modal_Tambah_Divisi.png`: screenshot opsional modal tambah divisi. Bukan gambar baru, jangan tambah nomor gambar di laporan.

## Catatan Cleanup Laporan

1. Di **5.5.3 Data Karyawan**, hapus teks `mm` yang nyasar setelah paragraf.
2. Di **5.5.4 Data Divisi**, perbaiki typo `backen` menjadi `backend`.
3. Di caption **Tabel 3.8**, saat ini tertulis dobel: `Tabel 3.8 Definisi Use CaseTbel 3.8 Definisi Use Case`. Ganti jadi `Tabel 3.8 Definisi Use Case`.

## Hasil Verifikasi Sistem

- Migration berhasil dijalankan.
- 2 karyawan lama yang `divisi_id` null dipindahkan ke divisi `Umum`.
- Kolom `employees.divisi_id` sekarang `NOT NULL`.
- FK `employees.divisi_id` sekarang `RESTRICT` saat divisi dihapus.
- Backend test: **63 passed, 4 skipped, 188 assertions**.
- Frontend build: **berhasil**.
- Backup DB sebelum migration: `/tmp/opencode/absensi_iot_before_divisi.sql`.

## Perubahan Sistem

- `divisi_id` wajib di `StoreKaryawanRequest` dan `UpdateKaryawanRequest`.
- Form karyawan menolak simpan jika divisi kosong.
- Tombol `+` membuka modal tambah divisi baru.
- Divisi baru langsung tersimpan, otomatis terpilih, dan langsung muncul di pilihan divisi.
- `karyawanSchema` di frontend ikut diubah jadi wajib.
