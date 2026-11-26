import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle,
  Clock3,
  Loader2,
  RotateCcw,
  Users,
  XCircle,
} from "lucide-react";
import { useDivisiList, useLaporanGrafik } from "../api/queries";
import { getJakartaDate } from "../lib/dashboard-data";
import AttendanceDivisionChart, {
  DIVISION_COLORS,
} from "../components/AttendanceDivisionChart";
import EmptyState from "../components/EmptyState";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PERIODE_OPTIONS = [
  { value: "harian", label: "Per Hari", minDays: 6 },
  { value: "mingguan", label: "Per Minggu", minDays: 55 },
  { value: "bulanan", label: "Per Bulan", minDays: 180 },
];

const STATUS_COLUMNS = [
  { key: "Hadir", label: "Hadir" },
  { key: "Terlambat", label: "Terlambat" },
  { key: "Izin", label: "Izin" },
  { key: "Sakit", label: "Sakit" },
  { key: "Alpha", label: "Alpha" },
];

const formatDateInput = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateInput(date);
};

const defaultFilter = () => {
  const today = getJakartaDate();
  return {
    dari: today,
    sampai: today,
    divisi_id: "",
    periode: "harian",
  };
};

const formatDisplayDate = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
};

const number = (value) => Number(value) || 0;

