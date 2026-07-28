const express = require("express");
const cors = require("cors");
const { EventEmitter } = require("events");

const app = express();
app.use(cors());
app.use(express.json());

const sseEmitter = new EventEmitter();
sseEmitter.setMaxListeners(50);

// --- In-memory data ---
let users = [
  { id: 1, nama: "Admin", email: "admin@example.com", password: "password", role: "admin" },
];

let divisions = [
  { id: 1, nama_divisi: "Teknologi Informasi", created_at: "2026-07-17", updated_at: "2026-07-17" },
  { id: 2, nama_divisi: "Sumber Daya Manusia", created_at: "2026-07-17", updated_at: "2026-07-17" },
  { id: 3, nama_divisi: "Keuangan", created_at: "2026-07-17", updated_at: "2026-07-17" },
  { id: 4, nama_divisi: "Marketing", created_at: "2026-07-17", updated_at: "2026-07-17" },
];

let employees = [
  { id: 1, nama: "Budi Santoso", nip: "001", jabatan: "Staff", divisi_id: 1, rfid_uid: "A1B2C3", status: "aktif", created_at: "2026-07-17", updated_at: "2026-07-17" },
  { id: 2, nama: "Siti Aminah", nip: "002", jabatan: "Staff", divisi_id: 2, rfid_uid: "D4E5F6", status: "aktif", created_at: "2026-07-17", updated_at: "2026-07-17" },
  { id: 3, nama: "Andi Wijaya", nip: "003", jabatan: "Supervisor", divisi_id: 1, rfid_uid: "G7H8I9", status: "aktif", created_at: "2026-07-17", updated_at: "2026-07-17" },
  { id: 4, nama: "Rina Susanti", nip: "004", jabatan: "Staff", divisi_id: 4, rfid_uid: "J1K2L3", status: "aktif", created_at: "2026-07-17", updated_at: "2026-07-17" },
  { id: 5, nama: "Dedi Kurniawan", nip: "005", jabatan: "Manager", divisi_id: 3, rfid_uid: "M4N5O6", status: "nonaktif", created_at: "2026-07-17", updated_at: "2026-07-17" },
];

let schedule = { id: 1, jam_masuk_standar: "08:00:00", jam_pulang_standar: "17:00:00", toleransi_menit: 15, created_at: "2026-07-17", updated_at: "2026-07-17" };

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; }

