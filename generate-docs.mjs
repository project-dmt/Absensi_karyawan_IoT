import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, PageBreak, TabStopPosition, TabStopType
} from "docx";
import fs from "fs";

const BLUE = "2B5797";
const DARK = "333333";
const GRAY = "666666";
const LIGHT_BG = "F2F2F2";

function title(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text, bold: true, size: 52, color: BLUE, font: "Calibri" })],
  });
}

function subtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text, size: 24, color: GRAY, font: "Calibri" })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, color: BLUE, font: "Calibri" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 26, color: DARK, font: "Calibri" })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, color: DARK, font: "Calibri" })],
  });
}

function p(text) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, size: 20, color: DARK, font: "Calibri" })],
  });
}

function pBold(label, desc) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label, bold: true, size: 20, color: DARK, font: "Calibri" }),
      new TextRun({ text: desc, size: 20, color: DARK, font: "Calibri" }),
    ],
  });
}

function code(text) {
  return new Paragraph({
    spacing: { after: 80 },
    indent: { left: 400 },
    children: [new TextRun({ text, size: 18, color: "C7254E", font: "Consolas" })],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 600, hanging: 200 },
    children: [
      new TextRun({ text: "\u2022  ", size: 20, font: "Calibri" }),
      new TextRun({ text, size: 20, color: DARK, font: "Calibri" }),
    ],
  });
}

function blank() {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

function makeCell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.header ? { fill: BLUE, type: ShadingType.CLEAR, color: "auto" } : undefined,
    children: [new Paragraph({
      spacing: { before: 40, after: 40 },
      indent: { left: 80 },
      children: [new TextRun({
        text,
        bold: opts.header,
        size: 18,
        color: opts.header ? "FFFFFF" : DARK,
        font: "Calibri",
      })],
    })],
  });
}

