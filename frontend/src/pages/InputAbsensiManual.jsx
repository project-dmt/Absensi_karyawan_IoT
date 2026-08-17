import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { absensiManualSchema, absensiUpdateSchema } from "../schemas";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [message, setMessage] = useState({ type: "", text: "" });

  const [updateSearch, setUpdateSearch] = useState({ employee_id: "", tanggal: new Date().toISOString().split("T")[0] });
  const [updateRecord, setUpdateRecord] = useState(null);
  const [updateMessage, setUpdateMessage] = useState({ type: "", text: "" });
  const [searchQuery, setSearchQuery] = useState(null);
  const { data: searchRecords = [], isFetching: searchLoading, isSuccess: searchSuccess } = useLaporan(searchQuery, {
    enabled: Boolean(searchQuery),
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { errors: createErrors },
  } = useForm({
    resolver: zodResolver(absensiManualSchema),
    defaultValues: {
      employee_id: "",
      tanggal: new Date().toISOString().split("T")[0],
      jam_masuk: "",
      jam_pulang: "",
      status: "Hadir",
      keterangan: "",
    },
  });

  const watchedStatus = watch("status");
  const statusInfo = STATUS_INFO[watchedStatus] || STATUS_INFO.Hadir;

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    control: controlUpdate,
    watch: watchUpdate,
    reset: resetUpdate,
    setError: setErrorUpdate,
    formState: { errors: updateErrors },
  } = useForm({
    resolver: zodResolver(absensiUpdateSchema),
    defaultValues: { status: "", keterangan: "", jam_pulang: "" },
  });

  const onCreateSubmit = async (data) => {
    setMessage({ type: "", text: "" });
    try {
      const payload = {
        employee_id: parseInt(data.employee_id),
        tanggal: data.tanggal,
        status: data.status,
      };
      if (statusInfo.showJamMasuk && data.jam_masuk) payload.jam_masuk = data.jam_masuk + ":00";
      if (statusInfo.showJamPulang && data.jam_pulang) payload.jam_pulang = data.jam_pulang + ":00";
      if (data.keterangan) payload.keterangan = data.keterangan;

      await createAbsensi.mutateAsync(payload);
      setMessage({ type: "success", text: "Absensi manual berhasil ditambahkan" });
      reset({
        employee_id: "",
        tanggal: data.tanggal,
        jam_masuk: "",
        jam_pulang: "",
        status: "Hadir",
        keterangan: "",
      });
    } catch (err) {
      if (err.response?.status === 422) {
        if (err.response.data.message) {
          setMessage({ type: "danger", text: err.response.data.message });
        }
        const serverErrors = err.response.data.errors || {};
        Object.entries(serverErrors).forEach(([field, msgs]) => {
          setError(field, { type: "server", message: msgs[0] });
        });
      } else {
        setMessage({ type: "danger", text: err.response?.data?.message || "Gagal menyimpan absensi" });
      }
    }
  };

  const handleReset = () => {
    reset({
      employee_id: "",
      tanggal: new Date().toISOString().split("T")[0],
      jam_masuk: "",
      jam_pulang: "",
      status: "Hadir",
      keterangan: "",
    });
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
    resetUpdate({
      status: found.status,
      keterangan: found.keterangan || "",
      jam_pulang: found.jam_pulang ? found.jam_pulang.substring(0, 5) : "",
    });
  }, [searchSuccess, searchRecords, updateSearch.employee_id, resetUpdate]);

  const onUpdateSubmit = async (data) => {
    setUpdateMessage({ type: "", text: "" });
    try {
      const payload = { status: data.status };
      if (data.keterangan) payload.keterangan = data.keterangan;
      if (data.jam_pulang) payload.jam_pulang = data.jam_pulang + ":00";

      await updateAbsensi.mutateAsync({ id: updateRecord.id, ...payload });
      setUpdateMessage({ type: "success", text: "Status absensi berhasil diupdate" });
      setUpdateRecord(null);
    } catch (err) {
      if (err.response?.status === 422) {
        const resp = err.response.data;
        const msg = resp?.message;
        const serverErrors = resp?.errors || {};
        const detail = Object.values(serverErrors).flat().join("; ");
        setUpdateMessage({ type: "danger", text: `${msg || "Validasi gagal"}${detail ? ": " + detail : ""}` });
        Object.entries(serverErrors).forEach(([field, msgs]) => {
          setErrorUpdate(field, { type: "server", message: msgs[0] });
        });
      } else {
        setUpdateMessage({ type: "danger", text: err.response?.data?.message || "Gagal mengupdate absensi" });
      }
    }
  };

  const handleUpdateReset = () => {
    setUpdateSearch({ employee_id: "", tanggal: new Date().toISOString().split("T")[0] });
    setUpdateRecord(null);
    resetUpdate({ status: "", keterangan: "", jam_pulang: "" });
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
          <form onSubmit={handleSubmit(onCreateSubmit)} className="space-y-4">
            <Controller
              name="employee_id"
              control={control}
              render={({ field }) => (
                <Field data-invalid={createErrors.employee_id ? true : undefined}>
                  <FieldLabel>Nama Karyawan</FieldLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-invalid={createErrors.employee_id ? true : undefined}>
                      <SelectValue placeholder="Pilih karyawan..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {karyawan.map((k) => (
                          <SelectItem key={k.id} value={String(k.id)}>
                            {k.nama} ({k.nip})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {createErrors.employee_id && (
                    <FieldError>{createErrors.employee_id.message}</FieldError>
                  )}
                </Field>
              )}
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field data-invalid={createErrors.tanggal ? true : undefined}>
                <FieldLabel htmlFor="tanggal">Tanggal</FieldLabel>
                <Input
                  type="date"
                  id="tanggal"
                  aria-invalid={createErrors.tanggal ? true : undefined}
                  {...register("tanggal")}
                />
                {createErrors.tanggal && (
                  <FieldError>{createErrors.tanggal.message}</FieldError>
                )}
              </Field>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>
            {(statusInfo.showJamMasuk || statusInfo.showJamPulang) && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {statusInfo.showJamMasuk && (
                  <Field data-invalid={createErrors.jam_masuk ? true : undefined}>
                    <FieldLabel htmlFor="jam_masuk">Jam Masuk</FieldLabel>
                    <Input type="time" id="jam_masuk" {...register("jam_masuk")} />
                    {createErrors.jam_masuk && (
                      <FieldError>{createErrors.jam_masuk.message}</FieldError>
                    )}
                  </Field>
                )}
                {statusInfo.showJamPulang && (
                  <Field data-invalid={createErrors.jam_pulang ? true : undefined}>
                    <FieldLabel htmlFor="jam_pulang">Jam Pulang</FieldLabel>
                    <Input type="time" id="jam_pulang" {...register("jam_pulang")} />
                    {createErrors.jam_pulang && (
                      <FieldError>{createErrors.jam_pulang.message}</FieldError>
                    )}
                  </Field>
                )}
              </div>
            )}
            <Field data-invalid={createErrors.keterangan ? true : undefined}>
              <FieldLabel htmlFor="keterangan_create">Keterangan</FieldLabel>
              <textarea
                id="keterangan_create"
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                rows={3}
                style={{ resize: "vertical" }}
                placeholder={statusInfo.keteranganPlaceholder}
                {...register("keterangan")}
              />
              {createErrors.keterangan && (
                <FieldError>{createErrors.keterangan.message}</FieldError>
              )}
            </Field>
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
              <Field>
                <FieldLabel>Nama Karyawan</FieldLabel>
                <Select
                  value={updateSearch.employee_id || undefined}
                  onValueChange={(v) => setUpdateSearch((prev) => ({ ...prev, employee_id: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih karyawan..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {karyawan.map((k) => (
                        <SelectItem key={k.id} value={String(k.id)}>
                          {k.nama} ({k.nip})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Tanggal</FieldLabel>
                <Input
                  type="date"
                  value={updateSearch.tanggal}
                  onChange={(e) => setUpdateSearch((prev) => ({ ...prev, tanggal: e.target.value }))}
                />
              </Field>
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
            <form onSubmit={handleSubmitUpdate(onUpdateSubmit)} className="space-y-4">
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
                <Controller
                  name="status"
                  control={controlUpdate}
                  render={({ field }) => (
                    <Field data-invalid={updateErrors.status ? true : undefined}>
                      <FieldLabel>Status Baru</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full" aria-invalid={updateErrors.status ? true : undefined}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {updateErrors.status && (
                        <FieldError>{updateErrors.status.message}</FieldError>
                      )}
                    </Field>
                  )}
                />
                <Field data-invalid={updateErrors.jam_pulang ? true : undefined}>
                  <FieldLabel htmlFor="jam_pulang_update">Jam Pulang (opsional)</FieldLabel>
                  <Input type="time" id="jam_pulang_update" {...registerUpdate("jam_pulang")} />
                  {updateErrors.jam_pulang && (
                    <FieldError>{updateErrors.jam_pulang.message}</FieldError>
                  )}
                </Field>
                <Field data-invalid={updateErrors.keterangan ? true : undefined}>
                  <FieldLabel htmlFor="keterangan_update">
                    Keterangan
                    {watchUpdate("status") === "Izin" && (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </FieldLabel>
                  <Input
                    id="keterangan_update"
                    placeholder={watchUpdate("status") === "Izin" ? "Alasan izin (wajib diisi)" : "Keterangan (opsional)"}
                    {...registerUpdate("keterangan")}
                  />
                  {updateErrors.keterangan && (
                    <FieldError>{updateErrors.keterangan.message}</FieldError>
                  )}
                </Field>
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
