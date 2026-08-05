import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';

export function useRealtime() {
  const [events, setEvents] = useState([]);
  const lastIdRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    let eventSource = null;
    let isActive = true;

    function connect() {
      if (!isActive) return;

      const token = localStorage.getItem('token');
      const url = `${api.defaults.baseURL}/absensi/stream?lastId=${lastIdRef.current}&token=${token}`;

      eventSource = new EventSource(url);

      eventSource.addEventListener('check_in', (e) => {
        const data = JSON.parse(e.data);
        setEvents(prev => [data, ...prev].slice(0, 20));
        lastIdRef.current = data.id;
      });

      eventSource.addEventListener('checkout', (e) => {
        const data = JSON.parse(e.data);
        setEvents(prev => {
          const exists = prev.find(ev => ev.id === data.id);
          if (exists) {
            return prev.map(ev => ev.id === data.id ? data : ev);
          }
          return [data, ...prev].slice(0, 20);
        });
        lastIdRef.current = data.id;
      });

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
  }, []);

  return events;
}