export default function LaporanGrafik() {
  const [filter, setFilter] = useState(defaultFilter);
  const { data: divisi = [] } = useDivisiList();

  const rangeIncomplete = !filter.dari || !filter.sampai;
  const rangeInvalid =
    !rangeIncomplete && filter.dari > filter.sampai;

  const params = {
    dari: filter.dari,
    sampai: filter.sampai,
    periode: filter.periode,
    ...(filter.divisi_id ? { divisi_id: filter.divisi_id } : {}),
  };

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
  } = useLaporanGrafik(params, { enabled: !rangeIncomplete && !rangeInvalid });

  const divisions = data?.divisions ?? [];
  const totals = data?.totals ?? {};

  const colorById = useMemo(
    () =>
      new Map(
        divisions.map((division, index) => [
          division.id,
          DIVISION_COLORS[index % DIVISION_COLORS.length],
        ])
      ),
    [divisions]
  );

  const sortedDivisions = useMemo(
    () =>
      [...divisions].sort(
        (a, b) =>
          b.total - a.total || a.nama_divisi.localeCompare(b.nama_divisi)
      ),
    [divisions]
  );

  const tidakHadir =
    number(totals.Alpha) + number(totals.Izin) + number(totals.Sakit);
  const totalKehadiran = number(totals.total_kehadiran);
  const hasChartData = totalKehadiran > 0;

  const periodeLabel =
    PERIODE_OPTIONS.find((option) => option.value === filter.periode)?.label ??
    "Per Hari";

  const cards = [
    {
      label: "Total Kehadiran",
      value: totalKehadiran,
      icon: Users,
      bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)",
    },
    {
      label: "Hadir",
      value: number(totals.Hadir),
      icon: CheckCircle,
      bg: "linear-gradient(135deg, #10b981, #34d399)",
    },
    {
      label: "Terlambat",
      value: number(totals.Terlambat),
      icon: Clock3,
      bg: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    },
    {
      label: "Tidak Hadir (Alpha/Izin/Sakit)",
      value: tidakHadir,
      icon: XCircle,
      bg: "linear-gradient(135deg, #ef4444, #f87171)",
    },
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const handlePeriodeChange = (periode) => {
    const option = PERIODE_OPTIONS.find((item) => item.value === periode);
    setFilter((prev) => {
      if (periode === "harian") {
        const today = getJakartaDate();
        return { ...prev, periode, dari: today, sampai: today };
      }

      if (prev.periode === periode) {
        return prev;
      }
      if (!prev.dari || !prev.sampai || !option) {
        return { ...prev, periode };
      }

      const start = new Date(`${prev.dari}T00:00:00`);
      const end = new Date(`${prev.sampai}T00:00:00`);
      const diffDays = Math.round((end - start) / (24 * 60 * 60 * 1000));

      if (!Number.isFinite(diffDays) || diffDays >= option.minDays) {
        return { ...prev, periode };
      }

      return {
        ...prev,
        periode,
        dari: addDays(prev.sampai, -option.minDays),
      };
    });
  };

  const resetFilter = () => setFilter(defaultFilter());

  return (
    <div>
      <div className="page-header">
        <div>
          <h4>Grafik Kehadiran</h4>
          <small className="text-muted-foreground">
            Rekap kehadiran per divisi berdasarkan hari, minggu, dan bulan.
          </small>
        </div>
        {isFetching && !isPending && (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Memuat data...
          </span>
        )}
      </div>

      <div className="mb-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Filter Grafik</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Filter langsung diterapkan
          </span>
        </div>

        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
          <FormInput
            label="Dari Tanggal"
            name="dari"
            type="date"
            value={filter.dari}
            onChange={handleChange}
          />
          <FormInput
            label="Sampai Tanggal"
            name="sampai"
            type="date"
            value={filter.sampai}
            onChange={handleChange}
          />
          <FormInput
            label="Divisi"
            name="divisi_id"
            as="select"
            value={filter.divisi_id}
            onChange={handleChange}
            placeholder="Semua Divisi"
            options={divisi.map((item) => ({
              value: item.id,
              label: item.nama_divisi,
            }))}
          />
          <div>
            <div className="mb-2 text-sm font-medium">Periode</div>
            <div className="flex flex-wrap gap-1">
              {PERIODE_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={
                    filter.periode === option.value ? "default" : "outline"
                  }
                  onClick={() => handlePeriodeChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Button type="button" variant="outline" size="sm" onClick={resetFilter}>
            Reset ke Hari Ini
          </Button>
        </div>
      </div>

      {rangeInvalid && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle />
          <AlertDescription>
            Tanggal &quot;Dari&quot; tidak boleh setelah tanggal
            &quot;Sampai&quot;.
          </AlertDescription>
        </Alert>
      )}

      {isError && !rangeInvalid && !rangeIncomplete && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle />
          <AlertDescription>
            {error?.response?.data?.message ||
              "Gagal memuat data grafik kehadiran."}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="stat-card"
              style={{ background: card.bg }}
            >
              <div className="stat-card__content">
                <div className="stat-card__value">{card.value}</div>
                <div className="stat-card__label">{card.label}</div>
              </div>
              <Icon className="stat-card__icon size-10" />
            </div>
          );
        })}
      </div>

      <Card className="mb-4">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Grafik Kehadiran per Divisi</CardTitle>
            <CardDescription>
              Jumlah Hadir + Terlambat {periodeLabel.toLowerCase()} untuk{" "}
              {formatDisplayDate(filter.dari)} -{" "}
              {formatDisplayDate(filter.sampai)}.
            </CardDescription>
          </div>
          {isFetching && !isPending && (
            <Loader2 className="mt-1 size-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          {rangeIncomplete ? (
            <EmptyState
              message="Pilih tanggal dari dan sampai untuk menampilkan grafik."
              icon={<CalendarDays className="size-10" />}
            />
          ) : rangeInvalid ? (
            <EmptyState
              message="Perbaiki rentang tanggal terlebih dahulu."
              icon={<CalendarDays className="size-10" />}
            />
          ) : isPending ? (
            <LoadingSpinner />
          ) : !hasChartData ? (
            <EmptyState
              message="Belum ada data kehadiran pada rentang tanggal ini."
              icon={<CalendarDays className="size-10" />}
            />
          ) : (
            <AttendanceDivisionChart
              buckets={data?.buckets ?? []}
              divisions={divisions}
              maxValue={data?.max_value ?? 1}
              colorById={colorById}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Total per Divisi</CardTitle>
            <CardDescription>Total kehadiran pada rentang ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedDivisions.filter((division) => division.total > 0).length ===
            0 ? (
              <EmptyState
                message="Belum ada kehadiran."
                icon={<BarChart3 className="size-9" />}
              />
            ) : (
              sortedDivisions
                .filter((division) => division.total > 0)
                .map((division) => {
                  const maxTotal = Math.max(1, number(data?.max_total));
                  const width = Math.min(
                    100,
                    (number(division.total) / maxTotal) * 100
                  );

                  return (
                    <div key={division.id}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        <span className="truncate font-medium">
                          {division.nama_divisi}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {division.total}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            width: `${width}%`,
                            backgroundColor:
                              colorById.get(division.id) || "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ringkasan Status per Divisi</CardTitle>
            <CardDescription>
              Kehadiran = Hadir + Terlambat. Tidak Hadir = Alpha + Izin +
              Sakit dari total backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {sortedDivisions.length === 0 ? (
              <EmptyState
                message="Belum ada data divisi."
                icon={<BarChart3 className="size-9" />}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Divisi</TableHead>
                    {STATUS_COLUMNS.map((column) => (
                      <TableHead key={column.key} className="text-right">
                        {column.key === "Alpha"
                          ? "Alpha (Tidak Hadir)"
                          : column.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total Data</TableHead>
                    <TableHead className="text-right">Kehadiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDivisions.map((division) => (
                    <TableRow key={division.id}>
                      <TableCell className="font-medium">
                        {division.nama_divisi}
                      </TableCell>
                      {STATUS_COLUMNS.map((column) => (
                        <TableCell
                          key={column.key}
                          className="text-right tabular-nums"
                        >
                          {number(division.status_counts?.[column.key])}
                        </TableCell>
                      ))}
                      <TableCell className="text-right tabular-nums">
                        {number(division.total_records)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {number(division.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    {STATUS_COLUMNS.map((column) => (
                      <TableCell
                        key={column.key}
                        className="text-right font-semibold tabular-nums"
                      >
                        {number(totals[column.key])}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold tabular-nums">
                      {number(totals.total_records)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {number(totals.total_kehadiran)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
