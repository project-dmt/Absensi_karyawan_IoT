import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import LoadingSpinner from "../components/LoadingSpinner";

const SUMMARY_CARDS = [
  { key: "total", label: "Total Absensi", bg: "linear-gradient(135deg, #4f6d7a, #7b9aab)", icon: "bi-calendar-check" },
  { key: "hadir", label: "Hadir", bg: "linear-gradient(135deg, #10b981, #34d399)", icon: "bi-check-circle" },
  { key: "terlambat", label: "Terlambat", bg: "linear-gradient(135deg, #f59e0b, #fbbf24)", icon: "bi-exclamation-triangle" },
  { key: "alpha", label: "Alpha", bg: "linear-gradient(135deg, #ef4444, #f87171)", icon: "bi-x-circle" },
  { key: "izin", label: "Izin", bg: "linear-gradient(135deg, #6366f1, #818cf8)", icon: "bi-file-earmark-check" },
];

export default function DetailKaryawan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ dari: "", sampai: "" });

  const fetchData = async (params = {}) => {
    setLoading(true);
    try {
      const res = await api.get(`/karyawan/${id}/absensi`, { params });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleFilter = () => {
    const params = {};
    if (filter.dari) params.dari = filter.dari;
    if (filter.sampai) params.sampai = filter.sampai;
    fetchData(params);
  };

  const handleResetFilter = () => {
    setFilter({ dari: "", sampai: "" });
    fetchData();
  };

  if (loading) return <LoadingSpinner />;
  if (!data) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-person-x d-block mb-3" style={{ fontSize: "3rem", color: "#94a3b8" }} />
        <p className="text-muted">Karyawan tidak ditemukan</p>
        <button className="btn btn-primary mt-2" onClick={() => navigate("/data-karyawan")}>
          <i className="bi bi-arrow-left me-1" />
          Kembali
        </button>
      </div>
    );
  }

  const { employee, absensi, summary } = data;

  return (
    <div>
      <div className="page-header">
        <div className="d-flex align-items-center gap-3">
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => navigate("/data-karyawan")}
            title="Kembali"
          >
            <i className="bi bi-arrow-left" />
          </button>
          <div>
            <h4 className="mb-0">Detail Karyawan</h4>
            <small className="text-muted">{employee.nama}</small>
          </div>
        </div>
      </div>

      {/* Employee Info Card */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <i className="bi bi-person-badge" />
          Informasi Karyawan
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">Nama Lengkap</small>
              <div className="fw-semibold">{employee.nama}</div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">NIP</small>
              <div><code>{employee.nip}</code></div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">Jabatan</small>
              <div>{employee.jabatan || "-"}</div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">Divisi</small>
              <div>{employee.division?.nama_divisi || "-"}</div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">RFID UID</small>
              <div><code>{employee.rfid_uid}</code></div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <small className="text-muted d-block mb-1">Status</small>
              <div>
                <StatusBadge status={employee.status} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
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

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <i className="bi bi-funnel" />
          Filter Periode
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Dari Tanggal</label>
              <input
                type="date"
                className="form-control"
                value={filter.dari}
                onChange={(e) => setFilter((prev) => ({ ...prev, dari: e.target.value }))}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Sampai Tanggal</label>
              <input
                type="date"
                className="form-control"
                value={filter.sampai}
                onChange={(e) => setFilter((prev) => ({ ...prev, sampai: e.target.value }))}
              />
            </div>
            <div className="col-md-3 d-flex gap-2">
              <button className="btn btn-primary" onClick={handleFilter}>
                <i className="bi bi-search me-1" />
                Terapkan
              </button>
              <button className="btn btn-secondary" onClick={handleResetFilter}>
                <i className="bi bi-arrow-counterclockwise me-1" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-clock-history" />
            Riwayat Absensi
          </div>
          <small className="text-muted">{absensi.length} record</small>
        </div>
        <div className="card-body p-0">
          {absensi.length === 0 ? (
            <div className="empty-state">
              <i className="bi bi-calendar-x" />
              <p>Tidak ada data absensi untuk periode ini</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Tanggal</th>
                    <th>Status</th>
                    <th>Jam Masuk</th>
                    <th>Jam Pulang</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {absensi.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-medium">{item.tanggal}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>{item.jam_masuk || "-"}</td>
                      <td>{item.jam_pulang || "-"}</td>
                      <td>
                        {item.keterangan ? (
                          <span className="text-muted">{item.keterangan}</span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
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
