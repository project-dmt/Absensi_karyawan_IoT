import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Network,
  PauseCircle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EmptyState from "../components/EmptyState";
import { cn } from "@/lib/utils";

const SUMMARY_CARDS = [
  { key: "total_karyawan", label: "Total Karyawan", bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)", icon: Users },
  { key: "aktif", label: "Aktif", bg: "linear-gradient(135deg, #10b981, #34d399)", icon: CheckCircle },
  { key: "nonaktif", label: "Nonaktif", bg: "linear-gradient(135deg, #94a3b8, #cbd5e1)", icon: PauseCircle },
  { key: "hadir", label: "Total Hadir", bg: "linear-gradient(135deg, #3b82f6, #60a5fa)", icon: CalendarCheck },
  { key: "alpha", label: "Total Alpha", bg: "linear-gradient(135deg, #ef4444, #f87171)", icon: CalendarX },
];

const SUMMARY_BADGES = {
  hadir: "badge-status-hadir",
  terlambat: "badge-status-terlambat",
  alpha: "badge-status-alpha",
  izin: "badge-status-izin",
};

export default function DetailDivisi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/divisi/${id}`)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!data) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Network className="mb-2 size-12 text-slate-400" />
        <p className="text-muted-foreground">Divisi tidak ditemukan</p>
        <Button className="mt-2" onClick={() => navigate("/data-divisi")}>
          <ArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
      </div>
    );
  }

  const { division, employees, summary } = data;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/data-divisi")}
            title="Kembali"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h4 className="mb-0">Detail Divisi</h4>
            <small className="text-muted-foreground">
              {division.nama_divisi}
            </small>
          </div>
        </div>
      </div>

      {/* Division Info */}
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Network className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Informasi Divisi</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <small className="mb-1 block text-muted-foreground">Nama Divisi</small>
            <div className="font-semibold">{division.nama_divisi}</div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">Total Karyawan</small>
            <div>
              <Badge className="rounded-md badge-status-hadir">
                {summary.total_karyawan} orang
              </Badge>
            </div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">Karyawan Aktif</small>
            <div>
              <Badge className="rounded-md badge-status-aktif">
                {summary.aktif} orang
              </Badge>
            </div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">Karyawan Nonaktif</small>
            <div>
              <Badge className="rounded-md badge-status-nonaktif">
                {summary.nonaktif} orang
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary Cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="stat-card" style={{ background: card.bg }}>
              <Icon className="stat-card__icon size-10" />
              <div className="stat-card__content">
                <div className="stat-card__value">{summary[card.key]}</div>
                <div className="stat-card__label">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Daftar Karyawan</CardTitle>
          </div>
          <small className="text-muted-foreground">
            {employees.length} karyawan
          </small>
        </CardHeader>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <EmptyState
              message="Belum ada karyawan di divisi ini"
              icon={<Users className="size-10" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>RFID UID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Hadir</TableHead>
                    <TableHead>Terlambat</TableHead>
                    <TableHead>Alpha</TableHead>
                    <TableHead>Izin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp, idx) => (
                    <TableRow key={emp.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{emp.nama}</TableCell>
                      <TableCell>
                        <code>{emp.nip}</code>
                      </TableCell>
                      <TableCell>{emp.jabatan || "-"}</TableCell>
                      <TableCell>
                        <code>{emp.rfid_uid}</code>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={emp.status} />
                      </TableCell>
                      {["hadir", "terlambat", "alpha", "izin"].map((key) => (
                        <TableCell key={key}>
                          <Badge
                            className={cn(
                              "rounded-md",
                              SUMMARY_BADGES[key]
                            )}
                          >
                            {emp.summary[key]}
                          </Badge>
                        </TableCell>
                      ))}
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