function makeTable(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h) => makeCell(h, { header: true })),
  });
  const dataRows = rows.map((row) =>
    new TableRow({
      children: row.map((cell) => makeCell(cell)),
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// === BUILD DOCUMENT ===
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 20 } },
    },
  },
  sections: [{
    children: [
      // COVER
      blank(), blank(), blank(),
      title("Dokumentasi Frontend"),
      title("Sistem Absensi IoT - RFID"),
      blank(),
      subtitle("React 19 | Vite 8 | Bootstrap 5 | Express Mock Server"),
      blank(), blank(),
      subtitle("Fathir - 2026"),
      blank(), blank(),

      pageBreak(),

      // TABLE OF CONTENTS
      h1("Daftar Isi"),
      p("1. Gambaran Umum Proyek"),
      p("2. Struktur Direktori"),
      p("3. Tech Stack & Dependencies"),
      p("4. Konfigurasi (vite.config.js, .env, package.json)"),
      p("5. Entry Point (main.jsx, App.jsx, index.css)"),
      p("6. Axios Instance & Interceptors (api/axios.js)"),
      p("7. Custom Hooks (useAuth, useDebounce, useRealtime)"),
      p("8. Reusable Components (StatusBadge, FormInput, Modal, dll)"),
      p("9. Layout (AdminLayout)"),
      p("10. Halaman Login"),
      p("11. Halaman Dashboard"),
      p("12. Halaman Data Karyawan + Detail"),
      p("13. Halaman Data Divisi + Detail"),
      p("14. Halaman Jam Kerja"),
      p("15. Halaman Input Absensi Manual"),
      p("16. Halaman Laporan Absensi"),
      p("17. Mock API Server (mock-server.cjs)"),
      p("18. Tabel Endpoint API"),
      p("19. Alur Autentikasi (Auth Flow)"),
      p("20. Alur Real-time (SSE)"),
      p("21. Arsitektur Data & State Management"),

      pageBreak(),

      // 1. OVERVIEW
      h1("1. Gambaran Umum Proyek"),
      p("Sistem Absensi IoT adalah aplikasi web admin dashboard untuk mengelola sistem absensi karyawan berbasis kartu RFID/IoT. Frontend dibangun dengan React 19 sebagai SPA (Single Page Application) dengan arsitektur komponen modular."),
      blank(),
      p("Fitur utama yang tersedia:"),
      bullet("Autentikasi login/logout dengan token-based auth (Bearer token)"),
      bullet("Dashboard real-time dengan SSE (Server-Sent Events) yang auto-update saat karyawan tap kartu"),
      bullet("Manajemen Data Karyawan (CRUD + detail view + riwayat absensi)"),
      bullet("Manajemen Data Divisi (CRUD + detail view + rekap absensi per divisi)"),
      bullet("Pengaturan Jam Kerja (jam masuk/pulang standar + toleransi keterlambatan)"),
      bullet("Input Absensi Manual (untuk karyawan yang tidak bisa tap RFID)"),
      bullet("Laporan Absensi dengan filter tanggal + divisi + export Excel/PDF"),

      pageBreak(),

      // 2. DIRECTORY STRUCTURE
      h1("2. Struktur Direktori"),
      h2("Root Project"),
      code("Absensi_karyawan_IoT/"),
      code("  \u251C\u2500\u2500 index.html              Entry HTML"),
      code("  \u251C\u2500\u2500 package.json            Dependencies & scripts"),
      code("  \u251C\u2500\u2500 vite.config.js          Vite configuration"),
      code("  \u251C\u2500\u2500 .env                    Environment variables (VITE_API_URL)"),
      code("  \u251C\u2500\u2500 mock-server.cjs         Express mock API server"),
      code("  \u2514\u2500\u2500 src/                    Source code"),
      blank(),
      h2("src/ Directory"),
      code("src/"),
      code("  \u251C\u2500\u2500 main.jsx                React entry point"),
      code("  \u251C\u2500\u2500 App.jsx                 Router & route definitions"),
      code("  \u251C\u2500\u2500 index.css               Global styles (CSS variables, layout, components)"),
      code("  \u251C\u2500\u2500 api/"),
      code("  \u2502   \u2514\u2500\u2500 axios.js              Configured Axios instance + interceptors"),
      code("  \u251C\u2500\u2500 hooks/"),
      code("  \u2502   \u251C\u2500\u2500 useAuth.js            Authentication state hook"),
      code("  \u2502   \u251C\u2500\u2500 useDebounce.js        Debounce utility hook"),
      code("  \u2502   \u2514\u2500\u2500 useRealtime.js        SSE real-time hook"),
      code("  \u251C\u2500\u2500 components/"),
      code("  \u2502   \u251C\u2500\u2500 StatusBadge.jsx       Colored status badge"),
      code("  \u2502   \u251C\u2500\u2500 FormInput.jsx         Reusable form field (input/select/textarea)"),
      code("  \u2502   \u251C\u2500\u2500 Modal.jsx             Custom modal dialog"),
      code("  \u2502   \u251C\u2500\u2500 EmptyState.jsx        Empty data placeholder"),
      code("  \u2502   \u2514\u2500\u2500 LoadingSpinner.jsx    Loading spinner"),
      code("  \u251C\u2500\u2500 layouts/"),
      code("  \u2502   \u2514\u2500\u2500 AdminLayout.jsx       Sidebar + topbar + content wrapper"),
      code("  \u2514\u2500\u2500 pages/"),
      code("      \u251C\u2500\u2500 Login.jsx              Login form"),
      code("      \u251C\u2500\u2500 Dashboard.jsx          Stats + recent attendance"),
      code("      \u251C\u2500\u2500 DataKaryawan.jsx       Employee CRUD"),
      code("      \u251C\u2500\u2500 DetailKaryawan.jsx     Employee detail + history"),
      code("      \u251C\u2500\u2500 DataDivisi.jsx         Division CRUD"),
      code("      \u251C\u2500\u2500 DetailDivisi.jsx       Division detail + employees"),
      code("      \u251C\u2500\u2500 JamKerja.jsx           Work schedule config"),
      code("      \u251C\u2500\u2500 InputAbsensiManual.jsx Manual attendance form"),
      code("      \u2514\u2500\u2500 LaporanAbsensi.jsx     Attendance report + export"),

      pageBreak(),

      // 3. TECH STACK
      h1("3. Tech Stack & Dependencies"),
      h2("Frontend"),
      makeTable(["Package", "Version", "Fungsi"], [
        ["react", "^19.2.7", "UI library utama"],
        ["react-dom", "^19.2.7", "React DOM renderer"],
        ["react-router-dom", "^7.18.1", "Client-side routing (SPA)"],
        ["axios", "^1.18.1", "HTTP client untuk API calls"],
        ["bootstrap", "^5.3.8", "CSS framework"],
        ["bootstrap-icons", "^1.13.1", "Icon library"],
        ["react-bootstrap", "^2.10.10", "React components for Bootstrap"],
        ["vite", "^8.1.1", "Build tool & dev server"],
        ["@vitejs/plugin-react", "^6.0.3", "Vite plugin for React"],
        ["oxlint", "^1.71.0", "Linter"],
      ]),
      blank(),
      h2("Backend / Mock Server"),
      makeTable(["Package", "Version", "Fungsi"], [
        ["express", "^5.2.1", "HTTP server untuk mock API"],
        ["cors", "^2.8.6", "Cross-origin resource sharing"],
      ]),

      pageBreak(),

      // 4. CONFIGURATION
      h1("4. Konfigurasi"),
      h2("vite.config.js"),
      p("Konfigurasi Vite build tool. Menggunakan plugin React dan menetapkan appType: 'spa' agar Vite dev server otomatis handle client-side routing (fallback ke index.html untuk semua route)."),
      blank(),
      h2(".env"),
      p("Variabel lingkungan yang dibaca oleh Vite:"),
      code("VITE_API_URL=http://localhost:8000/api"),
      p("Variabel ini digunakan oleh Axios instance sebagai baseURL. Prefix VITE_ diperlukan agar bisa diakses dari browser-side code."),
      blank(),
      h2("package.json Scripts"),
      makeTable(["Script", "Command", "Fungsi"], [
        ["dev", "vite", "Jalankan dev server (hot reload)"],
        ["build", "vite build", "Build untuk production"],
        ["lint", "oxlint", "Linting code"],
        ["preview", "vite preview", "Preview production build"],
      ]),

      pageBreak(),

      // 5. ENTRY POINT
      h1("5. Entry Point"),
      h2("main.jsx"),
      p("File masuk aplikasi. Melakukan rendering komponen App ke dalam DOM element #root. Juga mengimpor Bootstrap CSS, Bootstrap Icons CSS, dan index.css (global styles)."),
      code("createRoot(root).render(<StrictMode><App /></StrictMode>)"),
      blank(),
      h2("App.jsx"),
      p("Komponen root yang mendefinisikan seluruh rute (route) aplikasi. Menggunakan React Router v7 dengan BrowserRouter."),
      blank(),
      h3("ProtectedRoute Component"),
      p("Komponen internal yang membungkus semua route yang memerlukan autentikasi. Jika user belum login, redirect ke /login. Jika sedang loading, tampilkan spinner."),
      blank(),
      h3("Route Definitions"),
      makeTable(["Route", "Component", "Akses"], [
        ["/login", "Login", "Public (redirect ke / jika sudah login)"],
        ["/", "Dashboard", "Protected"],
        ["/data-karyawan", "DataKaryawan", "Protected"],
        ["/data-karyawan/:id", "DetailKaryawan", "Protected"],
        ["/data-divisi", "DataDivisi", "Protected"],
        ["/data-divisi/:id", "DetailDivisi", "Protected"],
        ["/jam-kerja", "JamKerja", "Protected"],
        ["/input-absensi-manual", "InputAbsensiManual", "Protected"],
        ["/laporan-absensi", "LaporanAbsensi", "Protected"],
        ["*", "Navigate to /", "Catch-all redirect"],
      ]),
      blank(),
      h2("index.css"),
      p("File CSS global (741 baris) yang mendefinisikan seluruh custom styling aplikasi. Menggunakan CSS Custom Properties (variables) untuk konsistensi warna dan spacing."),
      blank(),
      h3("CSS Variables Utama"),
      makeTable(["Variable", "Value", "Fungsi"], [
        ["--primary", "#4f6d7a", "Warna utama (slate blue)"],
        ["--primary-dark", "#3a5261", "Warna utama lebih gelap"],
        ["--primary-light", "#7b9aab", "Warna utama lebih terang"],
        ["--bg", "#f0f4f8", "Background halaman"],
        ["--sidebar-bg", "#1e293b", "Background sidebar (dark)"],
        ["--sidebar-active", "#4f6d7a", "Background nav link aktif"],
        ["--radius", "12px", "Border radius besar"],
        ["--radius-sm", "8px", "Border radius kecil"],
        ["--sidebar-width", "250px", "Lebar sidebar"],
        ["--topbar-height", "60px", "Tinggi topbar"],
        ["--transition", "0.2s ease", "Animasi transisi default"],
      ]),
      blank(),
      h3("Section CSS Utama"),
      bullet("App Layout: Flexbox layout (sidebar + main content)"),
      bullet("Sidebar: Fixed di desktop, slide-in overlay di mobile (<=767.98px)"),
      bullet("Topbar: Header dengan hamburger menu (mobile) dan user dropdown"),
      bullet("Cards: Shadow, border-radius, hover effects"),
      bullet("Stat Cards: Gradient background dengan icon overlay dan hover lift"),
      bullet("Tables: Custom thead, row hover, font styling"),
      bullet("Buttons: Variants (primary, success, danger) dengan hover effects + btn-action untuk tabel"),
      bullet("Forms: Custom focus ring, input styling"),
      bullet("Modal: Fade + scale animation, backdrop blur"),
      bullet("Login Page: Full-screen gradient background dengan centered card"),
      bullet("Animations: fadeIn, slideUp keyframes"),
      bullet("Scrollbar: Custom webkit scrollbar styling"),

      pageBreak(),

      // 6. AXIOS
      h1("6. Axios Instance & Interceptors"),
      h2("api/axios.js"),
      p("Membuat dan mengekspor instance Axios yang sudah dikonfigurasi dengan baseURL, headers default, dan interceptors."),
      blank(),
      h3("Request Interceptor"),
      p("Setiap request yang dikirim akan otomatis menyertakan header Authorization: Bearer <token> jika token tersimpan di localStorage."),
      code("config.headers.Authorization = `Bearer ${token}`"),
      blank(),
      h3("Response Interceptor"),
      p("Jika server merespons dengan status 401 (Unauthorized), interceptor akan:"),
      bullet("Menghapus token dan user dari localStorage"),
      bullet("Redirect ke halaman /login"),
      bullet("Melempar error ke komponen yang memanggil"),

      pageBreak(),

      // 7. HOOKS
      h1("7. Custom Hooks"),
      h2("useAuth.js"),
      p("Hook untuk mengelola state autentikasi. Mengembalikan { user, loading, login, logout }."),
      blank(),
      h3("State Variables"),
      makeTable(["Variable", "Tipe", "Fungsi"], [
        ["user", "Object|null", "Data user yang sedang login"],
        ["loading", "boolean", "True saat validasi token di mount"],
      ]),
      blank(),
      h3("Fungsi"),
      pBold("login(email, password): ", "Memanggil POST /login, menyimpan token + user di localStorage, update state user."),
      pBold("logout(): ", "Memanggil POST /logout (dengan fallback jika gagal), menghapus data dari localStorage, set user ke null."),
      blank(),
      h3("Alur Mount"),
      code("1. Cek localStorage untuk token"),
      code("2. Jika ada token, panggil GET /user untuk validasi"),
      code("3. Jika valid, set user state"),
      code("4. Jika invalid (401), hapus localStorage"),
      code("5. Set loading = false"),
      blank(),

      h2("useDebounce.js"),
      p("Hook utilitas untuk mendebounce value yang berubah cepat. Default delay: 300ms."),
      p("Digunakan di halaman DataKaryawan dan DataDivisi untuk search input agar tidak memanggil filter terlalu sering."),
      code("const debouncedSearch = useDebounce(search, 300)"),
      blank(),

      h2("useRealtime.js"),
      p("Hook untuk menghubungkan ke SSE (Server-Sent Events) endpoint dan menerima update absensi secara real-time."),
      blank(),
      h3("Event Types"),
      makeTable(["Event", "Handler", "Fungsi"], [
        ["check_in", "Prepend ke list", "Karyawan baru tap kartu (masuk)"],
        ["checkout", "Update atau prepend", "Karyawan checkout (pulang)"],
      ]),
      blank(),
      h3("State Variables"),
      makeTable(["Variable", "Fungsi"], [
        ["events", "Array max 20 event terakhir"],
        ["lastIdRef", "Track ID terakhir untuk replay saat reconnect"],
        ["reconnectTimeoutRef", "Timer auto-reconnect (3 detik)"],
      ]),
      blank(),
      h3("Alur Koneksi"),
      code("1. Buat EventSource ke /absensi/stream?lastId=X&token=Y"),
      code("2. Dengarkan event check_in dan checkout"),
      code("3. Jika error, tutup koneksi"),
      code("4. Setelah 3 detik, reconnect otomatis"),
      code("5. Bersihkan saat component unmount"),

      pageBreak(),

      // 8. COMPONENTS
      h1("8. Reusable Components"),
      h2("StatusBadge.jsx"),
      p("Badge berwarna untuk menampilkan status. Props: status (string)."),
      makeTable(["Status", "Warna", "Keterangan"], [
        ["Hadir", "bg-success-subtle text-success", "Hijau"],
        ["Terlambat", "bg-warning-subtle text-warning", "Kuning"],
        ["Alpha", "bg-danger-subtle text-danger", "Merah"],
        ["Izin", "bg-info-subtle text-info", "Biru"],
        ["aktif", "bg-success-subtle text-success", "Hijau"],
        ["nonaktif", "bg-secondary-subtle text-secondary", "Abu-abu"],
      ]),
      blank(),

      h2("FormInput.jsx"),
      p("Komponen form input serbaguna. Mendukung tiga mode berdasarkan props as:"),
      makeTable(["as", "Render", "Props Tambahan"], [
        ["input (default)", "<input>", "type, placeholder"],
        ["select", "<select>", "options (array [{value, label}])"],
        ["textarea", "<textarea>", "placeholder, rows"],
      ]),
      p("Menampilkan error validasi dari server via class Bootstrap is-invalid."),
      blank(),

      h2("Modal.jsx"),
      p("Dialog modal kustom. Props: show, onClose, title, children, footer."),
      bullet("Tidak render apa-apa jika show = false"),
      bullet("Tutup dengan ESC key atau klik backdrop"),
      bullet("Footer opsional untuk tombol aksi (Batal, Simpan)"),
      blank(),

      h2("EmptyState.jsx"),
      p("Placeholder saat tidak ada data. Props: message, icon (Bootstrap icon class)."),
      blank(),

      h2("LoadingSpinner.jsx"),
      p("Spinner loading tengah halaman. Props: text (default 'Memuat data...')."),

      pageBreak(),

      // 9. ADMIN LAYOUT
      h1("9. Admin Layout"),
      h2("AdminLayout.jsx"),
      p("Layout utama untuk semua halaman yang sudah login. Terdiri dari sidebar, topbar, dan area konten (Outlet)."),
      blank(),
      h3("NAV_ITEMS (Sidebar Navigation)"),
      makeTable(["Label", "Route", "Icon"], [
        ["Dashboard", "/", "bi-speedometer2"],
        ["Data Karyawan", "/data-karyawan", "bi-people"],
        ["Data Divisi", "/data-divisi", "bi-diagram-3"],
        ["Jam Kerja", "/jam-kerja", "bi-clock-history"],
        ["Absensi Manual", "/input-absensi-manual", "bi-pencil-square"],
        ["Laporan Absensi", "/laporan-absensi", "bi-file-earmark-bar-graph"],
      ]),
      blank(),
      h3("Responsive Behavior"),
      pBold("Desktop (>767.98px): ", "Sidebar selalu terlihat di kiri (fixed width 250px), konten mengisi sisa ruang."),
      pBold("Mobile (<=767.98px): ", "Sidebar tersembunyi, muncul sebagai overlay slide-in saat hamburger menu diklik. Backdrop gelap menutupi konten."),
      blank(),
      h3("State Variables"),
      makeTable(["Variable", "Fungsi"], [
        ["sidebarOpen", "Mengontrol visibilitas sidebar di mobile"],
      ]),

      pageBreak(),

      // 10. LOGIN
      h1("10. Halaman Login"),
      h2("Login.jsx"),
      p("Halaman login dengan form email dan password. Props: onLogin (fungsi dari useAuth)."),
      blank(),
      h3("State Variables"),
      makeTable(["Variable", "Fungsi"], [
        ["form", "{ email, password } - data form"],
        ["error", "Pesan error dari server"],
        ["loading", "Status submitting form"],
      ]),
      blank(),
      h3("Alur Login"),
      code("1. User isi email + password"),
      code("2. Submit form -> onLogin(email, password)"),
      code("3. useAuth.login() panggil POST /login"),
      code("4. Simpan token + user di localStorage"),
      code("5. Redirect ke Dashboard (/)"),
      code("6. Jika gagal, tampilkan pesan error"),
      blank(),
      h3("UI"),
      p("Full-screen gradient background (slate dark -> blue). Card putih di tengah dengan brand icon, judul 'Sistem Absensi IoT', input group dengan icon (envelope/lock), error alert, dan tombol login dengan spinner."),

      pageBreak(),

      // 11. DASHBOARD
      h1("11. Halaman Dashboard"),
      h2("Dashboard.jsx"),
      p("Halaman utama yang menampilkan statistik absensi hari ini dan daftar absensi terbaru secara real-time."),
      blank(),
      h3("State Variables"),
      makeTable(["Variable", "Fungsi"], [
        ["stats", "{ totalKaryawan, hadir, terlambat, tidakHadir }"],
        ["recent", "Array max 10 record absensi terbaru"],
        ["loading", "Status loading data"],
        ["realtimeEvents", "Dari useRealtime() hook - event SSE"],
      ]),
      blank(),
      h3("API Calls"),
      bullet("GET /karyawan - menghitung total karyawan"),
      bullet("GET /laporan?dari=today&sampai=today - data absensi hari ini"),
      blank(),
      h3("Real-time Update"),
      p("useRealtime() hook mengembalikan array events dari SSE. Saat ada event baru (useEffect dependensi realtimeEvents):"),
      bullet("Merge events ke recent list (deduplicate by ID, max 10)"),
      bullet("Update counters stat cards (hadir +1 atau terlambat +1)"),
      bullet("Hitung tidakHadir = total - hadir - terlambat"),
      blank(),
      h3("UI"),
      p("4 gradient stat cards (Total Karyawan, Hadir Hari Ini, Terlambat, Tidak Hadir) + tabel absensi terbaru (Nama, NIP, Jam Masuk, Status)."),

      pageBreak(),

      // 12. DATA KARYAWAN
      h1("12. Halaman Data Karyawan + Detail"),
      h2("DataKaryawan.jsx"),
      p("Halaman CRUD untuk mengelola data karyawan. Fitur: tambah, edit, hapus, cari, dan lihat detail."),
      blank(),
      h3("State Variables"),
      makeTable(["Variable", "Fungsi"], [
        ["data", "Array karyawan dari API"],
        ["divisi", "Array divisi (untuk dropdown select)"],
        ["search / debouncedSearch", "Input pencarian dengan debounce 300ms"],
        ["showModal", "Visibilitas modal form"],
        ["editId", "null = tambah, angka = edit"],
        ["form", "{ nama, nip, jabatan, divisi_id, rfid_uid, status }"],
        ["errors", "Validasi error dari server (422)"],
        ["submitting", "Status submit form"],
      ]),
      blank(),
      h3("API Calls"),
      makeTable(["Method", "Endpoint", "Fungsi"], [
        ["GET", "/karyawan", "Ambil semua karyawan"],
        ["GET", "/divisi", "Ambil divisi untuk dropdown"],
        ["POST", "/karyawan", "Tambah karyawan baru"],
        ["PUT", "/karyawan/:id", "Update karyawan"],
        ["DELETE", "/karyawan/:id", "Hapus karyawan (konfirmasi)"],
      ]),
      blank(),
      h3("Search/Filter"),
      p("Filter client-side berdasarkan nama, NIP, atau RFID UID. Menggunakan useDebounce(300ms) agar tidak filter terlalu sering saat user mengetik."),
      blank(),
      h3("Aksi Tabel"),
      bullet("Ikon Mata (eye) -> navigate ke /data-karyawan/:id (detail)"),
      bullet("Ikon Pensil (pencil) -> buka modal edit"),
      bullet("Ikon Tong sampah (trash) -> konfirmasi hapus"),
      blank(),

      h2("DetailKaryawan.jsx"),
      p("Halaman detail satu karyawan. Menampilkan info lengkap, ringkasan absensi, dan tabel riwayat absensi."),
      blank(),
      h3("API Call"),
      code("GET /karyawan/:id/laporan?dari=...&sampai=..."),
      p("Mengembalikan { employee, absensi[], summary }"),
      blank(),
      h3("UI Sections"),
      bullet("Info Karyawan: nama, NIP, jabatan, divisi, RFID UID, status"),
      bullet("Summary Cards (5): Total Absensi, Hadir, Terlambat, Alpha, Izin"),
      bullet("Filter Periode: date range picker + Terapkan/Reset"),
      bullet("Tabel Riwayat: Tanggal, Status, Jam Masuk, Jam Pulang, Keterangan"),

      pageBreak(),

      // 13. DATA DIVISI
      h1("13. Halaman Data Divisi + Detail"),
      h2("DataDivisi.jsx"),
      p("Halaman CRUD untuk mengelola divisi. Pattern serupa dengan DataKaryawan tapi lebih sederhana (satu field: nama_divisi)."),
      blank(),
      h3("API Calls"),
      makeTable(["Method", "Endpoint", "Fungsi"], [
        ["GET", "/divisi", "Ambil semua divisi (dengan employees_count)"],
        ["POST", "/divisi", "Tambah divisi baru"],
        ["PUT", "/divisi/:id", "Update divisi"],
        ["DELETE", "/divisi/:id", "Hapus divisi"],
      ]),
      blank(),

      h2("DetailDivisi.jsx"),
      p("Halaman detail divisi. Menampilkan info divisi, rekap absensi keseluruhan, dan daftar karyawan beserta absensi per orang."),
      blank(),
      h3("API Call"),
      code("GET /divisi/:id"),
      p("Mengembalikan { division, employees[], summary }"),
      p("Setiap employee dalam array juga punya summary: { total, hadir, terlambat, alpha, izin }"),
      blank(),
      h3("UI Sections"),
      bullet("Info Divisi: nama divisi, total karyawan, aktif, nonaktif"),
      bullet("Summary Cards (5): Total Karyawan, Aktif, Nonaktif, Total Hadir, Total Alpha"),
      bullet("Tabel Karyawan: Nama, NIP, Jabatan, RFID UID, Status, Hadir, Terlambat, Alpha, Izin"),

      pageBreak(),

      // 14. JAM KERJA
      h1("14. Halaman Jam Kerja"),
      h2("JamKerja.jsx"),
      p("Halaman pengaturan jam kerja standar perusahaan. Full-width card."),
      blank(),
      h3("State Variables"),
      makeTable(["Variable", "Fungsi"], [
        ["form", "{ jam_masuk_standar, jam_pulang_standar, toleransi_menit }"],
        ["loading", "Status load data awal"],
        ["saving", "Status save form"],
        ["message", "{ type, text } - alert sukses/gagal"],
      ]),
      blank(),
      h3("API Calls"),
      bullet("GET /jadwal - ambil jadwal saat ini"),
      bullet("PUT /jadwal - simpan perubahan"),
      blank(),
      h3("Konversi Waktu"),
      p("API mengembalikan format HH:MM:SS, input type=\"time\" menggunakan HH:MM. Saat load: substring(0,5). Saat save: tambah ':00'."),
      blank(),
      h3("UI"),
      p("Card dengan header 'Pengaturan Jam Kerja', dua time input (masuk/pulang) dalam row, number input (toleransi menit), info box penjelasan, tombol Simpan."),

      pageBreak(),

      // 15. INPUT ABSENSI MANUAL
      h1("15. Halaman Input Absensi Manual"),
      h2("InputAbsensiManual.jsx"),
      p("Form input absensi manual untuk karyawan yang tidak bisa melakukan tap kartu RFID. Full-width card."),
      blank(),
      h3("State Variables"),
      makeTable(["Variable", "Fungsi"], [
        ["karyawan", "Array karyawan (untuk dropdown)"],
        ["form", "{ employee_id, tanggal, jam_masuk, jam_pulang, status, keterangan }"],
        ["errors", "Validasi error dari server"],
        ["submitting", "Status submit"],
        ["message", "Alert sukses/gagal"],
      ]),
      blank(),
      h3("API Calls"),
      bullet("GET /karyawan - ambil daftar karyawan untuk dropdown"),
      bullet("POST /absensi/manual - kirim data absensi manual"),
      blank(),
      h3("Default Values"),
      p("Tanggal default hari ini. Status default 'Hadir'. Setelah submit berhasil, reset employee_id, jam_masuk, jam_pulang, keterangan (tanggal tetap)."),
      blank(),
      h3("UI"),
      p("Card dengan header 'Form Absensi Manual'. Form fields: select karyawan (nama + NIP), row tanggal + status, row jam masuk + jam pulang, textarea keterangan, tombol Simpan + Reset."),

      pageBreak(),

      // 16. LAPORAN ABSENSI
      h1("16. Halaman Laporan Absensi"),
      h2("LaporanAbsensi.jsx"),
      p("Halaman laporan absensi dengan filter tanggal dan divisi, plus export Excel/PDF."),
      blank(),
      h3("State Variables"),
      makeTable(["Variable", "Fungsi"], [
        ["filter", "{ dari, sampai, divisi_id } - default 1 bulan ini"],
        ["divisi", "Array divisi untuk dropdown filter"],
        ["data", "Array record absensi"],
        ["loading", "Status loading"],
        ["fetched", "Boolean - apakah sudah pernah fetch"],
      ]),
      blank(),
      h3("API Calls"),
      bullet("GET /divisi - untuk dropdown filter"),
      bullet("GET /laporan?dari=...&sampai=...&divisi_id=... - data laporan"),
      bullet("GET /laporan/export?...&format=excel/pdf - download file"),
      blank(),
      h3("Export Mechanism"),
      p("Menggunakan responseType: 'blob' untuk menerima file binary. Membuat object URL, membuat element <a>, trigger click untuk download, lalu cleanup."),
      blank(),
      h3("UI"),
      p("Filter card (date range + divisi + tombol Terapkan), tombol Export Excel/PDF, tabel hasil (No, Nama, NIP, Tanggal, Jam Masuk, Jam Pulang, Status, Keterangan)."),

      pageBreak(),

      // 17. MOCK SERVER
      h1("17. Mock API Server"),
      h2("mock-server.cjs"),
      p("Server Express.js yang berjalan di port 8000. Mensimulasikan seluruh API Laravel backend untuk keperluan development frontend tanpa PHP."),
      blank(),
      h3("In-Memory Data"),
      makeTable(["Data", "Isi", "Jumlah"], [
        ["users", "Admin (admin@example.com)", "1"],
        ["divisions", "TI, SDM, Keuangan, Marketing", "4"],
        ["employees", "Budi, Siti, Andi, Rina, Dedi", "5"],
        ["schedule", "08:00-17:00, toleransi 15 menit", "1"],
        ["attendance", "Mix hadir/terlambat/alpha/izin", "24"],
      ]),
      blank(),
      h3("Auth Flow"),
      code("POST /api/login -> { user, token }"),
      code("Token disimpan di in-memory map 'tokens'"),
      code("authMiddleware validasi Bearer token dari header"),
      code("POST /api/logout -> hapus token dari map"),
      blank(),
      h3("SSE (Server-Sent Events)"),
      p("Menggunakan Node.js EventEmitter untuk push event ke klien:"),
      bullet("GET /api/absensi/stream - buka koneksi SSE"),
      bullet("Event 'check_in' - saat absensi manual dibuat"),
      bullet("Auto-replay event sejak lastId saat reconnect"),
      bullet("Cleanup listener saat klien disconnect"),

      pageBreak(),

      // 18. API ENDPOINTS TABLE
      h1("18. Tabel Endpoint API"),
      makeTable(["Method", "Endpoint", "Auth", "Fungsi"], [
        ["POST", "/api/login", "Tidak", "Autentikasi user"],
        ["POST", "/api/logout", "Ya", "Invalidate session"],
        ["GET", "/api/user", "Ya", "Ambil data user login"],
        ["GET", "/api/karyawan", "Ya", "List semua karyawan"],
        ["GET", "/api/karyawan/:id", "Ya", "Detail satu karyawan"],
        ["POST", "/api/karyawan", "Ya", "Tambah karyawan"],
        ["PUT", "/api/karyawan/:id", "Ya", "Update karyawan"],
        ["DELETE", "/api/karyawan/:id", "Ya", "Hapus karyawan"],
        ["GET", "/api/karyawan/:id/laporan", "Ya", "Riwayat absensi karyawan"],
        ["GET", "/api/divisi", "Ya", "List semua divisi"],
        ["GET", "/api/divisi/:id", "Ya", "Detail divisi + karyawan"],
        ["POST", "/api/divisi", "Ya", "Tambah divisi"],
        ["PUT", "/api/divisi/:id", "Ya", "Update divisi"],
        ["DELETE", "/api/divisi/:id", "Ya", "Hapus divisi"],
        ["GET", "/api/jadwal", "Ya", "Ambil jam kerja"],
        ["PUT", "/api/jadwal", "Ya", "Update jam kerja"],
        ["POST", "/api/absensi/manual", "Ya", "Input absensi manual"],
        ["GET", "/api/laporan", "Ya", "Laporan absensi (filter)"],
        ["GET", "/api/laporan/export", "Ya", "Export Excel/PDF"],
        ["GET", "/api/dashboard", "Ya", "Statistik dashboard"],
        ["GET", "/api/absensi/stream", "Query", "SSE real-time absensi"],
      ]),

      pageBreak(),

      // 19. AUTH FLOW
      h1("19. Alur Autentikasi (Auth Flow)"),
      p("Diagram alur lengkap autentikasi dari login sampai logout:"),
      blank(),
      h3("Login Flow"),
      code("1. User buka /login"),
      code("2. Isi email + password, klik Login"),
      code("3. Login.jsx panggil onLogin(email, password)"),
      code("4. useAuth.login() -> POST /api/login { email, password }"),
      code("5. Server validasi, return { user, token }"),
      code("6. Simpan token + user ke localStorage"),
      code("7. setState user = { ...userData }"),
      code("8. App.jsx detect user != null -> redirect ke /"),
      code("9. AdminLayout render sidebar + topbar + Outlet"),
      blank(),

      h3("Authenticated Request Flow"),
      code("1. Component panggil api.get('/karyawan')"),
      code("2. Request interceptor baca token dari localStorage"),
      code("3. Tambah header: Authorization: Bearer mock_token_xxx"),
      code("4. Request dikirim ke server"),
      code("5. authMiddleware di server validasi token"),
      code("6. Response dikembalikan ke component"),
      blank(),

      h3("401 Error Flow"),
      code("1. Server return 401 Unauthorized"),
      code("2. Response interceptor detect status 401"),
      code("3. Hapus token + user dari localStorage"),
      code("4. Redirect ke /login (window.location.href)"),
      code("5. User harus login ulang"),
      blank(),

      h3("Logout Flow"),
      code("1. Klik dropdown user -> Logout"),
      code("2. AdminLayout.handleLogout()"),
      code("3. Panggil onLogout() -> useAuth.logout()"),
      code("4. POST /api/logout (invalidate token di server)"),
      code("5. Hapus token + user dari localStorage"),
      code("6. setState user = null"),
      code("7. navigate('/login')"),

      pageBreak(),

      // 20. REALTIME FLOW
      h1("20. Alur Real-time (SSE)"),
      p("Diagram alur Server-Sent Events untuk update absensi real-time di Dashboard:"),
      blank(),
      h3("Connection Flow"),
      code("1. Dashboard mount -> useRealtime() dipanggil"),
      code("2. Hook buat EventSource ke /absensi/stream"),
      code("3. Kirim query: lastId=0&token=xxx"),
      code("4. Server buka SSE connection (keep-alive)"),
      code("5. Server kirim event sejak lastId"),
      code("6. Hook dengarkan event check_in dan checkout"),
      blank(),

      h3("Event Reception Flow"),
      code("1. Karyawan tap kartu RFID di mesin"),
      code("2. Backend proses, buat record absensi"),
      code("3. Backend emit event ke SSE broadcaster"),
      code("4. Server push event ke semua connected client"),
      code("5. useRealtime terima event"),
      code("6. Update events state (prepend, max 20)"),
      code("7. Dashboard.jsx useEffect detect realtimeEvents berubah"),
      code("8. Merge ke recent list (deduplicate)"),
      code("9. Update stat cards counters"),
      code("10. Tabel auto-refresh tanpa reload halaman"),
      blank(),

      h3("Reconnection Flow"),
      code("1. Koneksi SSE terputus (error event)"),
      code("2. Tutup EventSource"),
      code("3. Tunggu 3 detik (setTimeout)"),
      code("4. Buat EventSource baru dengan lastId terakhir"),
      code("5. Server replay event sejak lastId"),
      code("6. Data tetap sinkron"),

      pageBreak(),

      // 21. ARCHITECTURE
      h1("21. Arsitektur Data & State Management"),
      h2("State Management"),
      p("Proyek ini menggunakan pendekatan useState local (component-level state) tanpa library state management global seperti Redux atau Context API. Setiap halaman bertanggung jawab mengelola state-nya sendiri."),
      blank(),
      h2("Data Flow Architecture"),
      code("  localStorage (token, user)"),
      code("         |"),
      code("    useAuth hook"),
      code("         |"),
      code("    App.jsx (routes + auth guard)"),
      code("         |"),
      code("    AdminLayout (sidebar + topbar + Outlet)"),
      code("         |"),
      code("    Page Components (Dashboard, DataKaryawan, etc.)"),
      code("         |"),
      code("    api/axios.js (interceptors inject token)"),
      code("         |"),
      code("    Backend / mock-server.cjs"),
      code("         |"),
      code("    useRealtime hook (SSE) -> Dashboard live updates"),
      blank(),
      h2("Key Design Patterns"),
      bullet("Component Composition: AdminLayout sebagai wrapper, Outlet untuk child routes"),
      bullet("Custom Hooks: useAuth (auth), useDebounce (utility), useRealtime (SSE)"),
      bullet("Reusable Components: FormInput, StatusBadge, Modal, EmptyState, LoadingSpinner"),
      bullet("Interceptors Pattern: Axios interceptors untuk auth dan error handling"),
      bullet("Optimistic Updates: Realtime events langsung merge ke state tanpa refetch"),
      bullet("Debounced Search: Delay 300ms untuk performa pencarian"),
      blank(),
      h2("Routing Strategy"),
      p("Menggunakan React Router v7 dengan BrowserRouter untuk client-side routing. Semua route dilindungi oleh ProtectedRoute yang memeriksa autentikasi. Route detail (/data-karyawan/:id, /data-divisi/:id) menggunakan useParams untuk mengambil ID dari URL."),

      blank(), blank(),
      p("\u2014 End of Documentation \u2014"),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync("Dokumentasi_Frontend_Absensi_IoT.docx", buffer);
console.log("Dokumentasi_Frontend_Absensi_IoT.docx created successfully!");
