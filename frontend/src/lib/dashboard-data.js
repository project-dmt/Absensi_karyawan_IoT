const STATUS_META = [
  { key: "Hadir", label: "Hadir", fill: "var(--chart-1)" },
  { key: "Terlambat", label: "Terlambat", fill: "var(--chart-2)" },
  { key: "Izin", label: "Izin", fill: "var(--chart-4)" },
  { key: "Sakit", label: "Sakit", fill: "var(--chart-5)" },
  { key: "Alpha", label: "Alpha", fill: "var(--chart-3)" },
];

export function getJakartaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function isToday(item, today) {
  const date = item?.tanggal ?? item?.date;
  if (date) {
    // String tanggal murni (YYYY-MM-DD) dibandingkan langsung;
    // ISO timestamp dari backend sudah UTC — bandingkan lewat zona Jakarta
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return String(date) === today;
    const parsed = new Date(date);
    return !Number.isNaN(parsed.getTime()) && getJakartaDate(parsed) === today;
  }
  if (item?.created_at) {
    const parsed = new Date(item.created_at);
    return !Number.isNaN(parsed.getTime()) && getJakartaDate(parsed) === today;
  }
  return true;
}

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (item?.id === undefined || item?.id === null) return true;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function mergeTodayAttendance(laporan, realtimeEvents, today) {
  return dedupeById([...realtimeEvents, ...laporan].filter((item) => isToday(item, today)));
}

function nipFor(record) {
  return record?.employee?.nip ?? record?.nip ?? "";
}

function parseHour(value) {
  if (value === undefined || value === null) return null;
  const match = String(value).trim().match(/^(\d{1,2})(?::([0-5]\d))?(?::[0-5]\d)?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  return hour >= 0 && hour <= 23 ? hour : null;
}

function divisionName(record) {
  const employee = record?.employee;
  if (!employee) return null;
  const division = employee.division ?? employee.divisi;
  if (typeof division === "string" || typeof division === "number") {
    return String(division).trim() || null;
  }
  if (!division || typeof division !== "object") return null;
  const name = division.nama_divisi ?? division.nama ?? division.name;
  return name === undefined || name === null || !String(name).trim() ? null : String(name).trim();
}

export function buildDashboardData({
  karyawan = [],
  laporan = [],
  realtimeEvents = [],
  today,
} = {}) {
  const activeEmployees = (Array.isArray(karyawan) ? karyawan : []).filter(
    (employee) => employee?.status === "aktif"
  );
  const currentDay = today ?? getJakartaDate();
  const reports = Array.isArray(laporan) ? laporan : [];
  const events = Array.isArray(realtimeEvents) ? realtimeEvents : [];
  const attendance = mergeTodayAttendance(reports, events, currentDay);
  const liveEvents = dedupeById(events.filter((event) => isToday(event, currentDay)));
  const activeNips = new Set(activeEmployees.map((employee) => employee.nip));
  const activeAttendance = attendance.filter((record) => activeNips.has(nipFor(record)));
  const recordByNip = new Map();
  for (const record of activeAttendance) {
    const nip = nipFor(record);
    if (!recordByNip.has(nip)) recordByNip.set(nip, record);
  }

  // Satu status kanonik per karyawan aktif hari ini; tanpa record = Alpha.
  const canonicalAttendance = activeEmployees.map((employee) => {
    const record = recordByNip.get(employee.nip);
    return record ?? {
      id: `implicit-alpha-${employee.id ?? employee.nip}`,
      status: "Alpha",
      nip: employee.nip,
      employee,
    };
  });

  const counts = Object.fromEntries(STATUS_META.map(({ key }) => [key, 0]));
  for (const record of canonicalAttendance) {
    if (Object.hasOwn(counts, record?.status)) counts[record.status] += 1;
  }

  const hadir = counts.Hadir;
  const terlambat = counts.Terlambat;
  const izin = counts.Izin;
  const sakit = counts.Sakit;
  const stats = {
    totalKaryawan: activeEmployees.length,
    hadir,
    terlambat,
    tidakHadir: counts.Alpha + izin + sakit,
  };

  const statusSeries = STATUS_META.map((status) => ({
    ...status,
    value: counts[status.key],
  }));

  const hourlySeries = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}:00`,
    hadir: 0,
    terlambat: 0,
  }));
  for (const record of activeAttendance) {
    if (record?.status !== "Hadir" && record?.status !== "Terlambat") continue;
    const hour = parseHour(record.jam_masuk || record.jam);
    if (hour === null) continue;
    hourlySeries[hour][record.status === "Hadir" ? "hadir" : "terlambat"] += 1;
  }

  const divisions = new Map();
  for (const record of activeAttendance) {
    if (record?.status !== "Hadir" && record?.status !== "Terlambat") continue;
    const division = divisionName(record);
    if (!division) continue;
    const row = divisions.get(division) ?? { division, hadir: 0, terlambat: 0, total: 0 };
    row[record.status === "Hadir" ? "hadir" : "terlambat"] += 1;
    row.total += 1;
    divisions.set(division, row);
  }

  const rankedDivisions = [...divisions.values()].sort(
    (a, b) => b.total - a.total || a.division.localeCompare(b.division)
  );
  const divisionSeries = rankedDivisions.slice(0, 8);
  if (rankedDivisions.length > 8) {
    const lainnya = rankedDivisions.slice(8).reduce(
      (aggregate, row) => ({
        division: "Lainnya",
        hadir: aggregate.hadir + row.hadir,
        terlambat: aggregate.terlambat + row.terlambat,
        total: aggregate.total + row.total,
      }),
      { division: "Lainnya", hadir: 0, terlambat: 0, total: 0 }
    );
    divisionSeries.push(lainnya);
  }

  return {
    activeEmployees,
    attendance,
    liveEvents,
    stats,
    statusSeries,
    hourlySeries,
    divisionSeries,
  };
}
