import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

const chartConfig = {
  hadir: { label: "Hadir", color: "var(--chart-1)" },
  terlambat: { label: "Terlambat", color: "var(--chart-2)" },
};

export default function HourlyAttendanceChart({ data = [] }) {
  const hasData = data.some((item) => Number(item.hadir || 0) > 0 || Number(item.terlambat || 0) > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktivitas Tap per Jam</CardTitle>
        <CardDescription>Jumlah hadir dan terlambat berdasarkan jam masuk.</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex min-h-40 items-center justify-center text-center text-sm text-muted-foreground" role="status">Belum ada data jam masuk untuk ditampilkan.</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-52 w-full aspect-auto" aria-label="Grafik aktivitas tap per jam">
            <BarChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
              <ChartTooltip content={<ChartTooltip />} />
              <Bar dataKey="hadir" fill={chartConfig.hadir.color} radius={[3, 3, 0, 0]} />
              <Bar dataKey="terlambat" fill={chartConfig.terlambat.color} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
