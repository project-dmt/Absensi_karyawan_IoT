import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

const STORAGE_KEY = "esp_ip";
const POLL_INTERVAL_MS = 10000;

// Status koneksi ESP dicek di latar belakang lewat backend.
// SSE tetap jalan terpisah untuk event realtime.
export function useEspStatus() {
  const [ip, setIpState] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [pollIp, setPollIp] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [status, setStatus] = useState("unknown");
  const [info, setInfo] = useState(null);
  const [checking, setChecking] = useState(false);

  const setIp = useCallback((value) => {
    setIpState(value);
  }, []);

  const check = useCallback(
    async (targetIp = pollIp, { silent = false } = {}) => {
      const value = String(targetIp || "").trim();

      if (!value) {
        setInfo(null);
        setStatus("unknown");
        return false;
      }

      if (!silent) setChecking(true);

      try {
        const res = await api.get(`/esp/${value}/status`);
        setInfo(res.data?.data || null);
        setStatus("connected");
        localStorage.setItem(STORAGE_KEY, value);
        setPollIp(value);
        return true;
      } catch {
        setInfo(null);
        setStatus("disconnected");
        return false;
      } finally {
        if (!silent) setChecking(false);
      }
    },
    [pollIp]
  );

  useEffect(() => {
    if (!pollIp) {
      setStatus("unknown");
      return;
    }

    check(pollIp, { silent: true });
    const timer = setInterval(() => {
      check(pollIp, { silent: true });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [pollIp, check]);

  return { ip, setIp, status, info, checking, check };
}
