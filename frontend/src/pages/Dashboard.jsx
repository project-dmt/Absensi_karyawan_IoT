import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { useKaryawanList, useLaporan, karyawanKeys, laporanKeys } from "../api/queries";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import AttendanceCompositionChart from "../components/dashboard/AttendanceCompositionChart";
import HourlyAttendanceChart from "../components/dashboard/HourlyAttendanceChart";
import DivisionAttendanceChart from "../components/dashboard/DivisionAttendanceChart";
import { useRealtime } from "../hooks/useRealtime";
import { buildDashboardData } from "../lib/dashboard-data";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getJakartaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const KPI_TONES = {
  total: {
    icon: Users,
    bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)",
    accent: "#c0d6df",
  },
  hadir: {
    icon: CheckCircle2,
    bg: "linear-gradient(135deg, #10b981, #34d399)",
    accent: "#ffffff",
  },
  terlambat: {
    icon: Clock3,
    bg: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    accent: "#ffffff",
  },
  tidakHadir: {
    icon: XCircle,
    bg: "linear-gradient(135deg, #ef4444, #f87171)",
    accent: "#ffffff",
  },
};

function KpiCard({ label, value, hint, icon: Icon, bg, accent }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 min-h-28 flex flex-col justify-center text-white shadow-sm transition-transform hover:-translate-y-0.5"
      style={{ background: bg }}
    >
      <div
        className="pointer-events-none absolute -top-5 -right-5 size-20 rounded-full bg-white/10"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-3xl font-semibold tabular-nums">{value}</div>
          <div className="mt-1 text-sm text-white/90">{label}</div>
        </div>
        <Icon className="size-10 opacity-80" aria-hidden="true" />
      </div>
      <p className="mt-1 text-xs" style={{ color: accent }}>
        {hint}
      </p>
    </div>
  );
}

function timeOf(item) {
  if (item?.jam_masuk || item?.jam) return item.jam_masuk || item.jam;
  if (item?.created_at) {
    return new Date(item.created_at).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jakarta",
    });
  }
  return "-";
}

export default function Dashboard() {
  const today = useMemo(() => getJakartaDate(), []);
  const queryClient = useQueryClient();
  const {
    data: karyawan = [],
    isPending,
    isError: karyawanError,
  } = useKaryawanList();
  const { data: laporan = [], isError: laporanError } = useLaporan({
    dari: today,
    sampai: today,
  });
  const dataReady = !isPending;
  const { events: realtimeEvents, connected } = useRealtime(dataReady);

  const dashboard = useMemo(
    () => buildDashboardData({ karyawan, laporan, realtimeEvents, today }),
    [karyawan, laporan, realtimeEvents, today]
  );

  const { stats, statusSeries, hourlySeries, divisionSeries, attendance } = dashboard;
  const recent = useMemo(() => {
    const sorted = [...attendance].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return sorted.slice(0, 10);
  }, [attendance]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: karyawanKeys.all });
    queryClient.invalidateQueries({ queryKey: laporanKeys.all });
  };

  if (isPending) return <LoadingSpinner />;

  const hadirRate =
    stats.totalKaryawan > 0
      ? Math.round(((stats.hadir + stats.terlambat) / stats.totalKaryawan) * 100)
      : 0;

  const kpis = [
    {
      label: "Karyawan Aktif",
      value: stats.totalKaryawan,
      hint: "Karyawan berstatus aktif",
      ...KPI_TONES.total,
    },
    {
      label: "Hadir",
      value: stats.hadir,
      hint: `${hadirRate}% kehadiran hari ini`,
      ...KPI_TONES.hadir,
    },
    {
      label: "Terlambat",
      value: stats.terlambat,
      hint: "Masuk melewati toleransi jadwal",
      ...KPI_TONES.terlambat,
    },
    {
      label: "Tidak Hadir",
      value: stats.tidakHadir,
      hint: "Belum ada absensi hari ini",
      ...KPI_TONES.tidakHadir,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4>Ringkasan Hari Ini</h4>
          <small className="text-muted-foreground">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </small>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span
              className={`size-2 rounded-full ${
                connected ? "bg-[color:var(--chart-1)]" : "bg-muted-foreground"
              }`}
              aria-hidden="true"
            />
            {connected ? "Live" : "Menyambung"}
          </Badge>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden="true" />
            Muat ulang
          </Button>
        </div>
      </div>

      {(karyawanError || laporanError) && (
        <Alert variant="destructive">
          <Activity />
          <AlertDescription>
            Gagal memuat data dashboard. Coba muat ulang halaman.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <AttendanceCompositionChart data={statusSeries} total={stats.totalKaryawan} />

        <Card>
          <CardHeader>
            <CardTitle>Pulse Realtime</CardTitle>
            <p className="text-sm text-muted-foreground">
              Tap kartu terbaru dari perangkat.
            </p>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                message="Belum ada tap hari ini"
                icon={<CalendarDays className="size-10" />}
              />
            ) : (
              <ul className="divide-y">
                {recent.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">
                      {timeOf(item)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {item.employee?.nama || item.nama || "-"}
                    </span>
                    <StatusBadge status={item.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <HourlyAttendanceChart data={hourlySeries} />
        <DivisionAttendanceChart data={divisionSeries} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle>Absensi Terbaru Hari Ini</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {recent.length === 0 ? (
            <EmptyState
              message="Belum ada data absensi hari ini"
              icon={<CalendarDays className="size-10" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.employee?.nama || item.nama || "-"}
                      </TableCell>
                      <TableCell>
                        <code>{item.employee?.nip || item.nip || "-"}</code>
                      </TableCell>
                      <TableCell>{timeOf(item)}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
