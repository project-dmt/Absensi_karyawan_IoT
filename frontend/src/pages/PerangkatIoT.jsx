import { useEffect, useState } from "react";
import { useRealtime } from "../hooks/useRealtime";
import { isEspOnline, useEspStatus } from "../hooks/useEspStatus";
import api from "../api/axios";
import {
  Activity,
  CheckCircle2,
  Cpu,
  KeyRound,
  Loader2,
  Nfc,
  Search,
  Send,
  Settings,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";


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
  const { events } = useRealtime(true);
  const {
    ip: espIp,
    setIp: setEspIp,
    status: espStatus,
    info: espInfo,
    checking,
    check: checkEsp,
  } = useEspStatus();
  const lastEvent = events[0];
  const [now, setNow] = useState(() => Date.now());

  const [serverUrl, setServerUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);
  const espConnected = espStatus === "connected";
  const deviceOnline = isEspOnline(espStatus, lastEvent, now);
  const recentEvent = deviceOnline && !espConnected;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let on = true;
    api
      .get("/esp/config-info")
      .then((res) => {
        if (on) setServerUrl(res.data?.data?.server_url || "");
      })
      .catch(() => {
        if (on) {
          const base = (import.meta.env.VITE_API_URL || "").replace(/\/api$/, "");
          setServerUrl(base || "http://localhost:8000");
        }
      });
    return () => {
      on = false;
    };
  }, []);

  // Otomatis sembunyikan notifikasi setelah 5 detik
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const handleCheck = async () => {
    if (!espIp.trim()) {
      setNotice({ type: "error", title: "IP kosong", message: "Isi alamat IP ESP dulu." });
      return;
    }
    setNotice(null);
    const ok = await checkEsp(espIp, { silent: false });
    if (ok) {
      setNotice({
        type: "success",
        title: "Perangkat ditemukan",
        message: `ESP aktif di ${espIp.trim()}.`,
      });
    } else {
      setNotice({
        type: "error",
        title: "Tidak merespon",
        message: "ESP di IP tersebut tidak bisa dijangkau.",
      });
    }
  };

  const handleSend = async () => {
    if (!espIp.trim()) {
      setNotice({ type: "error", title: "IP kosong", message: "Isi alamat IP ESP dulu." });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const res = await api.post("/esp/config", { ip: espIp.trim() });
      setNotice({
        type: "success",
        title: "Terkirim",
        message: res.data?.message || "Konfigurasi dikirim ke ESP. Device akan restart & terhubung otomatis.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || "Konfigurasi gagal dikirim ke ESP.",
      });
    } finally {
      setSending(false);
    }
  };

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
            <Wifi className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Status Perangkat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {deviceOnline ? (
                <>
                  <span className="size-2.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  <Badge className="rounded-md badge-status-aktif">Terhubung</Badge>
                </>
              ) : (
                <>
                  <WifiOff className="size-4 text-rose-500" />
                  <Badge className="rounded-md badge-status-nonaktif">Tidak</Badge>
                </>
              )}
              {deviceOnline ? (
                <Wifi className="ms-auto size-4 text-emerald-500" />
              ) : null}
            </div>
            <small className="mt-2 block text-muted-foreground">
              {espConnected
                ? "ESP32 terhubung langsung ke server."
                : recentEvent
                  ? "Terdeteksi aktif dari absensi terakhir."
                  : espIp
                    ? "ESP32 tidak merespon. Cek IP dan pastikan satu jaringan."
                    : "Belum ada aktivitas absensi terbaru. Isi IP ESP untuk cek langsung."}
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

      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Settings className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">
            Kirim Konfigurasi ke ESP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notice && (
            <Alert
              variant={notice.type === "success" ? "default" : "destructive"}
            >
              {notice.type === "success" ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <XCircle className="size-4" />
              )}
              <AlertDescription>
                <strong>{notice.title}.</strong> {notice.message}
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>IP ESP32 (lihat dari LCD alat atau halaman router)</FieldLabel>
              <Input
                value={espIp}
                onChange={(e) => setEspIp(e.target.value)}
                placeholder="contoh: 192.168.1.50"
              />
            </Field>
            <Field>
              <FieldLabel>Server URL (otomatis dari backend)</FieldLabel>
              <Input
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleCheck} disabled={checking}>
              {checking ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : (
                <Search className="size-4" data-icon="inline-start" />
              )}
              Cek Perangkat
            </Button>
            <Button onClick={handleSend} disabled={sending}>
              {sending ? (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              ) : (
                <Send className="size-4" data-icon="inline-start" />
              )}
              {sending ? "Mengirim..." : "Kirim Konfigurasi ke ESP"}
            </Button>
          </div>
          {espInfo && (
            <div className="rounded-md border p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold">
                <Cpu className="size-4" />
                {espInfo.device}
                <Badge className="rounded-md badge-status-aktif">Online</Badge>
              </div>
              <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">IP</dt>
                  <dd><code>{espInfo.ip}</code></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">MAC</dt>
                  <dd><code>{espInfo.mac}</code></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Server</dt>
                  <dd><code>{espInfo.server || "-"}</code></dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">API Key</dt>
                  <dd>{espInfo.key_set ? "Tersimpan" : "Belum di-set"}</dd>
                </div>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>

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
