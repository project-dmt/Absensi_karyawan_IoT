import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useDebounce } from "../hooks/useDebounce";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import FormInput from "../components/FormInput";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";

const INITIAL_FORM = {
  nama: "",
  nip: "",
  jabatan: "",
  divisi_id: "",
  rfid_uid: "",
  status: "aktif",
};

export default function DataKaryawan() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [divisi, setDivisi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [karyawanRes, divisiRes] = await Promise.all([
        api.get("/karyawan"),
        api.get("/divisi"),
      ]);
      setData(Array.isArray(karyawanRes.data.data?.data) ? karyawanRes.data.data.data : (Array.isArray(karyawanRes.data.data) ? karyawanRes.data.data : []));
      setDivisi(divisiRes.data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = data.filter(
    (item) =>
      item.nama.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.nip.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.rfid_uid.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const openAdd = () => {
    setEditId(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setForm({
      nama: item.nama,
      nip: item.nip,
      jabatan: item.jabatan || "",
      divisi_id: item.divisi_id || "",
      rfid_uid: item.rfid_uid,
      status: item.status,
    });
    setErrors({});
    setShowModal(true);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError("");
    try {
      if (editId) {
        await api.put(`/karyawan/${editId}`, form);
      } else {
        await api.post("/karyawan", form);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setFormError(err.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus karyawan ini?")) return;
    try {
      await api.delete(`/karyawan/${id}`);
      fetchData();
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <h4>Data Karyawan</h4>
        <button className="btn btn-primary" onClick={openAdd}>
          <i className="bi bi-plus-lg me-1" />
          Tambah Karyawan
        </button>
      </div>

      <div className="mb-3" style={{ maxWidth: "360px" }}>
        <div className="search-input-wrapper">
          <i className="bi bi-search search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Cari nama, NIP, atau UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState message="Tidak ada karyawan ditemukan" icon="bi-people" />
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
                    <th>Jabatan</th>
                    <th>Divisi</th>
                    <th>RFID UID</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td className="fw-medium">{item.nama}</td>
                      <td><code>{item.nip}</code></td>
                      <td>{item.jabatan || "-"}</td>
                      <td>{item.division?.nama_divisi || "-"}</td>
                      <td><code>{item.rfid_uid}</code></td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          <button
                            className="btn-action btn-action--edit"
                            title="Lihat Detail"
                            onClick={() => navigate(`/data-karyawan/${item.id}`)}
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
        title={editId ? "Edit Karyawan" : "Tambah Karyawan"}
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2" role="alert">
              <i className="bi bi-exclamation-circle-fill" />
              <span>{formError}</span>
            </div>
          )}
          <FormInput
            label="Nama"
            name="nama"
            value={form.nama}
            onChange={handleChange}
            error={errors.nama?.[0]}
            placeholder="Nama lengkap"
            required
          />
          <FormInput
            label="NIP"
            name="nip"
            value={form.nip}
            onChange={handleChange}
            error={errors.nip?.[0]}
            placeholder="Nomor induk pegawai"
            required
          />
          <FormInput
            label="Jabatan"
            name="jabatan"
            value={form.jabatan}
            onChange={handleChange}
            error={errors.jabatan?.[0]}
            placeholder="Jabatan karyawan"
          />
          <FormInput
            label="Divisi"
            name="divisi_id"
            as="select"
            value={form.divisi_id}
            onChange={handleChange}
            error={errors.divisi_id?.[0]}
            placeholder="Pilih divisi..."
            options={divisi.map((d) => ({
              value: d.id,
              label: d.nama_divisi,
            }))}
          />
          <FormInput
            label="RFID UID"
            name="rfid_uid"
            value={form.rfid_uid}
            onChange={handleChange}
            error={errors.rfid_uid?.[0]}
            placeholder="Contoh: A1B2C3"
            required
          />
          <FormInput
            label="Status"
            name="status"
            as="select"
            value={form.status}
            onChange={handleChange}
            options={[
              { value: "aktif", label: "Aktif" },
              { value: "nonaktif", label: "Nonaktif" },
            ]}
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
