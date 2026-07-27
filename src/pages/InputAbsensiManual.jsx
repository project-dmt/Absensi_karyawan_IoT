import { useState, useEffect } from "react";
import api from "../api/axios";
import FormInput from "../components/FormInput";

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

  useEffect(() => {
    api
      .get("/karyawan")
      .then((res) => setKaryawan(res.data.data))
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
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
      if (form.jam_masuk) payload.jam_masuk = form.jam_masuk + ":00";
      if (form.jam_pulang) payload.jam_pulang = form.jam_pulang + ":00";
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
                  options={[
                    { value: "Hadir", label: "Hadir" },
                    { value: "Terlambat", label: "Terlambat" },
                    { value: "Alpha", label: "Alpha" },
                    { value: "Izin", label: "Izin" },
                  ]}
                />
              </div>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <FormInput
                  label="Jam Masuk"
                  name="jam_masuk"
                  type="time"
                  value={form.jam_masuk}
                  onChange={handleChange}
                  error={errors.jam_masuk?.[0]}
                />
              </div>
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
            </div>
            <FormInput
              label="Keterangan"
              name="keterangan"
              as="textarea"
              value={form.keterangan}
              onChange={handleChange}
              error={errors.keterangan?.[0]}
              placeholder="Alasan input manual (opsional)"
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
    </div>
  );
}
