import { useState, useEffect } from "react";
import api from "../api/axios";
import FormInput from "../components/FormInput";
import StatusBadge from "../components/StatusBadge";

const STATUS_OPTIONS = [
  { value: "Hadir", label: "Hadir" },
  { value: "Terlambat", label: "Terlambat" },
  { value: "Alpha", label: "Alpha" },
  { value: "Izin", label: "Izin" },
  { value: "Sakit", label: "Sakit" },
];

const STATUS_INFO = {
  Hadir: { showJamMasuk: true, showJamPulang: true, showKeterangan: true, keteranganPlaceholder: "Keterangan (opsional)" },
  Terlambat: { showJamMasuk: true, showJamPulang: false, showKeterangan: true, keteranganPlaceholder: "Alasan keterlambatan (opsional)" },
  Alpha: { showJamMasuk: false, showJamPulang: false, showKeterangan: true, keteranganPlaceholder: "Keterangan ketidakhadiran (opsional)" },
  Izin: { showJamMasuk: false, showJamPulang: false, showKeterangan: true, keteranganPlaceholder: "Alasan izin (wajib diisi)" },
  Sakit: { showJamMasuk: false, showJamPulang: false, showKeterangan: true, keteranganPlaceholder: "Keterangan sakit (opsional)" },
};

