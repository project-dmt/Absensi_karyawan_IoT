# Modern Absensi Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans (chosen by the executor). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah Dashboard absensi menjadi operations dashboard modern yang cepat dipahami admin: status hari ini, pola tap, distribusi divisi, dan aktivitas realtime dalam satu layar responsif.

**Architecture:** Data tetap berasal dari `useKaryawanList`, `useLaporan({ dari: today, sampai: today })`, dan `useRealtime`; tidak ada endpoint baru pada fase pertama. Dashboard menormalisasi satu dataset hari ini, lalu menurunkan data chart secara memoized. UI memakai komponen shadcn existing dan `Chart` shadcn berbasis Recharts; chart dibuat presentasional, bukan menggantikan halaman `LaporanGrafik`.

**Tech Stack:** React 19, Vite 8, JavaScript/JSX, Tailwind CSS v4, shadcn/ui base-nova/base, Lucide, Recharts melalui `@/components/ui/chart`.

**Spec:** Permintaan user: dashboard saat ini terlihat boring/usang; buat UI dashboard modern dengan beberapa grafik menarik, gunakan komponen shadcn/ui.

## Global Constraints

- Pertahankan kontrak hook dan API yang ada: `useKaryawanList`, `useLaporan`, `useRealtime`.
- Tidak menambah endpoint/backend pada fase ini; chart diturunkan dari data yang sudah tersedia.
- Gunakan semantic shadcn tokens (`bg-background`, `bg-card`, `text-muted-foreground`, `border`) dan komponen shadcn; hindari raw color utility untuk layout baru.
- Gunakan `ToggleGroup` untuk pilihan periode/tampilan, bukan loop `Button` dengan active state manual.
- Semua chart harus punya label/tooltip yang bisa dibaca, legend bila perlu, empty state, loading state, dan tetap usable pada lebar mobile.
- Jangan menghapus fitur tabel “Absensi Terbaru Hari Ini”, filter karyawan aktif, dedupe SSE, atau filter tanggal Asia/Jakarta.
- Dashboard boleh memakai data realtime untuk activity feed, tetapi metrik divisi hanya dari record laporan yang memiliki relasi employee/divisi; jangan mengarang divisi dari event SSE.
- Hormati `prefers-reduced-motion`; tidak menambah animasi dekoratif berulang.

## Design Direction

**Product mood:** panel kendali operasional untuk admin sekolah/kantor—tenang, tajam, dan informatif. Satu aksen visual utama: bar status live dengan pulse halus; area lain disiplin dan tidak penuh gradient.

**Palette:** gunakan token shadcn existing sebagai fondasi, dengan peran berikut:
- `background`: slate sangat muda untuk canvas.
- `card`: putih untuk permukaan data.
- `foreground`: navy/slate gelap untuk angka dan heading.
- `primary`: teal/slate brand existing untuk kontrol aktif dan link.
- `chart-1`: teal untuk Hadir.
- `chart-2`: amber untuk Terlambat.
- `chart-3`: blue/cyan untuk Izin.
- `chart-4`: violet untuk Sakit.
- `chart-5`: rose untuk Alpha/Tidak Hadir.

Tidak memakai gradient sebagai default setiap card; warna status hanya untuk encoding data.

**Typography:** tetap `Geist Variable` yang sudah dipakai project. Heading dashboard 24–30px dengan weight 650–700; angka KPI tabular dan menonjol; label sentence case 12–14px; hindari all-caps eyebrow dekoratif.

**Layout concept:**

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Ringkasan Hari Ini                         [live] [tanggal] [refresh] │
│ Kehadiran operasional kantor                                               │
├──────────────────────────────────────────────────────────────────────┤
│ [Total aktif] [Hadir] [Terlambat] [Tidak hadir]                       │
├───────────────────────────────────┬──────────────────────────────────┤
│ Statistik Kehadiran               │ Pulse Realtime                    │
│ donut/radial + total + legend     │ status ESP + latest 5 taps        │
├───────────────────────────────────┼──────────────────────────────────┤
│ Aktivitas Tap per Jam             │ Kehadiran per Divisi               │
│ bar/area chart 00–23              │ horizontal bar, top divisions      │
├──────────────────────────────────────────────────────────────────────┤
│ Absensi Terbaru Hari Ini — table responsive + status badges          │
└──────────────────────────────────────────────────────────────────────┘
```

Alignment left; angka chart boleh centered only inside chart labels. Grid collapses to one column on mobile; pulse panel moves above charts so realtime state remains visible.

## Data Contract

```js
const dashboardData = {
  activeEmployees: Employee[],
  attendance: AttendanceRecord[], // laporan hari ini, deduped with realtime events
  liveEvents: RealtimeEvent[],
  stats: { totalKaryawan, hadir, terlambat, tidakHadir },
  statusSeries: [{ key, label, value, fill }],
  hourlySeries: [{ hour, label, hadir, terlambat }],
  divisionSeries: [{ division, hadir, terlambat, total }],
};
```

Rules:
- `statusSeries` counts only active employees and known status records.
- `hourlySeries` uses `jam_masuk` for attendance records and `jam` for realtime events; invalid/missing time is ignored.
- `divisionSeries` uses `attendance.employee.division` / `attendance.employee.divisi` only; sort descending by total and cap visible rows at 8 with “lainnya” aggregation only if the source data supports it.
- Empty chart data renders an explanatory empty state, not an all-zero misleading chart.

## Files and Component Plan

### Task 1: Install/verify shadcn chart primitives

**Files:**
- Create/modify: `frontend/src/components/ui/chart.jsx` via `npx shadcn@latest add chart`
- Modify: `frontend/package.json`, `frontend/package-lock.json` if CLI adds `recharts`

**Acceptance:** Chart primitives compile in the existing Vite/JSX project; no preset/theme overwrite; existing UI components unchanged.

**Verification:** `cd frontend && npx shadcn@latest add chart --dry-run` review, then add; `npm run build`.

**Dependencies:** None.

**Scope:** Small.

### Task 2: Extract dashboard data derivation

**Files:**
- Create: `frontend/src/lib/dashboard-data.js`
- Test/verification target: browser smoke or a small deterministic node-compatible unit test only if project test runner exists

**Acceptance:**
- `buildDashboardData({ karyawan, laporan, realtimeEvents, today })` returns the contract above.
- Existing active employee filtering, NIP matching, Asia/Jakarta date filtering, and ID dedupe remain intact.
- Time parsing never produces `NaN`, negative hour buckets, or a fake division.

**Verification:** `npm run build`; exercise with empty data, one late attendance, one missing `jam_masuk`, and an inactive employee through a deterministic helper check.

**Dependencies:** None.

**Scope:** Medium.

### Task 3: Build shadcn chart panels

**Files:**
- Create: `frontend/src/components/dashboard/AttendanceCompositionChart.jsx`
- Create: `frontend/src/components/dashboard/HourlyAttendanceChart.jsx`
- Create: `frontend/src/components/dashboard/DivisionAttendanceChart.jsx`
- Optional modify: `frontend/src/components/ui/chart.jsx` only for project-compatible JSX adjustments

**Acceptance:**
- Composition: donut/radial chart with center total, status legend, tooltip.
- Hourly: compact bar/area chart with Hadir/Terlambat, readable 24-hour axis and tooltip.
- Division: horizontal bar chart or ranked bar list, capped for readability.
- Each panel uses `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` and semantic chart colors.
- No chart uses hard-coded fake values.
- Empty/loading states are explicit.

**Verification:** `npm run build`; browser screenshot at desktop and narrow mobile widths; check tooltip/legend and no console errors.

**Dependencies:** Task 1 and Task 2.

**Scope:** Medium.

### Task 4: Compose modern Dashboard page

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`
- Optional create: `frontend/src/components/dashboard/DashboardHeader.jsx`, only if the page remains difficult to read after composition

