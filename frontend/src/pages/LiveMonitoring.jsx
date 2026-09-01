import { useMemo } from "react";
import { useRealtime } from "../hooks/useRealtime";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import {
  Activity,
  CloudOff,
  LogIn,
  LogOut,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SESSION_CARDS = [
  {
    key: "checkin",
    label: "Check-in",
    icon: LogIn,
    bg: "linear-gradient(135deg, #10b981, #34d399)",
  },
  {
    key: "checkout",
    label: "Checkout",
    icon: LogOut,
    bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)",
  },
  {
    key: "total",
    label: "Total Event",
    icon: Activity,
    bg: "linear-gradient(135deg, #6366f1, #818cf8)",
  },
];

const STATUS_UI = {
  live: {
    label: "Live",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    icon: Wifi,
    description: "Terhubung ke stream realtime perangkat.",
  },
  reconnecting: {
    label: "Menyambungkan ulang...",
    dot: "bg-amber-500 animate-pulse",
    text: "text-amber-600",
    icon: WifiOff,
    description: "Koneksi terputus, mencoba menyambung kembali tiap 3 detik.",
  },
  connecting: {
    label: "Menyambungkan...",
    dot: "bg-amber-500 animate-pulse",
    text: "text-amber-600",
    icon: WifiOff,
    description: "Membuka koneksi ke stream realtime.",
  },
};

function formatJam(ev) {
  if (ev.jam) return ev.jam;
  if (!ev.created_at) return "-";
  return new Date(ev.created_at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LiveMonitoring() {
  const { events, status } = useRealtime(true);
  const ui = STATUS_UI[status] || STATUS_UI.connecting;

  const stats = useMemo(
    () => ({
      checkin: events.filter((ev) => ev.type === "check_in").length,
      checkout: events.filter((ev) => ev.type === "checkout").length,
      total: events.length,
    }),
    [events]
  );

  return (
    <div>
      <div className="page-header">
        <h4>Live Monitoring</h4>
        <small className="text-muted-foreground">
          Pantau aktivitas tap RFID perangkat IoT secara realtime.
        </small>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <span className={`size-2.5 rounded-full ${ui.dot}`} aria-hidden="true" />
          <ui.icon className="size-4 text-muted-foreground" />
          <div>
            <div className={`text-sm font-semibold ${ui.text}`}>
              {ui.label}
            </div>
            <small className="text-muted-foreground">{ui.description}</small>
          </div>
          <Radio className="ms-auto size-4 text-muted-foreground" />
        </CardContent>
      </Card>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SESSION_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="stat-card" style={{ background: card.bg }}>
              <div className="stat-card__content">
                <div className="stat-card__value">{stats[card.key]}</div>
                <div className="stat-card__label">{card.label}</div>
              </div>
              <Icon className="stat-card__icon size-10" />
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Activity className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">
            Aktivitas Terbaru
          </CardTitle>
          <small className="ms-auto text-muted-foreground">
            {events.length} event terakhir
          </small>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <EmptyState
              message={
                status === "live"
                  ? "Terhubung. Menunggu aktivitas tap RFID dari perangkat..."
                  : "Belum ada event realtime. Pastikan perangkat ESP32 aktif dan terhubung."
              }
              icon={<CloudOff className="size-10" />}
            />
          ) : (
            <ul className="divide-y">
              {events.map((ev) => (
                <li key={`${ev.id}-${ev.type}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    {ev.type === "checkout" ? (
                      <LogOut className="size-4 text-muted-foreground" />
                    ) : (
                      <LogIn className="size-4 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{ev.nama || "Tidak dikenal"}</div>
                    <small className="text-muted-foreground">
                      <code>{ev.nip || "-"}</code> • {ev.type === "checkout" ? "Checkout" : "Check-in"} •{" "}
                      {formatJam(ev)}
                    </small>
                  </div>
                  <StatusBadge status={ev.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
