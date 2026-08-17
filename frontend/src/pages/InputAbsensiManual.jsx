import { useEffect, useState } from "react";
import FormInput from "../components/FormInput";
import StatusBadge from "../components/StatusBadge";
import {
  useKaryawanList,
  useLaporan,
  useCreateAbsensiManual,
  useUpdateAbsensi,
} from "../api/queries";
import {
  ArrowLeftRight,
  Check,
  FilePlus2,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

function MessageAlert({ message }) {
  if (!message.text) return null;
  return (
    <Alert
      variant={message.type === "success" ? "default" : "destructive"}
      className="mb-3"
    >
      <AlertTitle>
        {message.type === "success" ? "Berhasil" : "Gagal"}
      </AlertTitle>
      <AlertDescription>{message.text}</AlertDescription>
    </Alert>
  );
}

export default function InputAbsensiManual() {
  const { data: karyawan = [] } = useKaryawanList();
  const createAbsensi = useCreateAbsensiManual();
  const updateAbsensi = useUpdateAbsensi();
  const [form, setForm] = useState({
    employee_id: "",
    tanggal: new Date().toISOString().split("T")[0],
    jam_masuk: "",
    jam_pulang: "",
    status: "Hadir",
    keterangan: "",
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });

  const [updateSearch, setUpdateSearch] = useState({ employee_id: "", tanggal: new Date().toISOString().split("T")[0] });
  const [updateRecord, setUpdateRecord] = useState(null);
  const [updateForm, setUpdateForm] = useState({ status: "", keterangan: "", jam_pulang: "" });
  const [updateErrors, setUpdateErrors] = useState({});
  const [updateMessage, setUpdateMessage] = useState({ type: "", text: "" });
  const [searchQuery, setSearchQuery] = useState(null);
  const { data: searchRecords = [], isFetching: searchLoading, isSuccess: searchSuccess } = useLaporan(searchQuery, {
    enabled: Boolean(searchQuery),
  });

  const statusInfo = STATUS_INFO[form.status] || STATUS_INFO.Hadir;

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

      await createAbsensi.mutateAsync(payload);
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

  const handleUpdateSearch = () => {
    if (!updateSearch.employee_id || !updateSearch.tanggal) {
      setUpdateMessage({ type: "danger", text: "Pilih karyawan dan tanggal" });
      return;
    }
    setUpdateRecord(null);
    setUpdateMessage({ type: "", text: "" });
    setSearchQuery({ dari: updateSearch.tanggal, sampai: updateSearch.tanggal, per_page: 500 });
  };

  useEffect(() => {
    if (!searchSuccess) return;
    const employeeId = Number(updateSearch.employee_id);
    const found = searchRecords.find((r) => Number(r.employee_id) === employeeId);
    if (!found) {
      setUpdateMessage({
        type: "danger",
        text: "Tidak ditemukan data absensi untuk karyawan ini pada tanggal tersebut",
      });
      return;
    }
    setUpdateRecord(found);
    setUpdateForm({
      status: found.status,
      keterangan: found.keterangan || "",
      jam_pulang: found.jam_pulang ? found.jam_pulang.substring(0, 5) : "",
    });
    setUpdateErrors({});
  }, [searchSuccess, searchRecords]);

  const handleUpdateChange = (e) => {
    const { name, value } = e.target;
    setUpdateForm((prev) => ({ ...prev, [name]: value }));
    setUpdateErrors((prev) => ({ ...prev, [name]: undefined }));
    setUpdateMessage({ type: "", text: "" });
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdateErrors({});
    setUpdateMessage({ type: "", text: "" });
    try {
      const payload = { status: updateForm.status };
      if (updateForm.keterangan) payload.keterangan = updateForm.keterangan;
      if (updateForm.jam_pulang) payload.jam_pulang = updateForm.jam_pulang + ":00";

      await updateAbsensi.mutateAsync({ id: updateRecord.id, ...payload });
      setUpdateMessage({ type: "success", text: "Status absensi berhasil diupdate" });
      setUpdateRecord(null);
    } catch (err) {
      if (err.response?.status === 422) {
        const resp = err.response.data;
        console.error("422 Error:", JSON.stringify(resp));
        const msg = resp?.message;
        const errors = resp?.errors || {};
        const detail = Object.values(errors).flat().join("; ");
        setUpdateMessage({ type: "danger", text: `${msg || "Validasi gagal"}${detail ? ": " + detail : ""}` });
        setUpdateErrors(errors);
      } else {
        setUpdateMessage({ type: "danger", text: err.response?.data?.message || "Gagal mengupdate absensi" });
      }
    }
  };

  const handleUpdateReset = () => {
    setUpdateSearch({ employee_id: "", tanggal: new Date().toISOString().split("T")[0] });
    setUpdateRecord(null);
    setUpdateForm({ status: "", keterangan: "", jam_pulang: "" });
    setUpdateErrors({});
    setUpdateMessage({ type: "", text: "" });
    setSearchQuery(null);
  };

  return (
    <div>
      <div className="page-header">
        <h4>Input Absensi Manual</h4>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Gunakan form ini untuk input absensi karyawan yang tidak dapat melakukan tap RFID.
      </p>

      <MessageAlert message={message} />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <FilePlus2 className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Form Absensi Manual</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Tanggal"
                name="tanggal"
                type="date"
                value={form.tanggal}
                onChange={handleChange}
                error={errors.tanggal?.[0]}
                required
              />
              <FormInput
                label="Status"
                name="status"
                as="select"
                value={form.status}
                onChange={handleChange}
                options={STATUS_OPTIONS}
              />
            </div>
            {(statusInfo.showJamMasuk || statusInfo.showJamPulang) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {statusInfo.showJamMasuk && (
                  <FormInput
                    label="Jam Masuk"
                    name="jam_masuk"
                    type="time"
                    value={form.jam_masuk}
                    onChange={handleChange}
                    error={errors.jam_masuk?.[0]}
                  />
                )}
                {statusInfo.showJamPulang && (
                  <FormInput
                    label="Jam Pulang"
                    name="jam_pulang"
                    type="time"
                    value={form.jam_pulang}
                    onChange={handleChange}
                    error={errors.jam_pulang?.[0]}
                  />
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
            <div className="flex gap-2">
              <Button type="submit" disabled={createAbsensi.isPending}>
                {createAbsensi.isPending ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check data-icon="inline-start" />
                    Simpan
                  </>
                )}
              </Button>
              <Button type="button" variant="secondary" onClick={handleReset}>
                <RefreshCw data-icon="inline-start" className="size-4" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <ArrowLeftRight className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Update Status Absensi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Untuk karyawan yang sudah tap RFID pagi tapi izin/sakit di tengah hari.
          </p>

          <MessageAlert message={updateMessage} />

          {!updateRecord ? (
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
              <FormInput
                label="Nama Karyawan"
                name="employee_id"
                as="select"
                value={updateSearch.employee_id}
                onChange={(e) => setUpdateSearch((prev) => ({ ...prev, employee_id: e.target.value }))}
                placeholder="Pilih karyawan..."
                options={karyawan.map((k) => ({
                  value: k.id,
                  label: `${k.nama} (${k.nip})`,
                }))}
              />
              <FormInput
                label="Tanggal"
                name="tanggal"
                type="date"
                value={updateSearch.tanggal}
                onChange={(e) => setUpdateSearch((prev) => ({ ...prev, tanggal: e.target.value }))}
              />
              <Button onClick={handleUpdateSearch} disabled={searchLoading}>
                {searchLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Search data-icon="inline-start" className="size-4" />
                    Cari Record
                  </>
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="rounded-md bg-muted p-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <small className="block text-muted-foreground">Karyawan</small>
                    <div className="font-semibold">{updateRecord.employee?.nama}</div>
                  </div>
                  <div>
                    <small className="block text-muted-foreground">Tanggal</small>
                    <div>{updateRecord.tanggal}</div>
                  </div>
                  <div>
                    <small className="block text-muted-foreground">Jam Masuk</small>
                    <div>{updateRecord.jam_masuk || "-"}</div>
                  </div>
                  <div>
                    <small className="block text-muted-foreground">Status Saat Ini</small>
                    <div><StatusBadge status={updateRecord.status} /></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FormInput
                  label="Status Baru"
                  name="status"
                  as="select"
                  value={updateForm.status}
                  onChange={handleUpdateChange}
                  error={updateErrors.status?.[0]}
                  options={STATUS_OPTIONS}
                />
                <FormInput
                  label="Jam Pulang (opsional)"
                  name="jam_pulang"
                  type="time"
                  value={updateForm.jam_pulang}
                  onChange={handleUpdateChange}
                  error={updateErrors.jam_pulang?.[0]}
                />
                <FormInput
                  label={
                    <>
                      Keterangan
                      {updateForm.status === "Izin" && (
                        <span className="ml-1 text-destructive">*</span>
                      )}
                    </>
                  }
                  name="keterangan"
                  value={updateForm.keterangan}
                  onChange={handleUpdateChange}
                  error={updateErrors.keterangan?.[0]}
                  placeholder={updateForm.status === "Izin" ? "Alasan izin (wajib diisi)" : "Keterangan (opsional)"}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updateAbsensi.isPending}>
                  {updateAbsensi.isPending ? (
                    <>
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check data-icon="inline-start" />
                      Update Status
                    </>
                  )}
                </Button>
                <Button type="button" variant="secondary" onClick={handleUpdateReset}>
                  <RefreshCw data-icon="inline-start" className="size-4" />
                  Reset
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}