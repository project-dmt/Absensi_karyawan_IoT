import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud } from "lucide-react";

export default function LiveMonitoring() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h4>Live Monitoring</h4>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="size-5" />
            Live Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Halaman segera hadir — monitoring real-time perangkat IoT.</p>
        </CardContent>
      </Card>
    </div>
  );
}
