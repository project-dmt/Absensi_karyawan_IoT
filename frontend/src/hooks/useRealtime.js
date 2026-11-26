import { useState, useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import api from '../api/axios';

export function useRealtime(enabled = true) {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const lastIdRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const handleCleared = () => {
      setEvents([]);
      lastIdRef.current = 0;
    };

    window.addEventListener('absensi:cleared', handleCleared);
    return () => window.removeEventListener('absensi:cleared', handleCleared);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let abortController = null;
    let isActive = true;

    function scheduleReconnect(connect) {
      if (!isActive || reconnectTimeoutRef.current) return;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, 3000);
    }

    function connect() {
      if (!isActive) return;

      const token = localStorage.getItem('token');
      const url = `${api.defaults.baseURL}/absensi/stream?lastId=${lastIdRef.current}`;
      abortController = new AbortController();

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

      // Bearer header: token tidak bocor ke query string / log proxy
      fetchEventSource(url, {
        method: 'GET',
        openWhenHidden: true,
        signal: abortController.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        onmessage: (msg) => {
          setConnected(true);
          if (msg.event === 'check_in' || msg.event === 'checkout') {
            handleEvent(msg);
          }
        },
        onerror: (err) => {
          // default library melempar ulang error — kita tangani reconnect sendiri
          setConnected(false);
          abortController.abort();
          scheduleReconnect(connect);
          // jangan throw: reconnect sudah dijadwalkan, throw hanya buat unhandled rejection
        },
      }).then(() => {
        scheduleReconnect(connect);
      }).catch(() => {
        // onerror handles reconnects; prevent an unhandled rejection if the stream aborts
        setConnected(false);
        scheduleReconnect(connect);
      });
    }

    connect();

    return () => {
      isActive = false;
      abortController?.abort();
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    };
  }, [enabled]);

  return { events, connected };
}
