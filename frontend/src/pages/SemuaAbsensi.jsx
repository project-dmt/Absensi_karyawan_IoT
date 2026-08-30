import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";

export default function SemuaAbsensi() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h4>Semua Absensi</h4>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-5" />
            Semua Absensi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Halaman segera hadir — daftar seluruh absensi.</p>
        </CardContent>
      </Card>
    </div>
  );
}
