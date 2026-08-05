import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useDebounce } from "../hooks/useDebounce";
import Modal from "../components/Modal";
import FormInput from "../components/FormInput";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";

export default function DataDivisi() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [namaDivisi, setNamaDivisi] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/divisi");
      setData(res.data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = data.filter((item) =>
    item.nama_divisi.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const openAdd = () => {
    setEditId(null);
    setNamaDivisi("");
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setNamaDivisi(item.nama_divisi);
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const payload = { nama_divisi: namaDivisi };
      if (editId) {
        await api.put(`/divisi/${editId}`, payload);
      } else {
        await api.post("/divisi", payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus divisi ini?")) return;
    try {
      await api.delete(`/divisi/${id}`);
      fetchData();
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <h4>Data Divisi</h4>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-lg me-1" />
          Tambah Divisi
        </button>
      </div>

      <div className="mb-3" style={{ maxWidth: "360px" }}>
        <div className="search-input-wrapper">
          <i className="bi bi-search search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Cari divisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message="Tidak ada divisi ditemukan" icon="bi-diagram-3" />
      ) : (
        <div className="card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Divisi</th>
                    <th>Jumlah Karyawan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-medium">{item.nama_divisi}</td>
                      <td>
                        <span className="badge bg-primary-subtle text-primary">
                          {item.employees_count ?? 0} orang
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className="btn-action btn-action--edit"
                            title="Lihat Detail"
                            onClick={() => navigate(`/data-divisi/${item.id}`)}
                          >
                            <i className="bi bi-eye" />
                          </button>
                          <button
                            className="btn-action btn-action--edit"
                            title="Edit"
                            onClick={() => openEdit(item)}
                          >
                            <i className="bi bi-pencil" />
                          </button>
                          <button
                            className="btn-action btn-action--delete"
                            title="Hapus"
                            onClick={() => handleDelete(item.id)}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? "Edit Divisi" : "Tambah Divisi"}
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Nama Divisi"
            name="nama_divisi"
            value={namaDivisi}
            onChange={(e) => {
              setNamaDivisi(e.target.value);
              setErrors((prev) => ({ ...prev, nama_divisi: undefined }));
            }}
            error={errors.nama_divisi?.[0]}
            placeholder="Contoh: Teknologi Informasi"
            required
          />
          <hr className="my-3" />
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowModal(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-1"
                    role="status"
                  />
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
      </Modal>
    </div>
  );
}
