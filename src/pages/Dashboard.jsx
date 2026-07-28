import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { useRealtime } from "../hooks/useRealtime";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalKaryawan: 0,
    hadir: 0,
    terlambat: 0,
    tidakHadir: 0,
  });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const realtimeEvents = useRealtime();

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    Promise.all([
      api.get("/karyawan"),
      api.get("/laporan", { params: { dari: today, sampai: today } }),
    ])
      .then(([karyawanRes, laporanRes]) => {
        const karyawan = karyawanRes.data.data;
        const laporan = laporanRes.data.data;

        const hadir = laporan.filter((l) => l.status === "Hadir").length;
        const terlambat = laporan.filter((l) => l.status === "Terlambat").length;

        setStats({
          totalKaryawan: karyawan.length,
          hadir,
          terlambat,
          tidakHadir: karyawan.length - hadir - terlambat,
        });
        setRecent(laporan.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (realtimeEvents.length === 0) return;
    setRecent((prev) => {
      const merged = [...realtimeEvents, ...prev]
        .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
        .slice(0, 10);
      return merged;
    });
    setStats((prev) => {
      let newHadir = prev.hadir;
      let newTerlambat = prev.terlambat;
      realtimeEvents.forEach((ev) => {
        if (ev.status === "Hadir") newHadir += 1;
        if (ev.status === "Terlambat") newTerlambat += 1;
      });
      return {
        ...prev,
        hadir: newHadir,
        terlambat: newTerlambat,
        tidakHadir: prev.totalKaryawan - newHadir - newTerlambat,
      };
    });
  }, [realtimeEvents]);

  if (loading) return <LoadingSpinner />;

  const cards = [
    {
      label: "Total Karyawan",
      value: stats.totalKaryawan,
      bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)",
      icon: "bi-people",
      link: null,
    },
    {
      label: "Hadir Hari Ini",
      value: stats.hadir,
      bg: "linear-gradient(135deg, #10b981, #34d399)",
      icon: "bi-check-circle",
      link: "/dashboard/hadir",
    },
    {
      label: "Terlambat",
      value: stats.terlambat,
      bg: "linear-gradient(135deg, #f59e0b, #fbbf24)",
      icon: "bi-exclamation-triangle",
      link: "/dashboard/terlambat",
    },
    {
      label: "Tidak Hadir",
      value: stats.tidakHadir,
      bg: "linear-gradient(135deg, #ef4444, #f87171)",
      icon: "bi-x-circle",
      link: "/dashboard/tidak-hadir",
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h4>Dashboard</h4>
        <small className="text-muted">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </small>
      </div>

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div key={card.label} className="col-sm-6 col-xl-3">
            <div
              className="stat-card"
              style={{
                background: card.bg,
                cursor: card.link ? "pointer" : "default",
              }}
              onClick={() => card.link && navigate(card.link)}
            >
              <i className={`bi ${card.icon} stat-card__icon`} />
              <div className="stat-card__value">{card.value}</div>
              <div className="stat-card__label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header d-flex align-items-center gap-2">
          <i className="bi bi-clock-history" />
          Absensi Terbaru Hari Ini
        </div>
        <div className="card-body p-0">
          {recent.length === 0 ? (
            <EmptyState message="Belum ada data absensi hari ini" icon="bi-calendar-x" />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>NIP</th>
                    <th>Jam Masuk</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((item) => (
                    <tr key={item.id}>
                      <td className="fw-medium">{item.employee?.nama}</td>
                      <td><code>{item.employee?.nip}</code></td>
                      <td>{item.jam_masuk || "-"}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