let attendance = [
  // Budi Santoso (id:1) - good attendance
  { id: 1, employee_id: 1, tanggal: today(), jam_masuk: "07:55:00", jam_pulang: null, status: "Hadir", keterangan: null, input_by: null, created_at: today(), updated_at: today() },
  { id: 2, employee_id: 1, tanggal: daysAgo(1), jam_masuk: "07:50:00", jam_pulang: "17:05:00", status: "Hadir", keterangan: null, input_by: null, created_at: daysAgo(1), updated_at: daysAgo(1) },
  { id: 3, employee_id: 1, tanggal: daysAgo(2), jam_masuk: "07:58:00", jam_pulang: "17:00:00", status: "Hadir", keterangan: null, input_by: null, created_at: daysAgo(2), updated_at: daysAgo(2) },
  { id: 4, employee_id: 1, tanggal: daysAgo(3), jam_masuk: "08:05:00", jam_pulang: "17:10:00", status: "Terlambat", keterangan: null, input_by: null, created_at: daysAgo(3), updated_at: daysAgo(3) },
  { id: 5, employee_id: 1, tanggal: daysAgo(5), jam_masuk: null, jam_pulang: null, status: "Alpha", keterangan: "Tidak hadir tanpa keterangan", input_by: null, created_at: daysAgo(5), updated_at: daysAgo(5) },
  { id: 6, employee_id: 1, tanggal: daysAgo(7), jam_masuk: "07:45:00", jam_pulang: "17:00:00", status: "Hadir", keterangan: null, input_by: null, created_at: daysAgo(7), updated_at: daysAgo(7) },
  { id: 7, employee_id: 1, tanggal: daysAgo(8), jam_masuk: null, jam_pulang: null, status: "Izin", keterangan: "Izin keperluan keluarga", input_by: null, created_at: daysAgo(8), updated_at: daysAgo(8) },
  { id: 8, employee_id: 1, tanggal: daysAgo(10), jam_masuk: "08:15:00", jam_pulang: "17:00:00", status: "Terlambat", keterangan: null, input_by: null, created_at: daysAgo(10), updated_at: daysAgo(10) },
  { id: 9, employee_id: 1, tanggal: daysAgo(12), jam_masuk: "07:52:00", jam_pulang: "17:05:00", status: "Hadir", keterangan: null, input_by: null, created_at: daysAgo(12), updated_at: daysAgo(12) },

  // Siti Aminah (id:2) - some absences
  { id: 10, employee_id: 2, tanggal: today(), jam_masuk: "08:20:00", jam_pulang: null, status: "Terlambat", keterangan: null, input_by: null, created_at: today(), updated_at: today() },
  { id: 11, employee_id: 2, tanggal: daysAgo(1), jam_masuk: "08:00:00", jam_pulang: "17:00:00", status: "Hadir", keterangan: null, input_by: null, created_at: daysAgo(1), updated_at: daysAgo(1) },
  { id: 12, employee_id: 2, tanggal: daysAgo(3), jam_masuk: null, jam_pulang: null, status: "Alpha", keterangan: "Tidak hadir tanpa keterangan", input_by: null, created_at: daysAgo(3), updated_at: daysAgo(3) },
  { id: 13, employee_id: 2, tanggal: daysAgo(4), jam_masuk: null, jam_pulang: null, status: "Alpha", keterangan: "Tidak hadir tanpa keterangan", input_by: null, created_at: daysAgo(4), updated_at: daysAgo(4) },
  { id: 14, employee_id: 2, tanggal: daysAgo(6), jam_masuk: null, jam_pulang: null, status: "Izin", keterangan: "Izin sakit, ada surat dokter", input_by: null, created_at: daysAgo(6), updated_at: daysAgo(6) },
  { id: 15, employee_id: 2, tanggal: daysAgo(8), jam_masuk: "07:55:00", jam_pulang: "17:00:00", status: "Hadir", keterangan: null, input_by: null, created_at: daysAgo(8), updated_at: daysAgo(8) },
  { id: 16, employee_id: 2, tanggal: daysAgo(10), jam_masuk: null, jam_pulang: null, status: "Alpha", keterangan: "Tidak hadir tanpa keterangan", input_by: null, created_at: daysAgo(10), updated_at: daysAgo(10) },

  // Andi Wijaya (id:3) - mostly present
  { id: 17, employee_id: 3, tanggal: daysAgo(1), jam_masuk: "07:50:00", jam_pulang: "17:05:00", status: "Hadir", keterangan: null, input_by: null, created_at: daysAgo(1), updated_at: daysAgo(1) },
  { id: 18, employee_id: 3, tanggal: daysAgo(2), jam_masuk: "07:48:00", jam_pulang: "17:00:00", status: "Hadir", keterangan: null, input_by: null, created_at: daysAgo(2), updated_at: daysAgo(2) },
  { id: 19, employee_id: 3, tanggal: daysAgo(3), jam_masuk: "08:10:00", jam_pulang: "17:15:00", status: "Terlambat", keterangan: null, input_by: null, created_at: daysAgo(3), updated_at: daysAgo(3) },
  { id: 20, employee_id: 3, tanggal: daysAgo(5), jam_masuk: "07:55:00", jam_pulang: "17:00:00", status: "Hadir", keterangan: null, input_by: null, created_at: daysAgo(5), updated_at: daysAgo(5) },

  // Rina Susanti (id:4) - mix
  { id: 21, employee_id: 4, tanggal: today(), jam_masuk: "07:45:00", jam_pulang: null, status: "Hadir", keterangan: null, input_by: null, created_at: today(), updated_at: today() },
  { id: 22, employee_id: 4, tanggal: daysAgo(2), jam_masuk: null, jam_pulang: null, status: "Izin", keterangan: "Izin dinas luar kota", input_by: null, created_at: daysAgo(2), updated_at: daysAgo(2) },
  { id: 23, employee_id: 4, tanggal: daysAgo(4), jam_masuk: null, jam_pulang: null, status: "Alpha", keterangan: "Tidak hadir tanpa keterangan", input_by: null, created_at: daysAgo(4), updated_at: daysAgo(4) },

  // Dedi Kurniawan (id:5) - inactive, no recent attendance
  { id: 24, employee_id: 5, tanggal: daysAgo(15), jam_masuk: "08:30:00", jam_pulang: "17:00:00", status: "Terlambat", keterangan: null, input_by: null, created_at: daysAgo(15), updated_at: daysAgo(15) },
];

