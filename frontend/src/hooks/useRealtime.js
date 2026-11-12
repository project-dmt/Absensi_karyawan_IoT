import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

export function useRealtime(enabled = true) {
  const [events, setEvents] = useState([]);
  const lastIdRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    let eventSource = null;
    let isActive = true;

    function connect() {
      if (!isActive) return;

      const token = localStorage.getItem('token');
      const url = `${api.defaults.baseURL}/absensi/stream?lastId=${lastIdRef.current}&token=${token}`;

      eventSource = new EventSource(url);

      const handleEvent = (e) => {
        try {
          const data = JSON.parse(e.data);
          setEvents(prev => {
            const exists = prev.find(ev => ev.id === data.id);
            if (exists) {
              return prev.map(ev => (ev.id === data.id ? data : ev));
            }
            return [data, ...prev].slice(0, 20);
          });
          // checkout memakai id absensi yang bisa lebih kecil dari id
          // event check_in terakhir — jangan biarkan kursor mundur
          lastIdRef.current = Math.max(lastIdRef.current, data.id);
        } catch {
          // payload tidak valid — abaikan agar koneksi tetap hidup
        }
      };

      eventSource.addEventListener('check_in', handleEvent);
      eventSource.addEventListener('checkout', handleEvent);

      eventSource.onerror = () => {
        eventSource.close();
        if (isActive) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      isActive = false;
      if (eventSource) eventSource.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [enabled]);

  return { events };
}
