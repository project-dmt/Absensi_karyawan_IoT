import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useKaryawanList,
  useDivisiList,
  useDeleteKaryawan,
  karyawanKeys,
} from "../api/queries";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Scan,
  Search,
  TriangleAlert,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const INITIAL_FORM = {
  nama: "",
  nip: "",
  jabatan: "",
  divisi_id: "",
  rfid_uid: "",
  status: "aktif",
};

export default function DataKaryawan() {
  const queryClient = useQueryClient();
  const { data = [], isPending } = useKaryawanList();
  const { data: divisi = [] } = useDivisiList();
  const deleteKaryawan = useDeleteKaryawan();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  // ==== State Scan Kartu ====
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanConflict, setScanConflict] = useState(false);
  const scanTimer = useRef(null);
  const scanToken = useRef(null);

  // Otomatis sembunyikan notifikasi setelah 5 detik
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const stopScan = () => {
    if (scanTimer.current) {
      clearTimeout(scanTimer.current);
      scanTimer.current = null;
    }
    scanToken.current = null;
    setScanning(false);
    setScanHint("");
    setScanSuccess(false);
    setScanConflict(false);
  };

  useEffect(() => stopScan, []);

  const pollScan = async (token) => {
    try {
      const res = await api.get(`/rfid/register/${token}`);
      const { status, uid, is_used, used_by } = res.data.data;

      if (status === "completed" && uid) {
        if (is_used) {
          setScanConflict(true);
          setScanHint(
            `UID ${uid} sudah dipakai ${used_by ? `oleh ${used_by}` : ""}`
          );
          setScanning(false);
          scanToken.current = null;
          return;
        }
        setForm((prev) => ({ ...prev, rfid_uid: uid }));
        setFieldErrors((prev) => ({ ...prev, rfid_uid: undefined }));
        setScanHint(`Kartu terdeteksi: ${uid}`);
        setScanSuccess(true);
        setScanning(false);
        scanToken.current = null;
        return;
      }

      if (status === "expired") {
        setScanHint("Waktu habis, coba lagi.");
        setScanning(false);
        scanToken.current = null;
        return;
      }
    } catch {
      setScanHint("Gagal cek status. Coba lagi.");
      setScanning(false);
      scanToken.current = null;
      return;
    }

    scanTimer.current = setTimeout(() => pollScan(token), 1500);
  };

  const handleStartScan = async () => {
    setScanning(true);
    setScanSuccess(false);
    setScanConflict(false);
    setScanHint("Tempelkan kartu di alat RFID...");
    try {
      const res = await api.post("/rfid/register");
      const token = res.data.data.token;
      scanToken.current = token;
      scanTimer.current = setTimeout(() => pollScan(token), 1500);
    } catch {
      setScanning(false);
      setScanHint("Gagal mulai scan. Coba lagi.");
    }
  };

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const openAdd = () => {
    stopScan();
    setEditId(null);
    setForm(INITIAL_FORM);
    setFormError("");
    setFieldErrors({});
    setShowModal(true);
  };

  const openEdit = (item) => {
    stopScan();
    setEditId(item.id);
    setForm({
      nama: item.nama,
      nip: item.nip,
      jabatan: item.jabatan || "",
      divisi_id: item.divisi_id ? String(item.divisi_id) : "",
      rfid_uid: item.rfid_uid,
      status: item.status || "aktif",
    });
    setFormError("");
    setFieldErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    stopScan();
    setShowModal(false);
    setFormError("");
    setFieldErrors({});
  };

  // Validaasi manual yang jelas
  const validate = () => {
    const e = {};
    if (!form.nama.trim()) e.nama = "Nama wajib diisi";
    if (!form.nip.trim()) e.nip = "NIP wajib diisi";
    if (!form.rfid_uid.trim()) e.rfid_uid = "RFID UID wajib diisi (scan atau isi manual)";
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setFormError("");
    if (!validate()) return;

    const payload = {
      nama: form.nama.trim(),
      nip: form.nip.trim(),
      jabatan: form.jabatan.trim(),
      divisi_id: form.divisi_id || null,
      rfid_uid: form.rfid_uid.trim(),
      status: form.status,
    };

    setSaving(true);
    try {
      if (editId) {
        await api.put(`/karyawan/${editId}`, payload);
      } else {
        await api.post("/karyawan", payload);
      }
      await queryClient.invalidateQueries({ queryKey: karyawanKeys.all });
      setShowModal(false);
      setNotice({
        type: "success",
        title: editId ? "Karyawan diperbarui" : "Karyawan ditambahkan",
        message: `${payload.nama} (${payload.rfid_uid}) udah tersimpan.`,
      });
    } catch (err) {
      if (err.response?.status === 422) {
        const serverErrors = err.response.data?.errors || {};
        const first = Object.keys(serverErrors)[0];
        setFieldErrors(
          Object.fromEntries(
            Object.entries(serverErrors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)])
          )
        );
        setFormError(
          first
            ? (Array.isArray(serverErrors[first])
                ? serverErrors[first][0]
                : String(serverErrors[first]))
            : "Data tidak valid. Cek kembali isiannya."
        );
      } else if (err.response?.status === 401) {
        setFormError("Sesi habis. Silakan login ulang.");
      } else {
        setFormError(
          err.response?.data?.message ||
            "Terjadi kesalahan saat menyimpan. Cek koneksi ke server."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus karyawan ini?")) return;
    try {
      const nama = (data.find((d) => d.id === id) || {}).nama || "";
      await deleteKaryawan.mutateAsync(id);
      setNotice({
        type: "success",
        title: "Karyawan dihapus",
        message: `${nama} dihapus dari data.`,
      });
    } catch {
      setNotice({
        type: "error",
        title: "Gagal menghapus",
        message: "Terjadi kesalahan saat menghapus.",
      });
    }
  };

  const filtered = data.filter(
    (item) =>
      item.nama.toLowerCase().includes(search.toLowerCase()) ||
      item.nip.toLowerCase().includes(search.toLowerCase()) ||
      item.rfid_uid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h4>Data Karyawan</h4>
        <Button onClick={openAdd}>
          <Plus data-icon="inline-start" />
          Tambah Karyawan
        </Button>
      </div>

      {notice && (
        <Alert
          variant={notice.type === "success" ? "default" : "destructive"}
          className="mb-3"
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <XCircle className="size-4" />
          )}
          <AlertDescription>
            <strong>{notice.title}.</strong> {notice.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-3 max-w-[360px]">
        <InputGroup>
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            placeholder="Cari nama, NIP, atau UID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      </div>

      {isPending ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          message="Tidak ada karyawan ditemukan"
          icon={<Users className="size-10" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>RFID UID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{item.nama}</TableCell>
                      <TableCell>
                        <code>{item.nip}</code>
                      </TableCell>
                      <TableCell>
                        <code>{item.rfid_uid}</code>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Edit"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="text-destructive"
                            title="Hapus"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Modal
        show={showModal}
        onClose={closeModal}
        title={editId ? "Edit Karyawan" : "Tambah Karyawan"}
      >
        <form
          onSubmit={(e) => e.preventDefault()}
          noValidate
        >
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <TriangleAlert />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-4">
            <Field data-invalid={fieldErrors.nama ? true : undefined}>
              <FieldLabel htmlFor="nama">Nama</FieldLabel>
              <Input
                id="nama"
                placeholder="Nama lengkap"
                aria-invalid={fieldErrors.nama ? true : undefined}
                value={form.nama}
                onChange={(e) => setField("nama", e.target.value)}
              />
              {fieldErrors.nama && <FieldError>{fieldErrors.nama}</FieldError>}
            </Field>
            <Field data-invalid={fieldErrors.nip ? true : undefined}>
              <FieldLabel htmlFor="nip">NIP</FieldLabel>
              <Input
                id="nip"
                placeholder="Nomor induk pegawai"
                aria-invalid={fieldErrors.nip ? true : undefined}
                value={form.nip}
                onChange={(e) => setField("nip", e.target.value)}
              />
              {fieldErrors.nip && <FieldError>{fieldErrors.nip}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="jabatan">Jabatan</FieldLabel>
              <Input
                id="jabatan"
                placeholder="Jabatan karyawan (opsional)"
                value={form.jabatan}
                onChange={(e) => setField("jabatan", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Divisi</FieldLabel>
              <Select
                value={form.divisi_id || undefined}
                onValueChange={(v) => setField("divisi_id", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih divisi..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {divisi.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.nama_divisi}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field data-invalid={fieldErrors.rfid_uid ? true : undefined}>
              <FieldLabel htmlFor="rfid_uid">RFID UID</FieldLabel>
              <div className="flex gap-2">
                <Input
                  id="rfid_uid"
                  placeholder="Scan kartu atau isi manual"
                  className="flex-1"
                  aria-invalid={fieldErrors.rfid_uid ? true : undefined}
                  value={form.rfid_uid}
                  onChange={(e) => setField("rfid_uid", e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleStartScan}
                  disabled={scanning}
                  className="shrink-0"
                >
                  {scanning ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Scan className="size-4" />
                  )}
                  {scanning ? "Menunggu..." : "Scan Kartu"}
                </Button>
              </div>
              {scanning && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={stopScan}
                >
                  Batal scan
                </Button>
              )}
              {scanHint && (
                <p
                  className={`text-sm mt-1 ${
                    scanSuccess
                      ? "text-emerald-600"
                      : scanConflict
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {scanHint}
                </p>
              )}
              {fieldErrors.rfid_uid && (
                <FieldError>{fieldErrors.rfid_uid}</FieldError>
              )}
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Batal
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={saving}>
              {saving ? (
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
          </div>
        </form>
      </Modal>
    </div>
  );
}