import { useState, useEffect } from "react";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { useRealtime } from "../hooks/useRealtime";
import { AlertTriangle, CalendarX, Clock3, Users, XCircle } from "lucide-react";
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
  const [stats, setStats] = useState({
    totalKaryawan: 0,
    hadir: 0,
    terlambat: 0,
    tidakHadir: 0,
  });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const realtimeEvents = useRealtime(dataReady);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      api.get("/karyawan"),
      api.get("/laporan", { params: { dari: today, sampai: today } }),
    ])
      .then(([karyawanRes, laporanRes]) => {
        const karyawan = Array.isArray(karyawanRes.data.data?.data) ? karyawanRes.data.data.data : (Array.isArray(karyawanRes.data.data) ? karyawanRes.data.data : []);
        const laporan = Array.isArray(laporanRes.data.data?.data) ? laporanRes.data.data.data : (Array.isArray(laporanRes.data.data) ? laporanRes.data.data : []);

        const hadir = laporan.filter((l) => l.status === "Hadir").length;
        const terlambat = laporan.filter((l) => l.status === "Terlambat").length;

        setStats({
          totalKaryawan: karyawan.length,
          hadir,
          terlambat,
          tidakHadir: karyawan.length - hadir - terlambat,
        });
        setRecent(laporan.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setDataReady(true);
      });
  }, []);

  useEffect(() => {
    if (realtimeEvents.length === 0) return;
    setRecent((prev) => {
      const merged = [...realtimeEvents, ...prev]
        .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
        .slice(0, 10);
      return merged;
    });
    setStats((prev) => {
      let newHadir = prev.hadir;
      let newTerlambat = prev.terlambat;
      realtimeEvents.forEach((ev) => {
        if (ev.status === "Hadir") newHadir += 1;
        if (ev.status === "Terlambat") newTerlambat += 1;
      });
      return {
        ...prev,
        hadir: newHadir,
        terlambat: newTerlambat,
        tidakHadir: prev.totalKaryawan - newHadir - newTerlambat,
      };
    });
  }, [realtimeEvents]);

  if (loading) return <LoadingSpinner />;

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

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                        {item.employee?.nama}
                      </TableCell>
                      <TableCell>
                        <code>{item.employee?.nip}</code>
                      </TableCell>
                      <TableCell>{item.jam_masuk || "-"}</TableCell>
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