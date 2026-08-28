import { useState, useCallback, useEffect, useRef } from "react";
import api from "../api/axios";

export function useAuth() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const resolveReady = useRef(null);
  const readyRef = useRef(null);
  if (!readyRef.current) {
    readyRef.current = new Promise((resolve) => {
      resolveReady.current = resolve;
    });
  }
  const ready = readyRef.current;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      resolveReady.current();
      return;
    }
    api
      .get("/user")
      .then((res) => {
        setUser(res.data.data);
        localStorage.setItem("user", JSON.stringify(res.data.data));
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
        resolveReady.current();
      });
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post("/login", { email, password });
    const { token, user: userData } = res.data.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/logout");
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    }
  }, []);

  return { user, loading, ready, login, logout };
}
