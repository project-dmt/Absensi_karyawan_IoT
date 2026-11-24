# Laporan Fungsional (Non-Teknis) Fitur AI Assistant pada Sistem Absensi IoT

## 1. Latar Belakang
Seiring dengan bertambahnya jumlah karyawan dan data absensi yang masuk setiap harinya, bagian Kepegawaian atau *Human Resources Department* (HRD) seringkali menghabiskan banyak waktu hanya untuk merekap atau mencari informasi spesifik. Misalnya, mencari tahu siapa saja yang datang terlambat hari ini, atau berapa banyak karyawan yang tidak hadir dalam satu minggu terakhir. Proses pencarian manual melalui tabel dan filter memakan waktu dan berpotensi menimbulkan kendala efisiensi.

Untuk memecahkan masalah tersebut, Sistem Absensi Karyawan IoT ini dilengkapi dengan fitur **AI Assistant (Asisten Pintar berbasis Kecerdasan Buatan)**. Fitur ini dirancang layaknya asisten pribadi virtual yang siap menjawab pertanyaan apa pun seputar data kehadiran karyawan secara instan.

## 2. Tujuan dan Manfaat
Fitur AI Assistant dibangun dengan tujuan utama untuk menyederhanakan cara pengguna (Admin/HRD) berinteraksi dengan sistem. 

Manfaat utama dari fitur ini meliputi:
*   **Efisiensi Waktu:** Tidak perlu lagi membuka banyak halaman atau mengatur rentang tanggal (filter) secara manual untuk mencari data.
*   **Kemudahan Penggunaan (User-Friendly):** Pengguna cukup menggunakan bahasa manusia sehari-hari (Bahasa Indonesia) untuk meminta laporan.
*   **Akses Data yang Instan:** Mendapatkan rangkuman data secara *real-time* langsung di layar *dashboard*.
*   **Mengurangi Beban Kognitif:** Sistem yang akan berpikir dan merangkum data (contoh: menghitung persentase kehadiran), bukan pengguna.

## 3. Cara Kerja (Bagi Pengguna Akhir)
Fitur ini berwujud sebuah *Chat Widget* (jendela percakapan) yang berada di sudut kanan bawah halaman Admin Dashboard. 

Cara kerjanya sangat sederhana:
1. Admin membuka jendela *chat* AI Assistant.
2. Admin mengetikkan pertanyaan menggunakan bahasa sehari-hari. Contoh: *"Tolong beritahu saya siapa saja karyawan divisi Marketing yang terlambat hari ini?"*
3. Asisten AI akan memahami makna dari pertanyaan tersebut, mencari data yang sesuai di dalam sistem absen, dan langsung mengetikkan balasan dalam hitungan detik.

## 4. Keunggulan Fitur AI Assistant
Meskipun ditenagai oleh kecerdasan buatan, fitur ini dirancang secara khusus untuk kebutuhan sistem absensi, sehingga memiliki keunggulan:
*   **Akurat dan Berdasarkan Fakta:** Asisten AI ini diatur secara ketat agar **hanya** menjawab berdasarkan data absensi yang benar-benar ada di dalam sistem. AI tidak akan menebak-nebak, mengarang informasi (*halusinasi*), atau menjawab di luar konteks pekerjaan.
*   **Keamanan Terjamin:** Asisten ini murni bersifat "Hanya Baca" (*Read-Only*). Artinya, percakapan apa pun dengan AI tidak akan bisa secara tidak sengaja atau sengaja mengubah, menghapus, atau merusak data absen maupun data karyawan.
*   **Fokus pada Pekerjaan:** Jika pengguna iseng menanyakan hal di luar konteks absensi (misalnya bertanya tentang resep masakan atau berita politik), AI akan dengan sopan menolak dan mengarahkan pembicaraan kembali ke topik absensi karyawan.

## 5. Contoh Skenario Penggunaan Praktis
Berikut adalah beberapa contoh bagaimana fitur ini bisa sangat mempermudah pekerjaan sehari-hari HRD:

*   **Skenario 1 (Pengecekan Harian):** 
    *   *HRD:* "Berapa total karyawan yang hadir dan tidak hadir hari ini?"
    *   *AI:* "Hari ini, dari total 50 karyawan, terdapat 45 orang yang hadir (termasuk 3 terlambat), 2 orang sakit, dan 3 orang tanpa keterangan (Alpha)."
*   **Skenario 2 (Evaluasi Kinerja):**
    *   *HRD:* "Tolong sebutkan nama-nama karyawan yang datang terlambat hari ini."
    *   *AI:* "Karyawan yang terlambat hari ini adalah: 1. Budi Santoso (Divisi IT) - Masuk jam 08:30, 2. Siti Aminah (Divisi Keuangan) - Masuk jam 08:15."
*   **Skenario 3 (Pengecekan Divisi):**
    *   *HRD:* "Apakah ada karyawan dari divisi HRD yang izin hari ini?"
    *   *AI:* "Ya, terdapat 1 karyawan dari divisi HRD yang berstatus Izin hari ini, yaitu atas nama Rina."

## 6. Kesimpulan
Penambahan fitur AI Assistant pada Sistem Absensi IoT memberikan nilai tambah yang luar biasa. Sistem ini tidak lagi hanya sekadar menjadi tempat menyimpan data otomatis dari mesin fisik (Mesin RFID), tetapi telah berevolusi menjadi sebuah platform cerdas yang secara aktif membantu manajemen dalam mengambil keputusan, memantau kedisiplinan, dan mengelola sumber daya manusia dengan cara yang paling mudah, cepat, dan aman.
