import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import api from "@/api/axios";

export default function TopbarClock() {
  const [now, setNow] = useState(() => new Date());
  const offsetRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function syncServerTime() {
      try {
        const res = await api.get("/server-time");
        const data = res.data?.data || res.data;
        // dukung format: { time, timestamp } atau { formatted }
        let serverMs;
        if (data?.timestamp) serverMs = data.timestamp * 1000;
        else if (data?.time) serverMs = new Date(data.time).getTime();
        else serverMs = Date.now();
        if (!cancelled && !Number.isNaN(serverMs)) {
          offsetRef.current = serverMs - Date.now();
        }
      } catch {
        // fallback: tetap pakai jam lokal (offset 0)
        offsetRef.current = 0;
      }
    }

    syncServerTime();
    // re-sync tiap 60 detik untuk koreksi drift / perubahan jam server
    const syncId = setInterval(syncServerTime, 60_000);
    const tickId = setInterval(() => {
      setNow(new Date(Date.now() + offsetRef.current));
    }, 1000);

    // set langsung sekali agar tidak delay 1 detik
    setNow(new Date(Date.now() + offsetRef.current));

    return () => {
      cancelled = true;
      clearInterval(syncId);
      clearInterval(tickId);
    };
  }, []);

  const time = now.toLocaleTimeString("id-ID", { hour12: false });
  const date = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="topbar__clock" title="Jam server (sinkron tiap 60 detik)">
      <Clock className="size-3.5 shrink-0 opacity-60" />
      <span className="topbar__clock-time">{time}</span>
      <span className="topbar__clock-date hidden md:inline">• {date}</span>
    </div>
  );
}
