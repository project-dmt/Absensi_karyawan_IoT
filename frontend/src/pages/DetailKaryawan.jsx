import { useEffect, useState } from "react";
import { useParams, useRouter } from "../router";
import { useKaryawanDetail, useKaryawanAbsensi } from "../api/queries";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarCheck,
  CalendarX,
  CheckCircle,
  Clock3,
  FileCheck2,
  RotateCcw,
  Search,
  UserCog,
  UserX,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EmptyState from "../components/EmptyState";

const SUMMARY_CARDS = [
  { key: "total", label: "Total Absensi", bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)", icon: CalendarCheck },
  { key: "hadir", label: "Hadir", bg: "linear-gradient(135deg, #10b981, #34d399)", icon: CheckCircle },
  { key: "terlambat", label: "Terlambat", bg: "linear-gradient(135deg, #f59e0b, #fbbf24)", icon: XCircle },
  { key: "alpha", label: "Alpha", bg: "linear-gradient(135deg, #ef4444, #f87171)", icon: UserX },
  { key: "izin", label: "Izin", bg: "linear-gradient(135deg, #6366f1, #818cf8)", icon: FileCheck2 },
  { key: "sakit", label: "Sakit", bg: "linear-gradient(135deg, #0ea5e9, #38bdf8)", icon: BedDouble },
];

function calcSummary(absensi) {
  return {
    total: absensi.length,
    hadir: absensi.filter((a) => a.status === "Hadir").length,
    terlambat: absensi.filter((a) => a.status === "Terlambat").length,
    alpha: absensi.filter((a) => a.status === "Alpha").length,
    izin: absensi.filter((a) => a.status === "Izin").length,
    sakit: absensi.filter((a) => a.status === "Sakit").length,
  };
}

export default function DetailKaryawan() {
  const { id } = useParams({ strict: false });
  const router = useRouter();
  const { data: employee, isPending } = useKaryawanDetail(id);
  const { data: absensi = [] } = useKaryawanAbsensi(id);
  const [filteredAbsensi, setFilteredAbsensi] = useState([]);
  const [filter, setFilter] = useState({ dari: "", sampai: "" });

  useEffect(() => {
    setFilteredAbsensi(absensi);
  }, [absensi]);

  const handleFilter = () => {
    let result = [...absensi];
    if (filter.dari) result = result.filter((a) => a.tanggal >= filter.dari);
    if (filter.sampai) result = result.filter((a) => a.tanggal <= filter.sampai);
    setFilteredAbsensi(result);
  };

  const handleResetFilter = () => {
    setFilter({ dari: "", sampai: "" });
    setFilteredAbsensi(absensi);
  };

  if (isPending) return <LoadingSpinner />;
  if (!employee) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <UserX className="mb-2 size-12 text-slate-400" />
        <p className="text-muted-foreground">Karyawan tidak ditemukan</p>
        <Button className="mt-2" onClick={() => router.navigate({ to: "/data-karyawan" })}>
          <ArrowLeft data-icon="inline-start" />
          Kembali
        </Button>
      </div>
    );
  }

  const summary = calcSummary(filteredAbsensi);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.navigate({ to: "/data-karyawan" })}
            title="Kembali"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h4 className="mb-0">Detail Karyawan</h4>
            <small className="text-muted-foreground">{employee.nama}</small>
          </div>
        </div>
      </div>

      {/* Employee Info Card */}
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <UserCog className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">
            Informasi Karyawan
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <small className="mb-1 block text-muted-foreground">
              Nama Lengkap
            </small>
            <div className="font-semibold">{employee.nama}</div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">NIP</small>
            <div><code>{employee.nip}</code></div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">Jabatan</small>
            <div>{employee.jabatan || "-"}</div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">Divisi</small>
            <div>{employee.division?.nama_divisi || "-"}</div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">RFID UID</small>
            <div><code>{employee.rfid_uid}</code></div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">Status</small>
            <div>
              <StatusBadge status={employee.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
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

      {/* Filter */}
      <Card className="mb-4 shadow-sm">
        <CardContent className="py-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="filter-dari" className="mb-1 flex items-center gap-1 text-xs font-semibold">
                <ArrowRight className="size-3.5" />
                Dari
              </Label>
              <Input
                id="filter-dari"
                type="date"
                className="h-8 w-[170px]"
                value={filter.dari}
                onChange={(e) => setFilter((prev) => ({ ...prev, dari: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="filter-sampai" className="mb-1 flex items-center gap-1 text-xs font-semibold">
                <ArrowRight className="size-3.5" />
                Sampai
              </Label>
              <Input
                id="filter-sampai"
                type="date"
                className="h-8 w-[170px]"
                value={filter.sampai}
                onChange={(e) => setFilter((prev) => ({ ...prev, sampai: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleFilter}>
                <Search data-icon="inline-start" className="size-3.5" />
                Terapkan
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetFilter}>
                <RotateCcw data-icon="inline-start" className="size-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Riwayat Absensi</CardTitle>
          </div>
          <small className="text-muted-foreground">
            {filteredAbsensi.length} record
          </small>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAbsensi.length === 0 ? (
            <EmptyState
              message="Tidak ada data absensi untuk periode ini"
              icon={<CalendarX className="size-10" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Jam Pulang</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAbsensi.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.tanggal}</TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>{item.jam_masuk || "-"}</TableCell>
                      <TableCell>{item.jam_pulang || "-"}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {item.keterangan || "-"}
                        </span>
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