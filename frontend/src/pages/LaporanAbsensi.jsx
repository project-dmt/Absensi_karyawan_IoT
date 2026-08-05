import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";

const STATUS_OPTIONS = [
  { value: "Hadir", label: "Hadir" },
  { value: "Terlambat", label: "Terlambat" },
  { value: "Alpha", label: "Alpha" },
  { value: "Izin", label: "Izin" },
  { value: "Sakit", label: "Sakit" },
];

const EDITABLE_STATUSES = ["Hadir", "Terlambat", "Alpha", "Izin", "Sakit"];

export default function LaporanAbsensi() {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [filter, setFilter] = useState({
    dari: sevenDaysAgo,
    sampai: today,
    divisi_id: "",
  });
  const [divisi, setDivisi] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(true);

  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ status: "", keterangan: "", jam_pulang: "" });
  const [editErrors, setEditErrors] = useState({});
  const [editMessage, setEditMessage] = useState({ type: "", text: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/divisi")
      .then((res) => setDivisi(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
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
      const params = new URLSearchParams({ dari: filter.dari, sampai: filter.sampai, format });
      if (filter.divisi_id) params.append("divisi_id", filter.divisi_id);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/laporan/export`,
        {
          params,
          responseType: "blob",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `laporan_absensi_${filter.dari}_sd_${filter.sampai}.${format === "xlsx" ? "xlsx" : "csv"}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Export belum tersedia atau terjadi kesalahan");
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      status: item.status,
      keterangan: item.keterangan || "",
      jam_pulang: item.jam_pulang ? item.jam_pulang.substring(0, 5) : "",
    });
    setEditErrors({});
    setEditMessage({ type: "", text: "" });
  };

  const closeEdit = () => {
    setEditItem(null);
    setEditErrors({});
    setEditMessage({ type: "", text: "" });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setEditErrors((prev) => ({ ...prev, [name]: undefined }));
    setEditMessage({ type: "", text: "" });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditErrors({});
    setEditMessage({ type: "", text: "" });
    try {
      const payload = { status: editForm.status };
      if (editForm.keterangan) payload.keterangan = editForm.keterangan;
      if (editForm.jam_pulang) payload.jam_pulang = editForm.jam_pulang + ":00";

      await api.put(`/absensi/${editItem.id}`, payload);
      setEditMessage({ type: "success", text: "Absensi berhasil diupdate" });
      fetchData();
    } catch (err) {
      if (err.response?.status === 422) {
        if (err.response.data.message) {
          setEditMessage({ type: "danger", text: err.response.data.message });
        }
        setEditErrors(err.response.data.errors || {});
      } else {
        setEditMessage({ type: "danger", text: err.response?.data?.message || "Gagal mengupdate absensi" });
      }
    } finally {
      setEditSubmitting(false);
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
            onClick={() => handleExport("xlsx")}
          >
            <i className="bi bi-file-earmark-excel me-1" />
            Export Excel
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => handleExport("csv")}
          >
            <i className="bi bi-filetype-csv me-1" />
            Export CSV
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
                    <th>Aksi</th>
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
                      <td>
                        <button
                          className="btn-action btn-action--edit"
                          title="Edit Absensi"
                          onClick={() => openEdit(item)}
                        >
                          <i className="bi bi-pencil" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeEdit(); }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-pencil-square me-2 text-primary" />
                  Edit Absensi
                </h5>
                <button type="button" className="btn-close" onClick={closeEdit} />
              </div>
              <div className="modal-body">
                <div className="mb-3 p-2 bg-light rounded">
                  <small className="text-muted">Karyawan</small>
                  <div className="fw-semibold">{editItem.employee?.nama} ({editItem.employee?.nip})</div>
                  <small className="text-muted">Tanggal: {editItem.tanggal} | Jam Masuk: {editItem.jam_masuk || "-"}</small>
                </div>

                {editMessage.text && (
                  <div className={`alert alert-${editMessage.type} d-flex align-items-center gap-2 py-2`} role="alert">
                    <i className={`bi ${editMessage.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`} />
                    {editMessage.text}
                  </div>
                )}

                <form onSubmit={handleEditSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      name="status"
                      className={`form-select ${editErrors.status ? "is-invalid" : ""}`}
                      value={editForm.status}
                      onChange={handleEditChange}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {editErrors.status && <div className="invalid-feedback">{editErrors.status[0]}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Jam Pulang</label>
                    <input
                      type="time"
                      name="jam_pulang"
                      className={`form-control ${editErrors.jam_pulang ? "is-invalid" : ""}`}
                      value={editForm.jam_pulang}
                      onChange={handleEditChange}
                    />
                    {editErrors.jam_pulang && <div className="invalid-feedback">{editErrors.jam_pulang[0]}</div>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Keterangan</label>
                    <textarea
                      name="keterangan"
                      className={`form-control ${editErrors.keterangan ? "is-invalid" : ""}`}
                      value={editForm.keterangan}
                      onChange={handleEditChange}
                      rows={3}
                      placeholder="Keterangan (opsional)"
                      style={{ resize: "vertical" }}
                    />
                    {editErrors.keterangan && <div className="invalid-feedback">{editErrors.keterangan[0]}</div>}
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={closeEdit}>
                      Batal
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                      {editSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-1" />
                          Simpan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
