import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

const chartConfig = {
  hadir: { label: "Hadir", color: "var(--chart-1)" },
  terlambat: { label: "Terlambat", color: "var(--chart-2)" },
  tidakHadir: { label: "Tidak hadir", color: "var(--chart-3)" },
  izin: { label: "Izin", color: "var(--chart-4)" },
  sakit: { label: "Sakit", color: "var(--chart-5)" },
};

export default function AttendanceCompositionChart({ data = [], total }) {
  const entries = data.filter((item) => Number(item.value) > 0);
  const totalValue = total ?? entries.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistik Kehadiran</CardTitle>
        <CardDescription>Ringkasan status absensi hari ini.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center text-center text-sm text-muted-foreground" role="status">
            Belum ada data kehadiran untuk ditampilkan.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <ChartContainer config={chartConfig} className="mx-auto h-48 w-full max-w-[240px] aspect-auto" aria-label="Diagram statistik kehadiran">
              <PieChart>
                <Pie data={entries} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="86%" strokeWidth={2}>
                  {entries.map((item) => <Cell key={item.key} fill={item.fill || chartConfig[item.key]?.color || "var(--chart-1)"} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-semibold">{totalValue}</text>
                <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[10px]">total</text>
              </PieChart>
            </ChartContainer>
            <ul className="grid gap-2 text-sm" aria-label="Legenda status kehadiran">
              {entries.map((item) => (
                <li key={item.key} className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.fill || chartConfig[item.key]?.color }} aria-hidden="true" />
                  <span>{item.label || chartConfig[item.key]?.label || item.key}</span>
                  <span className="ml-auto pl-4 font-medium tabular-nums">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
