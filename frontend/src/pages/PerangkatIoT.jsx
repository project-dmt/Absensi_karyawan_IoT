import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu } from "lucide-react";

export default function PerangkatIoT() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h4>Perangkat IoT</h4>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="size-5" />
            Perangkat IoT
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Halaman segera hadir — kelola perangkat ESP32 & RFID reader.</p>
        </CardContent>
      </Card>
    </div>
  );
}
