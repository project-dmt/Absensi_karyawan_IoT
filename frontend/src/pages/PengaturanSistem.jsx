import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function PengaturanSistem() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h4>Pengaturan Sistem</h4>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Pengaturan Sistem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Halaman segera hadir — konfigurasi sistem.</p>
        </CardContent>
      </Card>
    </div>
  );
}