let tokens = {};
let nextId = { employee: 6, division: 5, attendance: 25, user: 2 };

function today() { return new Date().toISOString().split("T")[0]; }
function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; }

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Unauthorized" });
  const token = auth.split(" ")[1];
  if (!tokens[token]) return res.status(401).json({ success: false, message: "Invalid token" });
  req.user = tokens[token];
  next();
}

function attachDivision(arr) {
  return arr.map((e) => ({ ...e, division: divisions.find((d) => d.id === e.divisi_id) || null }));
}
function attachEmployee(arr) {
  return arr.map((a) => ({ ...a, employee: employees.find((e) => e.id === a.employee_id) || null }));
}

// === AUTH ===
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user || user.password !== password) {
    return res.status(422).json({ success: false, message: "Email atau password salah.", errors: { email: ["Email atau password salah."] } });
  }
  const token = "mock_token_" + Math.random().toString(36).slice(2);
  tokens[token] = user;
  const { password: _, ...safeUser } = user;
  res.json({ success: true, data: { user: safeUser, token } });
});

app.post("/api/logout", authMiddleware, (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  delete tokens[token];
  res.json({ success: true, message: "Logout berhasil" });
});

app.get("/api/user", authMiddleware, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json({ success: true, data: safeUser });
});

// === KARYAWAN ===
app.get("/api/karyawan", authMiddleware, (req, res) => {
  res.json({ success: true, data: attachDivision(employees) });
});

app.get("/api/karyawan/:id", authMiddleware, (req, res) => {
  const emp = employees.find((e) => e.id === parseInt(req.params.id));
  if (!emp) return res.status(404).json({ success: false, message: "Karyawan tidak ditemukan" });
  res.json({ success: true, data: { ...emp, division: divisions.find((d) => d.id === emp.divisi_id) || null } });
});

app.post("/api/karyawan", authMiddleware, (req, res) => {
  const { nama, nip, jabatan, divisi_id, rfid_uid, status } = req.body;
  const errors = {};
  if (!nama) errors.nama = ["Nama wajib diisi"];
  if (!nip) errors.nip = ["NIP wajib diisi"];
  else if (employees.find((e) => e.nip === nip)) errors.nip = ["NIP sudah digunakan"];
  if (!rfid_uid) errors.rfid_uid = ["RFID UID wajib diisi"];
  else if (employees.find((e) => e.rfid_uid === rfid_uid)) errors.rfid_uid = ["RFID UID sudah digunakan"];
  if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });
  const emp = { id: nextId.employee++, nama, nip, jabatan: jabatan || null, divisi_id: divisi_id || null, rfid_uid, status: status || "aktif", created_at: today(), updated_at: today() };
  employees.push(emp);
  res.status(201).json({ success: true, message: "Karyawan berhasil ditambahkan", data: emp });
});

app.put("/api/karyawan/:id", authMiddleware, (req, res) => {
  const idx = employees.findIndex((e) => e.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: "Karyawan tidak ditemukan" });
  const { nama, nip, jabatan, divisi_id, rfid_uid, status } = req.body;
  const errors = {};
  if (nip && employees.find((e) => e.nip === nip && e.id !== parseInt(req.params.id))) errors.nip = ["NIP sudah digunakan"];
  if (rfid_uid && employees.find((e) => e.rfid_uid === rfid_uid && e.id !== parseInt(req.params.id))) errors.rfid_uid = ["RFID UID sudah digunakan"];
  if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });
  employees[idx] = { ...employees[idx], nama: nama || employees[idx].nama, nip: nip || employees[idx].nip, jabatan: jabatan !== undefined ? jabatan : employees[idx].jabatan, divisi_id: divisi_id !== undefined ? divisi_id : employees[idx].divisi_id, rfid_uid: rfid_uid || employees[idx].rfid_uid, status: status || employees[idx].status, updated_at: today() };
  res.json({ success: true, message: "Karyawan berhasil diupdate", data: employees[idx] });
});

