import { useState, useEffect } from "react";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalKaryawan: 0,
    hadir: 0,
    terlambat: 0,
    tidakHadir: 0,
  });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <LoadingSpinner />;

  const cards = [
    {
      label: "Total Karyawan",
      value: stats.totalKaryawan,
      color: "primary",
      icon: "bi-people",
    },
    {
      label: "Hadir Hari Ini",
      value: stats.hadir,
      color: "success",
      icon: "bi-check-circle",
    },
    {
      label: "Terlambat",
      value: stats.terlambat,
      color: "warning",
      icon: "bi-exclamation-triangle",
    },
    {
      label: "Tidak Hadir",
      value: stats.tidakHadir,
      color: "danger",
      icon: "bi-x-circle",
    },
  ];

  return (
    <div>
      <h4 className="mb-4 fw-bold">Dashboard</h4>

      <div className="row g-3 mb-4">
        {cards.map((card) => (
          <div key={card.label} className="col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <small className="text-muted">{card.label}</small>
                    <h3 className="fw-bold mb-0 mt-1">{card.value}</h3>
                  </div>
                  <div
                    className={`bg-${card.color} bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center`}
                    style={{ width: "48px", height: "48px" }}
                  >
                    <i className={`bi ${card.icon} text-${card.color} fs-4`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white fw-bold">
          <i className="bi bi-clock-history me-2" />
          Absensi Terbaru
        </div>
        <div className="card-body p-0">
          {recent.length === 0 ? (
            <div className="text-center py-4 text-muted">
              Belum ada data absensi hari ini
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
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
                      <td>{item.employee?.nama}</td>
                      <td>{item.employee?.nip}</td>
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
