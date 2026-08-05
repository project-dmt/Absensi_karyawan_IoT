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

function calcSummary(absensi) {
  return {
    total: absensi.length,
    hadir: absensi.filter((a) => a.status === "Hadir").length,
    terlambat: absensi.filter((a) => a.status === "Terlambat").length,
    alpha: absensi.filter((a) => a.status === "Alpha").length,
    izin: absensi.filter((a) => a.status === "Izin").length,
    sakit: absensi.filter((a) => a.status === "Sakit").length,
  };
}

export default function DetailKaryawan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [absensi, setAbsensi] = useState([]);
  const [filteredAbsensi, setFilteredAbsensi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ dari: "", sampai: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, absRes] = await Promise.all([
        api.get(`/karyawan/${id}`),
        api.get(`/karyawan/${id}/absensi`, { params: { per_page: 500 } }),
      ]);
      setEmployee(empRes.data.data);
      const records = absRes.data.data.riwayat?.data || [];
      setAbsensi(records);
      setFilteredAbsensi(records);
    } catch {
      setEmployee(null);
      setAbsensi([]);
      setFilteredAbsensi([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleFilter = () => {
    let result = [...absensi];
    if (filter.dari) result = result.filter((a) => a.tanggal >= filter.dari);
    if (filter.sampai) result = result.filter((a) => a.tanggal <= filter.sampai);
    setFilteredAbsensi(result);
  };

  const handleResetFilter = () => {
    setFilter({ dari: "", sampai: "" });
    setFilteredAbsensi(absensi);
  };

  if (loading) return <LoadingSpinner />;
  if (!employee) {
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

  const summary = calcSummary(filteredAbsensi);

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
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-2 align-items-end">
            <div>
              <label className="form-label fw-semibold mb-1" style={{ fontSize: "0.8rem" }}>
                <i className="bi bi-calendar-start me-1" />
                Dari
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filter.dari}
                onChange={(e) => setFilter((prev) => ({ ...prev, dari: e.target.value }))}
                style={{ width: 170 }}
              />
            </div>
            <div>
              <label className="form-label fw-semibold mb-1" style={{ fontSize: "0.8rem" }}>
                <i className="bi bi-calendar-end me-1" />
                Sampai
              </label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filter.sampai}
                onChange={(e) => setFilter((prev) => ({ ...prev, sampai: e.target.value }))}
                style={{ width: 170 }}
              />
            </div>
            <div className="d-flex gap-2 pb-1">
              <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={handleFilter}>
                <i className="bi bi-search" />
                Terapkan
              </button>
              <button className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1" onClick={handleResetFilter}>
                <i className="bi bi-arrow-counterclockwise" />
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
          <small className="text-muted">{filteredAbsensi.length} record</small>
        </div>
        <div className="card-body p-0">
          {filteredAbsensi.length === 0 ? (
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
                  {filteredAbsensi.map((item, idx) => (
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
