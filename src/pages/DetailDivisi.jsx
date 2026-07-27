import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";

const SUMMARY_CARDS = [
  { key: "total_karyawan", label: "Total Karyawan", bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)", icon: "bi-people" },
  { key: "aktif", label: "Aktif", bg: "linear-gradient(135deg, #10b981, #34d399)", icon: "bi-check-circle" },
  { key: "nonaktif", label: "Nonaktif", bg: "linear-gradient(135deg, #94a3b8, #cbd5e1)", icon: "bi-pause-circle" },
  { key: "hadir", label: "Total Hadir", bg: "linear-gradient(135deg, #3b82f6, #60a5fa)", icon: "bi-calendar-check" },
  { key: "alpha", label: "Total Alpha", bg: "linear-gradient(135deg, #ef4444, #f87171)", icon: "bi-calendar-x" },
];

export default function DetailDivisi() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/divisi/${id}`)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!data) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-diagram-3 d-block mb-3" style={{ fontSize: "3rem", color: "#94a3b8" }} />
        <p className="text-muted">Divisi tidak ditemukan</p>
        <button className="btn btn-primary mt-2" onClick={() => navigate("/data-divisi")}>
          <i className="bi bi-arrow-left me-1" />
          Kembali
        </button>
      </div>
    );
  }

  const { division, employees, summary } = data;

  return (
    <div>
      <div className="page-header">
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => navigate("/data-divisi")}
            title="Kembali"
          >
            <i className="bi bi-arrow-left" />
          </button>
          <div>
            <h4 className="mb-0">Detail Divisi</h4>
            <small className="text-muted">{division.nama_divisi}</small>
          </div>
        </div>
      </div>

      {/* Division Info */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <i className="bi bi-diagram-3" />
          Informasi Divisi
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">Nama Divisi</small>
              <div className="fw-semibold">{division.nama_divisi}</div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">Total Karyawan</small>
              <div>
                <span className="badge bg-primary-subtle text-primary">{summary.total_karyawan} orang</span>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">Karyawan Aktif</small>
              <div>
                <span className="badge bg-success-subtle text-success">{summary.aktif} orang</span>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">Karyawan Nonaktif</small>
              <div>
                <span className="badge bg-secondary-subtle text-secondary">{summary.nonaktif} orang</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary Cards */}
      <div className="row g-3 mb-4">
        {SUMMARY_CARDS.map((card) => (
          <div key={card.key} className="col-6 col-md-4 col-lg">
            <div className="stat-card" style={{ background: card.bg }}>
              <i className={`bi ${card.icon} stat-card__icon`} />
              <div className="stat-card__value">{summary[card.key]}</div>
              <div className="stat-card__label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Employee List */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-people" />
            Daftar Karyawan
          </div>
          <small className="text-muted">{employees.length} karyawan</small>
        </div>
        <div className="card-body p-0">
          {employees.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-people" />
              <p>Belum ada karyawan di divisi ini</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>NIP</th>
                    <th>Jabatan</th>
                    <th>RFID UID</th>
                    <th>Status</th>
                    <th>Hadir</th>
                    <th>Terlambat</th>
                    <th>Alpha</th>
                    <th>Izin</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => (
                    <tr key={emp.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-medium">{emp.nama}</td>
                      <td><code>{emp.nip}</code></td>
                      <td>{emp.jabatan || "-"}</td>
                      <td><code>{emp.rfid_uid}</code></td>
                      <td>
                        <StatusBadge status={emp.status} />
                      </td>
                      <td>
                        <span className="badge bg-success-subtle text-success">{emp.summary.hadir}</span>
                      </td>
                      <td>
                        <span className="badge bg-warning-subtle text-warning">{emp.summary.terlambat}</span>
                      </td>
                      <td>
                        <span className="badge bg-danger-subtle text-danger">{emp.summary.alpha}</span>
                      </td>
                      <td>
                        <span className="badge bg-info-subtle text-info">{emp.summary.izin}</span>
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