**Acceptance:**
- Replace legacy gradient stat-card treatment with shadcn `Card` KPI tiles and status accents.
- Add header: “Ringkasan Hari Ini”, Jakarta-formatted date, live indicator, and a refresh action using existing query client patterns if needed.
- Compose the three chart panels plus a compact realtime pulse panel while preserving “Absensi Terbaru Hari Ini”.
- Maintain keyboard focus, responsive layout, readable contrast, and current error/empty behavior.
- `LiveMonitoring` remains the full event stream; Dashboard only shows a useful compact latest subset.

**Verification:** browser visual check at desktop/mobile, tap or inject a realtime event and confirm pulse/table update, `npm run build`.

**Dependencies:** Tasks 2 and 3.

**Scope:** Large; keep changes isolated to Dashboard and dashboard components.

### Checkpoint: Dashboard UX

- [ ] Desktop dashboard presents KPI → composition/live → trend/division → recent table in one scan.
- [ ] Mobile has no horizontal overflow and chart labels remain understandable.
- [ ] Empty day looks intentional and does not imply failure.
- [ ] Realtime event updates compact pulse/table without duplicate rows.
- [ ] Existing dashboard active/nonactive and timezone behavior remains correct.

### Task 5: Polish and accessibility pass

**Files:**
- Modify only recently created dashboard component files and `Dashboard.jsx`.

**Acceptance:**
- Every chart has a visible title/description; status meanings are not color-only.
- Focus states and keyboard operation work for refresh/control interactions.
- Motion is restrained and disabled/reduced under `prefers-reduced-motion`.
- No unrelated global restyle.

**Verification:** `npm run build`; browser console check; Lighthouse accessibility smoke if dev server is available.

**Dependencies:** Task 4.

**Scope:** Small/medium.

## Explicit Non-Goals

- Tidak membuat dashboard backend baru.
- Tidak mengganti halaman `LaporanGrafik` atau custom chart yang sudah menjadi laporan historis.
- Tidak menambah filter tanggal kompleks di Dashboard pada fase ini.
- Tidak menambah library chart kedua; gunakan Recharts melalui komponen shadcn chart.
- Tidak mengubah sidebar/topbar global.

## Risks and Mitigations

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `chart` shadcn menambah `recharts` bundle | Bundle lebih besar | Hanya gunakan chart pada Dashboard; cek build output dan lazy-load page sudah ada |
| Event SSE tidak punya divisi | Division chart tidak lengkap saat tap baru | Division chart hanya memakai laporan dengan relasi employee; pulse tetap menampilkan event SSE |
| Data kosong/record lama | Chart terlihat salah | Filter tanggal Asia/Jakarta + empty state eksplisit |
| Terlalu banyak dekorasi | Dashboard tetap terasa ramai/usang | Satu aksen live; status colors hanya sebagai encoding |
| Data >1000 laporan | Trend/divisi terpotong | Reuse pagination helper/fetch-all sebelum dashboard dianggap lengkap |

## Open Questions / Decisions

- Default desain dipilih: dashboard satu halaman tanpa filter rentang; laporan historis tetap di `LaporanGrafik`.
- Default chart dipilih: donut status, hourly bar/area, ranked division bars.
- Default visual dipilih: operations console ringan dengan Geist + semantic shadcn tokens, bukan gradient SaaS cards.

## Definition of Done

- [ ] Semua task selesai dan build frontend PASS.
- [ ] Screenshot desktop/mobile direview.
- [ ] Existing dashboard realtime, timezone, active employee, error, dan empty behavior tidak regresi.
- [ ] Chart shadcn dipakai sebagai source component, bukan markup chart custom baru.
