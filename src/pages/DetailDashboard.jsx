import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

const PAGE_CONFIG = {
  terlambat: {
    title: "Karyawan Terlambat Hari Ini",
    endpoint: "/dashboard/terlambat",
    columns: ["No", "Nama", "NIP", "Divisi", "Jam Masuk", "Jam Standar", "Keterlambatan"],
  },
  hadir: {
    title: "Karyawan Hadir Hari Ini",
    endpoint: "/dashboard/hadir",
    columns: ["No", "Nama", "NIP", "Divisi", "Jam Masuk"],
  },
  "tidak-hadir": {
    title: "Karyawan Tidak Hadir Hari Ini",
    endpoint: "/dashboard/tidak-hadir",
    columns: ["No", "Nama", "NIP", "Divisi"],
  },
};

export default function DetailDashboard() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const config = PAGE_CONFIG[type];

  useEffect(() => {
    if (!config) return;
    setLoading(true);
    api
      .get(config.endpoint)
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  if (!config) {
    return <EmptyState message="Halaman tidak ditemukan" />;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header d-flex align-items-center gap-3">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => navigate("/")}
        >
          <i className="bi bi-arrow-left" /> Kembali
        </button>
        <div>
          <h4>{config.title}</h4>
          <small className="text-muted">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </small>
        </div>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {data.length === 0 ? (
            <EmptyState
              message={`Tidak ada data ${config.title.toLowerCase()}`}
              icon="bi-check-circle"
            />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    {config.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-medium">{item.nama}</td>
                      <td><code>{item.nip}</code></td>
                      <td>{item.divisi}</td>
                      {type !== "tidak-hadir" && <td>{item.jam_masuk}</td>}
                      {type === "terlambat" && (
                        <>
                          <td>{item.jam_standar}</td>
                          <td>
                            <span className="badge bg-warning text-dark">
                              +{item.keterlambatan} menit
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <small className="text-muted">
          Total: {data.length} karyawan
        </small>
      </div>
    </div>
  );
}
