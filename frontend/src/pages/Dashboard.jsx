import { useEffect, useMemo, useState } from "react";
import { useKaryawanList, useLaporan } from "../api/queries";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { useRealtime } from "../hooks/useRealtime";
import {
  AlertTriangle,
  CalendarX,
  CheckCircle,
  Clock3,
  Users,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CARDS = [
  {
    label: "Total Karyawan",
    valueKey: "totalKaryawan",
    icon: Users,
    bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)",
  },
  {
    label: "Hadir",
    valueKey: "hadir",
    icon: CheckCircle,
    bg: "linear-gradient(135deg, #10b981, #34d399)",
  },
  {
    label: "Terlambat",
    valueKey: "terlambat",
    icon: AlertTriangle,
    bg: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  },
  {
    label: "Tidak Hadir",
    valueKey: "tidakHadir",
    icon: XCircle,
    bg: "linear-gradient(135deg, #ef4444, #f87171)",
  },
];

export default function Dashboard() {
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const {
    data: karyawan = [],
    isPending,
    isError: karyawanError,
  } = useKaryawanList();
  const {
    data: laporan = [],
    isError: laporanError,
  } = useLaporan({ dari: today, sampai: today });
  const dataReady = !isPending;
  const { events: realtimeEvents } = useRealtime(dataReady);

  const [recent, setRecent] = useState([]);

  useEffect(() => {
    const merged = [...realtimeEvents, ...laporan]
      .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    setRecent(merged.slice(0, 10));
  }, [laporan, realtimeEvents]);

  // Gabungkan laporan + event realtime (dedupe by id) lalu hitung dari
  // hasil gabungan — event yang sudah ada di laporan tidak dihitung ganda.
  const stats = useMemo(() => {
    const merged = [...realtimeEvents, ...laporan].filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i
    );
    const hadir = merged.filter((l) => l.status === "Hadir").length;
    const terlambat = merged.filter((l) => l.status === "Terlambat").length;
    const izin = merged.filter((l) => l.status === "Izin").length;
    const sakit = merged.filter((l) => l.status === "Sakit").length;
    // Izin/Sakit bukan "tidak hadir" — karyawan mengajukan ketidakhadiran
    const tidakHadir = Math.max(
      0,
      karyawan.length - hadir - terlambat - izin - sakit
    );
    return { totalKaryawan: karyawan.length, hadir, terlambat, tidakHadir };
  }, [karyawan, laporan, realtimeEvents]);

  if (isPending) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header">
        <h4>Dashboard</h4>
        <small className="text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </small>
      </div>

      {(karyawanError || laporanError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle />
          <AlertDescription>
            Gagal memuat data dashboard. Coba muat ulang halaman.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="stat-card" style={{ background: card.bg }}>
              <div className="stat-card__content">
                <div className="stat-card__value">{stats[card.valueKey]}</div>
                <div className="stat-card__label">{card.label}</div>
              </div>
              <Icon className="stat-card__icon size-10" />
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Clock3 className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">
            Absensi Terbaru Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <EmptyState
              message="Belum ada data absensi hari ini"
              icon={<CalendarX className="size-10" />}
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
                      <TableCell>{item.jam_masuk || item.jam || "-"}</TableCell>
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
