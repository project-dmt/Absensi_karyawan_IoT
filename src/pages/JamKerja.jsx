import { useState, useEffect } from "react";
import api from "../api/axios";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";

export default function JamKerja() {
  const [form, setForm] = useState({
    jam_masuk_standar: "08:00",
    jam_pulang_standar: "17:00",
    toleransi_menit: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    api
      .get("/jadwal")
      .then((res) => {
        if (res.data.data) {
          const d = res.data.data;
          setForm({
            jam_masuk_standar: d.jam_masuk_standar?.substring(0, 5) || "08:00",
            jam_pulang_standar: d.jam_pulang_standar?.substring(0, 5) || "17:00",
            toleransi_menit: d.toleransi_menit ?? 15,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "toleransi_menit" ? parseInt(value) || 0 : value,
    }));
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await api.put("/jadwal", {
        jam_masuk_standar: form.jam_masuk_standar + ":00",
        jam_pulang_standar: form.jam_pulang_standar + ":00",
        toleransi_menit: form.toleransi_menit,
      });
      setMessage({ type: "success", text: "Jam kerja berhasil disimpan" });
    } catch (err) {
      const msg =
        err.response?.data?.message || "Gagal menyimpan jam kerja";
      setMessage({ type: "danger", text: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header">
        <h4>Jam Kerja</h4>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type} d-flex align-items-center gap-2 py-2`} role="alert">
          <i className={`bi ${message.type === "success" ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`} />
          {message.text}
        </div>
      )}

      <div className="card" style={{ maxWidth: "520px" }}>
        <div className="card-header d-flex align-items-center gap-2">
          <i className="bi bi-clock" />
          Pengaturan Jam Kerja
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <FormInput
                  label="Jam Masuk Standar"
                  name="jam_masuk_standar"
                  type="time"
                  value={form.jam_masuk_standar}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <FormInput
                  label="Jam Pulang Standar"
                  name="jam_pulang_standar"
                  type="time"
                  value={form.jam_pulang_standar}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <FormInput
              label="Toleransi Keterlambatan (menit)"
              name="toleransi_menit"
              type="number"
              value={form.toleransi_menit}
              onChange={handleChange}
              min={0}
              required
            />
            <div className="alert alert-info py-2 mb-3 d-flex align-items-start gap-2" style={{ fontSize: "0.85rem" }}>
              <i className="bi bi-info-circle mt-1" />
              <span>
                Karyawan yang masuk setelah jam{" "}
                <strong>{form.jam_masuk_standar} + {form.toleransi_menit} menit</strong>{" "}
                akan ditandai sebagai <strong>Terlambat</strong>.
              </span>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? (
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
          </form>
        </div>
      </div>
    </div>
  );
}
