import { useRealtime } from "../hooks/useRealtime";
import {
  Activity,
  Cpu,
  KeyRound,
  Nfc,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FIRMWARE_CONFIG = [
  { key: "WIFI_SSID / WIFI_PASSWORD", value: "Kredensial WiFi lokal" },
  { key: "OFFLINE_MODE", value: "false (mode online ke backend)" },
  { key: "API_BASE_URL", value: "Alamat server Laravel, mis. http://192.168.1.100:8000" },
  { key: "API_KEY", value: "Kunci API perangkat (php artisan api:generate-key)" },
];

function formatJam(ev) {
  if (ev.jam) return ev.jam;
  if (!ev.created_at) return "-";
  return new Date(ev.created_at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function PerangkatIoT() {
  const { events, status } = useRealtime(true);
  const lastEvent = events[0];

  return (
    <div>
      <div className="page-header">
        <h4>Perangkat IoT</h4>
        <small className="text-muted-foreground">
          Status integrasi dan panduan konfigurasi perangkat ESP32 + RFID.
        </small>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 py-4">
            <Radio className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Koneksi Realtime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status === "live" ? (
                <>
                  <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  <Badge className="rounded-md badge-status-aktif">Stream Aktif</Badge>
                </>
              ) : (
                <>
                  <WifiOff className="size-4 text-amber-500" />
                  <Badge className="rounded-md badge-status-nonaktif">
                    {status === "reconnecting" ? "Menyambungkan Ulang" : "Menyambungkan"}
                  </Badge>
                </>
              )}
              {status === "live" ? (
                <Wifi className="ms-auto size-4 text-emerald-500" />
              ) : null}
            </div>
            <small className="mt-2 block text-muted-foreground">
              {status === "live"
                ? "Dashboard menerima event realtime dari perangkat."
                : "Stream SSE belum aktif. Perangkat akan terdeteksi otomatis saat tap pertama diterima."}
            </small>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 py-4">
            <Activity className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Aktivitas Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastEvent ? (
              <>
                <div className="font-semibold">{lastEvent.nama || "Tidak dikenal"}</div>
                <small className="text-muted-foreground">
                  <code>{lastEvent.nip || "-"}</code> •{" "}
                  {lastEvent.type === "checkout" ? "Checkout" : "Check-in"} •{" "}
                  {formatJam(lastEvent)}
                </small>
              </>
            ) : (
              <small className="text-muted-foreground">
                Belum ada aktivitas terdeteksi pada sesi ini.
              </small>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 py-4">
            <Nfc className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Endpoint Absensi Perangkat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              ESP32 mengirim UID kartu RFID ke endpoint berikut setiap kali
              kartu ditap:
            </p>
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
{`POST /api/absensi
Header:
  X-API-Key: <API_KEY_PERANGKAT>
  Content-Type: application/json

Body:
  { "uid": "A1B2C3D4" }`}
            </pre>
            <p className="text-muted-foreground">
              Tap pertama tercatat sebagai check-in, tap kedua sebagai checkout.
              Status Hadir/Terlambat ditentukan otomatis dari jam kerja
              (lihat menu Jam Kerja).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 py-4">
            <Cpu className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Konfigurasi Firmware (config.h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {FIRMWARE_CONFIG.map((item) => (
                <div key={item.key} className="rounded-md border p-3">
                  <code className="text-xs font-semibold">{item.key}</code>
                  <small className="mt-1 block text-muted-foreground">
                    {item.value}
                  </small>
                </div>
              ))}
            </div>
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <KeyRound className="mt-0.5 size-4 shrink-0" />
              File konfigurasi lengkap ada di{" "}
              <code>firmware/include/config.example.h</code>. Ganti nama menjadi{" "}
              <code>config.h</code> lalu sesuaikan nilainya sebelum upload ke ESP32.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
