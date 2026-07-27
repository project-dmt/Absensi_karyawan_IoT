import { useState, useEffect, useCallback } from "react";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";

export default function LaporanAbsensi() {
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
    .toISOString()
    .split("T")[0];

  const [filter, setFilter] = useState({
    dari: firstDay,
    sampai: today,
    divisi_id: "",
  });
  const [divisi, setDivisi] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    api
      .get("/divisi")
      .then((res) => setDivisi(res.data.data))
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetched(true);
    try {
      const params = { dari: filter.dari, sampai: filter.sampai };
      if (filter.divisi_id) params.divisi_id = filter.divisi_id;
      const res = await api.get("/laporan", { params });
      setData(res.data.data);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const handleChange = (e) => {
    setFilter((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleExport = async (format) => {
    try {
      const params = {
        dari: filter.dari,
        sampai: filter.sampai,
        format,
      };
      if (filter.divisi_id) params.divisi_id = filter.divisi_id;
      const res = await api.get("/laporan/export", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `laporan_absensi_${filter.dari}_${filter.sampai}.${format === "excel" ? "xlsx" : format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Export belum tersedia atau terjadi kesalahan");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h4>Laporan Absensi</h4>
      </div>

      <div className="card mb-4">
        <div className="card-header d-flex align-items-center gap-2">
          <i className="bi bi-funnel" />
          Filter Laporan
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Dari Tanggal</label>
              <input
                type="date"
                className="form-control"
                name="dari"
                value={filter.dari}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Sampai Tanggal</label>
              <input
                type="date"
                className="form-control"
                name="sampai"
                value={filter.sampai}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Divisi</label>
              <select
                className="form-select"
                name="divisi_id"
                value={filter.divisi_id}
                onChange={handleChange}
              >
                <option value="">Semua Divisi</option>
                {divisi.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama_divisi}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <button
                className="btn btn-primary w-100"
                onClick={fetchData}
                disabled={loading}
              >
                {loading ? (
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                  />
                ) : (
                  <>
                    <i className="bi bi-search me-1" />
                    Terapkan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {fetched && (
        <div className="d-flex gap-2 mb-3">
          <button
            className="btn btn-outline-success btn-sm"
            onClick={() => handleExport("excel")}
          >
            <i className="bi bi-file-earmark-excel me-1" />
            Export Excel
          </button>
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={() => handleExport("pdf")}
          >
            <i className="bi bi-file-earmark-pdf me-1" />
            Export PDF
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : !fetched ? (
        <EmptyState message="Pilih rentang tanggal lalu klik Terapkan untuk melihat laporan" icon="bi-calendar-range" />
      ) : data.length === 0 ? (
        <EmptyState message="Tidak ada data absensi untuk rentang tanggal ini" icon="bi-calendar-x" />
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>NIP</th>
                    <th>Tanggal</th>
                    <th>Jam Masuk</th>
                    <th>Jam Pulang</th>
                    <th>Status</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-medium">{item.employee?.nama}</td>
                      <td><code>{item.employee?.nip}</code></td>
                      <td>{item.tanggal}</td>
                      <td>{item.jam_masuk || "-"}</td>
                      <td>{item.jam_pulang || "-"}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>{item.keterangan || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
