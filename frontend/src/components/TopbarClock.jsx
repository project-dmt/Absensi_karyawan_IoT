import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function TopbarClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString("id-ID", { hour12: false });
  const date = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="topbar__clock">
      <Clock className="size-3.5 shrink-0 opacity-60" />
      <span className="topbar__clock-time">{time}</span>
      <span className="topbar__clock-date hidden md:inline">• {date}</span>
    </div>
  );
}