app.delete("/api/karyawan/:id", authMiddleware, (req, res) => {
  const idx = employees.findIndex((e) => e.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: "Karyawan tidak ditemukan" });
  employees.splice(idx, 1);
  res.json({ success: true, message: "Karyawan berhasil dihapus" });
});

app.get("/api/karyawan/:id/laporan", authMiddleware, (req, res) => {
  const emp = employees.find((e) => e.id === parseInt(req.params.id));
  if (!emp) return res.status(404).json({ success: false, message: "Karyawan tidak ditemukan" });
  const { dari, sampai } = req.query;
  let data = attendance.filter((a) => a.employee_id === emp.id);
  if (dari) data = data.filter((a) => a.tanggal >= dari);
  if (sampai) data = data.filter((a) => a.tanggal <= sampai);
  data.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  const summary = {
    total: data.length,
    hadir: data.filter((a) => a.status === "Hadir").length,
    terlambat: data.filter((a) => a.status === "Terlambat").length,
    alpha: data.filter((a) => a.status === "Alpha").length,
    izin: data.filter((a) => a.status === "Izin").length,
  };
  res.json({ success: true, data: { employee: { ...emp, division: divisions.find((d) => d.id === emp.divisi_id) || null }, absensi: data, summary } });
});

// === DIVISI ===
app.get("/api/divisi", authMiddleware, (req, res) => {
  const data = divisions.map((d) => ({ ...d, employees_count: employees.filter((e) => e.divisi_id === d.id).length }));
  res.json({ success: true, data });
});

app.get("/api/divisi/:id", authMiddleware, (req, res) => {
  const div = divisions.find((d) => d.id === parseInt(req.params.id));
  if (!div) return res.status(404).json({ success: false, message: "Divisi tidak ditemukan" });
  const emps = employees
    .filter((e) => e.divisi_id === div.id)
    .map((e) => {
      const empAttend = attendance.filter((a) => a.employee_id === e.id);
      return {
        ...e,
        summary: {
          total: empAttend.length,
          hadir: empAttend.filter((a) => a.status === "Hadir").length,
          terlambat: empAttend.filter((a) => a.status === "Terlambat").length,
          alpha: empAttend.filter((a) => a.status === "Alpha").length,
          izin: empAttend.filter((a) => a.status === "Izin").length,
        },
      };
    });
  const totalAttend = attendance.filter((a) => employees.find((e) => e.id === a.employee_id && e.divisi_id === div.id));
  const divSummary = {
    total_karyawan: emps.length,
    aktif: emps.filter((e) => e.status === "aktif").length,
    nonaktif: emps.filter((e) => e.status === "nonaktif").length,
    total_absensi: totalAttend.length,
    hadir: totalAttend.filter((a) => a.status === "Hadir").length,
    terlambat: totalAttend.filter((a) => a.status === "Terlambat").length,
    alpha: totalAttend.filter((a) => a.status === "Alpha").length,
    izin: totalAttend.filter((a) => a.status === "Izin").length,
  };
  res.json({ success: true, data: { division: div, employees: emps, summary: divSummary } });
});

app.post("/api/divisi", authMiddleware, (req, res) => {
  const { nama_divisi } = req.body;
  const errors = {};
  if (!nama_divisi) errors.nama_divisi = ["Nama divisi wajib diisi"];
  else if (divisions.find((d) => d.nama_divisi === nama_divisi)) errors.nama_divisi = ["Nama divisi sudah digunakan"];
  if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });
  const div = { id: nextId.division++, nama_divisi, created_at: today(), updated_at: today() };
  divisions.push(div);
  res.status(201).json({ success: true, message: "Divisi berhasil ditambahkan", data: div });
});