export default function InputAbsensiManual() {
  const [karyawan, setKaryawan] = useState([]);
  const [form, setForm] = useState({
    employee_id: "",
    tanggal: new Date().toISOString().split("T")[0],
    jam_masuk: "",
    jam_pulang: "",
    status: "Hadir",
    keterangan: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [updateSearch, setUpdateSearch] = useState({ employee_id: "", tanggal: new Date().toISOString().split("T")[0] });
  const [updateRecord, setUpdateRecord] = useState(null);
  const [updateForm, setUpdateForm] = useState({ status: "", keterangan: "", jam_pulang: "" });
  const [updateErrors, setUpdateErrors] = useState({});
  const [updateMessage, setUpdateMessage] = useState({ type: "", text: "" });
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const statusInfo = STATUS_INFO[form.status] || STATUS_INFO.Hadir;

  useEffect(() => {
    api
      .get("/karyawan")
      .then((res) => setKaryawan(Array.isArray(res.data.data?.data) ? res.data.data.data : (Array.isArray(res.data.data) ? res.data.data : [])))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "status") {
        const info = STATUS_INFO[value];
        if (!info.showJamMasuk) next.jam_masuk = "";
        if (!info.showJamPulang) next.jam_pulang = "";
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setMessage({ type: "", text: "" });
    try {
      const payload = {
        employee_id: parseInt(form.employee_id),
        tanggal: form.tanggal,
        status: form.status,
      };
      if (statusInfo.showJamMasuk && form.jam_masuk) payload.jam_masuk = form.jam_masuk + ":00";
      if (statusInfo.showJamPulang && form.jam_pulang) payload.jam_pulang = form.jam_pulang + ":00";
      if (form.keterangan) payload.keterangan = form.keterangan;

      await api.post("/absensi/manual", payload);
      setMessage({
        type: "success",
        text: "Absensi manual berhasil ditambahkan",
      });
      setForm((prev) => ({
        ...prev,
        employee_id: "",
        jam_masuk: "",
        jam_pulang: "",
        keterangan: "",
      }));
    } catch (err) {
      if (err.response?.status === 422) {
        if (err.response.data.message) {
          setMessage({
            type: "danger",
            text: err.response.data.message,
          });
        }
        setErrors(err.response.data.errors || {});
      } else {
        setMessage({
          type: "danger",
          text: err.response?.data?.message || "Gagal menyimpan absensi",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({
      employee_id: "",
      tanggal: new Date().toISOString().split("T")[0],
      jam_masuk: "",
      jam_pulang: "",
      status: "Hadir",
      keterangan: "",
    });
    setErrors({});
    setMessage({ type: "", text: "" });
  };

  const handleUpdateSearch = async () => {
    if (!updateSearch.employee_id || !updateSearch.tanggal) {
      setUpdateMessage({ type: "danger", text: "Pilih karyawan dan tanggal" });
      return;
    }
    setSearchLoading(true);
    setUpdateRecord(null);
    setUpdateMessage({ type: "", text: "" });
    try {
      const res = await api.get("/laporan", {
        params: { dari: updateSearch.tanggal, sampai: updateSearch.tanggal, per_page: 500 },
      });
      const records = Array.isArray(res.data.data?.data) ? res.data.data.data : (Array.isArray(res.data.data) ? res.data.data : []);
      const employeeId = Number(updateSearch.employee_id);
      const found = records.find((r) => Number(r.employee_id) === employeeId);
      if (!found) {
        setUpdateMessage({ type: "danger", text: "Tidak ditemukan data absensi untuk karyawan ini pada tanggal tersebut" });
        return;
      }
      setUpdateRecord(found);
      setUpdateForm({
        status: found.status,
        keterangan: found.keterangan || "",
        jam_pulang: found.jam_pulang ? found.jam_pulang.substring(0, 5) : "",
      });
      setUpdateErrors({});
    } catch {
      setUpdateMessage({ type: "danger", text: "Gagal mencari data absensi" });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUpdateChange = (e) => {
    const { name, value } = e.target;
    setUpdateForm((prev) => ({ ...prev, [name]: value }));
    setUpdateErrors((prev) => ({ ...prev, [name]: undefined }));
    setUpdateMessage({ type: "", text: "" });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdateSubmitting(true);
    setUpdateErrors({});
    setUpdateMessage({ type: "", text: "" });
    try {
      const payload = {
        tanggal: updateRecord.tanggal,
        jam_masuk: updateRecord.jam_masuk,
        status: updateForm.status,
      };
      if (updateForm.keterangan) payload.keterangan = updateForm.keterangan;
      if (updateForm.jam_pulang) {
        payload.jam_pulang = updateForm.jam_pulang + ":00";
      } else if (updateRecord.jam_pulang) {
        payload.jam_pulang = updateRecord.jam_pulang;
      }

      await api.put(`/absensi/${updateRecord.id}`, payload);
      setUpdateMessage({ type: "success", text: "Status absensi berhasil diupdate" });
      setUpdateRecord(null);
    } catch (err) {
      if (err.response?.status === 422) {
        const msg = err.response.data.message;
        const errors = err.response.data.errors || {};
        setUpdateMessage({ type: "danger", text: msg || "Validasi gagal" });
        setUpdateErrors(errors);
      } else {
        setUpdateMessage({ type: "danger", text: err.response?.data?.message || "Gagal mengupdate absensi" });
      }
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const handleUpdateReset = () => {
    setUpdateSearch({ employee_id: "", tanggal: new Date().toISOString().split("T")[0] });
    setUpdateRecord(null);
    setUpdateForm({ status: "", keterangan: "", jam_pulang: "" });
    setUpdateErrors({});
    setUpdateMessage({ type: "", text: "" });
  };

  return (
    <div>
      <div className="page-header">
        <h4>Input Absensi Manual</h4>
      </div>

      <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
        Gunakan form ini untuk input absensi karyawan yang tidak dapat melakukan tap RFID.
      </p>

      {message.text && (
        <div className={`alert alert-${message.type} d-flex align-items-center gap-2 py-2`} role="alert">
          <i className={`bi ${message.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`} />
          {message.text}
        </div>
      )}

      <div className="card">
        <div className="card-header d-flex align-items-center gap-2">
          <i className="bi bi-pencil-square" />
          Form Absensi Manual
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <FormInput
              label="Nama Karyawan"
              name="employee_id"
              as="select"
              value={form.employee_id}
              onChange={handleChange}
              error={errors.employee_id?.[0]}
              placeholder="Pilih karyawan..."
              required
              options={karyawan.map((k) => ({
                value: k.id,
                label: `${k.nama} (${k.nip})`,
              }))}
            />
            <div className="row g-3">
              <div className="col-md-6">
                <FormInput
                  label="Tanggal"
                  name="tanggal"
                  type="date"
                  value={form.tanggal}
                  onChange={handleChange}
                  error={errors.tanggal?.[0]}
                  required
                />
              </div>
              <div className="col-md-6">
                <FormInput
                  label="Status"
                  name="status"
                  as="select"
                  value={form.status}
                  onChange={handleChange}
                  options={STATUS_OPTIONS}
                />
              </div>
            </div>
            {(statusInfo.showJamMasuk || statusInfo.showJamPulang) && (
              <div className="row g-3">
                {statusInfo.showJamMasuk && (
                  <div className={statusInfo.showJamPulang ? "col-md-6" : "col-md-6"}>
                    <FormInput
                      label="Jam Masuk"
                      name="jam_masuk"
                      type="time"
                      value={form.jam_masuk}
                      onChange={handleChange}
                      error={errors.jam_masuk?.[0]}
                    />
                  </div>
                )}
                {statusInfo.showJamPulang && (
                  <div className="col-md-6">
                    <FormInput
                      label="Jam Pulang"
                      name="jam_pulang"
                      type="time"
                      value={form.jam_pulang}
                      onChange={handleChange}
                      error={errors.jam_pulang?.[0]}
                    />
                  </div>
                )}
              </div>
            )}
            <FormInput
              label="Keterangan"
              name="keterangan"
              as="textarea"
              value={form.keterangan}
              onChange={handleChange}
              error={errors.keterangan?.[0]}
              placeholder={statusInfo.keteranganPlaceholder}
            />
            <div className="d-flex gap-2 mt-2">
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
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                <i className="bi bi-arrow-counterclockwise me-1" />
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <hr className="my-4" />

      <div className="card">
        <div className="card-header d-flex align-items-center gap-2">
          <i className="bi bi-arrow-repeat" />
          Update Status Absensi
        </div>
        <div className="card-body">
          <p className="text-muted mb-3" style={{ fontSize: "0.85rem" }}>
            Untuk karyawan yang sudah tap RFID pagi tapi izin/sakit di tengah hari.
          </p>

          {updateMessage.text && (
            <div className={`alert alert-${updateMessage.type} d-flex align-items-center gap-2 py-2`} role="alert">
              <i className={`bi ${updateMessage.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`} />
              {updateMessage.text}
            </div>
          )}

          {!updateRecord ? (
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label">Nama Karyawan</label>
                <select
                  className="form-select"
                  value={updateSearch.employee_id}
                  onChange={(e) => setUpdateSearch((prev) => ({ ...prev, employee_id: e.target.value }))}
                >
                  <option value="" disabled>Pilih karyawan...</option>
                  {karyawan.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama} ({k.nip})</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Tanggal</label>
                <input
                  type="date"
                  className="form-control"
                  value={updateSearch.tanggal}
                  onChange={(e) => setUpdateSearch((prev) => ({ ...prev, tanggal: e.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <button className="btn btn-primary w-100" onClick={handleUpdateSearch} disabled={searchLoading}>
                  {searchLoading ? (
                    <span className="spinner-border spinner-border-sm" role="status" />
                  ) : (
                    <>
                      <i className="bi bi-search me-1" />
                      Cari Record
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateSubmit}>
              <div className="mb-3 p-3 bg-light rounded">
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <div>
                    <small className="text-muted">Karyawan</small>
                    <div className="fw-semibold">{updateRecord.employee?.nama}</div>
                  </div>
                  <div>
                    <small className="text-muted">Tanggal</small>
                    <div>{updateRecord.tanggal}</div>
                  </div>
                  <div>
                    <small className="text-muted">Jam Masuk</small>
                    <div>{updateRecord.jam_masuk || "-"}</div>
                  </div>
                  <div>
                    <small className="text-muted">Status Saat Ini</small>
                    <div><StatusBadge status={updateRecord.status} /></div>
                  </div>
                </div>
              </div>
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Status Baru</label>
                  <select
                    name="status"
                    className={`form-select ${updateErrors.status ? "is-invalid" : ""}`}
                    value={updateForm.status}
                    onChange={handleUpdateChange}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {updateErrors.status && <div className="invalid-feedback">{updateErrors.status[0]}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Jam Pulang (opsional)</label>
                  <input
                    type="time"
                    name="jam_pulang"
                    className={`form-control ${updateErrors.jam_pulang ? "is-invalid" : ""}`}
                    value={updateForm.jam_pulang}
                    onChange={handleUpdateChange}
                  />
                  {updateErrors.jam_pulang && <div className="invalid-feedback">{updateErrors.jam_pulang[0]}</div>}
                </div>
                <div className="col-md-4">
                  <label className="form-label">
                    Keterangan
                    {updateForm.status === "Izin" && <span className="text-danger ms-1">*</span>}
                  </label>
                  <input
                    type="text"
                    name="keterangan"
                    className={`form-control ${updateErrors.keterangan ? "is-invalid" : ""}`}
                    value={updateForm.keterangan}
                    onChange={handleUpdateChange}
                    placeholder={updateForm.status === "Izin" ? "Alasan izin (wajib diisi)" : "Keterangan (opsional)"}
                  />
                  {updateErrors.keterangan && <div className="invalid-feedback">{updateErrors.keterangan[0]}</div>}
                </div>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary" disabled={updateSubmitting}>
                  {updateSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1" />
                      Update Status
                    </>
                  )}
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleUpdateReset}>
                  <i className="bi bi-arrow-counterclockwise me-1" />
                  Reset
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
