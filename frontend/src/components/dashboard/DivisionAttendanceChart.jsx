import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

const chartConfig = {
  hadir: { label: "Hadir", color: "var(--chart-1)" },
  terlambat: { label: "Terlambat", color: "var(--chart-2)" },
};

export default function DivisionAttendanceChart({ data = [] }) {
  const rows = data.filter((item) => Number(item.total ?? item.hadir ?? 0) > 0 || Number(item.terlambat || 0) > 0).slice(0, 8);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kehadiran per Divisi</CardTitle>
        <CardDescription>Perbandingan hadir dan terlambat menurut divisi.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center text-center text-sm text-muted-foreground" role="status">Belum ada data divisi untuk ditampilkan.</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-56 w-full aspect-auto" aria-label="Grafik kehadiran per divisi">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="division" width={80} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltip />} />
              <Bar dataKey="hadir" fill={chartConfig.hadir.color} radius={[0, 3, 3, 0]} />
              <Bar dataKey="terlambat" fill={chartConfig.terlambat.color} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