app.put("/api/divisi/:id", authMiddleware, (req, res) => {
  const idx = divisions.findIndex((d) => d.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: "Divisi tidak ditemukan" });
  const { nama_divisi } = req.body;
  const errors = {};
  if (nama_divisi && divisions.find((d) => d.nama_divisi === nama_divisi && d.id !== parseInt(req.params.id))) errors.nama_divisi = ["Nama divisi sudah digunakan"];
  if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });
  divisions[idx] = { ...divisions[idx], nama_divisi: nama_divisi || divisions[idx].nama_divisi, updated_at: today() };
  res.json({ success: true, message: "Divisi berhasil diupdate", data: divisions[idx] });
});

app.delete("/api/divisi/:id", authMiddleware, (req, res) => {
  const idx = divisions.findIndex((d) => d.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: "Divisi tidak ditemukan" });
  divisions.splice(idx, 1);
  res.json({ success: true, message: "Divisi berhasil dihapus" });
});

// === JADWAL ===
app.get("/api/jadwal", authMiddleware, (req, res) => {
  res.json({ success: true, data: schedule });
});

app.put("/api/jadwal", authMiddleware, (req, res) => {
  const { jam_masuk_standar, jam_pulang_standar, toleransi_menit } = req.body;
  schedule = { ...schedule, jam_masuk_standar: jam_masuk_standar || schedule.jam_masuk_standar, jam_pulang_standar: jam_pulang_standar || schedule.jam_pulang_standar, toleransi_menit: toleransi_menit !== undefined ? toleransi_menit : schedule.toleransi_menit, updated_at: today() };
  res.json({ success: true, message: "Jadwal kerja berhasil diupdate", data: schedule });
});

// === ABSENSI MANUAL ===
app.post("/api/absensi/manual", authMiddleware, (req, res) => {
  const { employee_id, tanggal, jam_masuk, jam_pulang, status, keterangan } = req.body;
  const errors = {};
  if (!employee_id) errors.employee_id = ["Karyawan wajib dipilih"];
  if (!tanggal) errors.tanggal = ["Tanggal wajib diisi"];
  if (!status) errors.status = ["Status wajib dipilih"];
  if (Object.keys(errors).length) return res.status(422).json({ success: false, errors });
  if (attendance.find((a) => a.employee_id === employee_id && a.tanggal === tanggal)) {
    return res.status(400).json({ success: false, message: "Absensi untuk karyawan ini tanggal ini sudah ada" });
  }
  const abs = { id: nextId.attendance++, employee_id, tanggal, jam_masuk: jam_masuk || null, jam_pulang: jam_pulang || null, status, keterangan: keterangan || null, input_by: req.user.id, created_at: today(), updated_at: today() };
  attendance.push(abs);
  const emp = employees.find((e) => e.id === employee_id);
  const enriched = { ...abs, employee: emp ? { ...emp, division: divisions.find((d) => d.id === emp.divisi_id) || null } : null };
  sseEmitter.emit("absensi", { type: "check_in", data: enriched });
  res.status(201).json({ success: true, message: "Absensi manual berhasil ditambahkan", data: abs });
});

// === LAPORAN ===
app.get("/api/laporan", authMiddleware, (req, res) => {
  const { dari, sampai, divisi_id } = req.query;
  let data = [...attendance];
  if (dari) data = data.filter((a) => a.tanggal >= dari);
  if (sampai) data = data.filter((a) => a.tanggal <= sampai);
  if (divisi_id) data = data.filter((a) => { const emp = employees.find((e) => e.id === a.employee_id); return emp && emp.divisi_id === parseInt(divisi_id); });
  data = attachEmployee(data).map((a) => ({ ...a, employee: a.employee ? { ...a.employee, division: divisions.find((d) => d.id === a.employee.divisi_id) || null } : null }));
  data.sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.employee_id - b.employee_id);
  res.json({ success: true, data });
});

app.get("/api/laporan/export", authMiddleware, (req, res) => {
  res.json({ success: true, message: "Export belum tersedia di mock server" });
});

// === DASHBOARD (bonus - not in backend) ===
app.get("/api/dashboard", authMiddleware, (req, res) => {
  const todayStr = today();
  const todayAtt = attendance.filter((a) => a.tanggal === todayStr);
  res.json({
    success: true,
    data: {
      total_karyawan: employees.length,
      hadir: todayAtt.filter((a) => a.status === "Hadir").length,
      terlambat: todayAtt.filter((a) => a.status === "Terlambat").length,
      tidak_hadir: employees.length - todayAtt.length,
    },
  });
});

app.get("/api/dashboard/terlambat", authMiddleware, (req, res) => {
  const todayStr = today();
  const standarParts = schedule.jam_masuk_standar.split(":").map(Number);
  const standarMenit = standarParts[0] * 60 + standarParts[1];

  const data = attendance
    .filter((a) => a.tanggal === todayStr && a.status === "Terlambat")
    .map((a) => {
      const emp = employees.find((e) => e.id === a.employee_id);
      const div = emp ? divisions.find((d) => d.id === emp.divisi_id) : null;
      let keterlambatan = 0;
      if (a.jam_masuk) {
        const parts = a.jam_masuk.split(":").map(Number);
        const masukMenit = parts[0] * 60 + parts[1];
        keterlambatan = masukMenit - standarMenit;
      }
      return {
        id: a.id,
        nama: emp ? emp.nama : "-",
        nip: emp ? emp.nip : "-",
        divisi: div ? div.nama_divisi : "-",
        jam_masuk: a.jam_masuk || "-",
        jam_standar: schedule.jam_masuk_standar,
        keterlambatan,
      };
    });
  res.json({ success: true, data });
});

app.get("/api/dashboard/hadir", authMiddleware, (req, res) => {
  const todayStr = today();
  const data = attendance
    .filter((a) => a.tanggal === todayStr && a.status === "Hadir")
    .map((a) => {
      const emp = employees.find((e) => e.id === a.employee_id);
      const div = emp ? divisions.find((d) => d.id === emp.divisi_id) : null;
      return {
        id: a.id,
        nama: emp ? emp.nama : "-",
        nip: emp ? emp.nip : "-",
        divisi: div ? div.nama_divisi : "-",
        jam_masuk: a.jam_masuk || "-",
      };
    });
  res.json({ success: true, data });
});

app.get("/api/dashboard/tidak-hadir", authMiddleware, (req, res) => {
  const todayStr = today();
  const hadirIds = attendance
    .filter((a) => a.tanggal === todayStr && (a.status === "Hadir" || a.status === "Terlambat"))
    .map((a) => a.employee_id);
  const data = employees
    .filter((e) => e.status === "aktif" && !hadirIds.includes(e.id))
    .map((e) => {
      const div = divisions.find((d) => d.id === e.divisi_id);
      return {
        id: e.id,
        nama: e.nama,
        nip: e.nip,
        divisi: div ? div.nama_divisi : "-",
      };
    });
  res.json({ success: true, data });
});

// === SSE STREAM ===
app.get("/api/absensi/stream", (req, res) => {
  const { token, lastId } = req.query;
  if (!token || !tokens[token]) return res.status(401).json({ success: false, message: "Unauthorized" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write("retry: 3000\n\n");

  const sinceId = parseInt(lastId) || 0;
  const recent = attendance.filter((a) => a.id > sinceId);
  recent.forEach((a) => {
    const emp = employees.find((e) => e.id === a.employee_id);
    const enriched = { ...a, employee: emp ? { ...emp, division: divisions.find((d) => d.id === emp.divisi_id) || null } : null };
    const eventType = a.jam_masuk && !a.jam_pulang ? "check_in" : "checkout";
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(enriched)}\n\n`);
  });

  const handler = (event) => {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
  };
  sseEmitter.on("absensi", handler);

  req.on("close", () => {
    sseEmitter.off("absensi", handler);
  });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log(`Login: POST http://localhost:${PORT}/api/login`);
  console.log(`Email: admin@example.com | Password: password`);
});
