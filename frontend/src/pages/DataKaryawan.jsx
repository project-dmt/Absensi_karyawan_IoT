import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { karyawanSchema } from "../schemas";
import { useRouter } from "../router";
import { useDebounce } from "../hooks/useDebounce";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  useKaryawanList,
  useDivisiList,
  useCreateKaryawan,
  useUpdateKaryawan,
  useDeleteKaryawan,
} from "../api/queries";
import {
  Check,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Search,
  TriangleAlert,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const router = useRouter();
  const {
    data = [],
    isPending,
    isError,
  } = useKaryawanList();
  const { data: divisi = [] } = useDivisiList();
  const createKaryawan = useCreateKaryawan();
  const updateKaryawan = useUpdateKaryawan();
  const deleteKaryawan = useDeleteKaryawan();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const submitting = createKaryawan.isPending || updateKaryawan.isPending;

  const { register, handleSubmit, control, reset, setError, formState: { errors } } = useForm({
    resolver: zodResolver(karyawanSchema),
    defaultValues: INITIAL_FORM,
  });

  const filtered = data.filter(
    (item) =>
      item.nama.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.nip.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.rfid_uid.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const openAdd = () => {
    setEditId(null);
    setFormError("");
    reset(INITIAL_FORM);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setFormError("");
    reset({
      nama: item.nama,
      nip: item.nip,
      jabatan: item.jabatan || "",
      divisi_id: item.divisi_id || "",
      rfid_uid: item.rfid_uid,
      status: item.status,
    });
    setShowModal(true);
  };

  const onSubmit = async (formData) => {
    setFormError("");
    const payload = {
      ...formData,
      divisi_id: formData.divisi_id ? Number(formData.divisi_id) : null,
      jabatan: formData.jabatan?.trim() || null,
    };
    const mutation = editId
      ? updateKaryawan.mutateAsync({ id: editId, ...payload })
      : createKaryawan.mutateAsync(payload);
    try {
      await mutation;
      setShowModal(false);
    } catch (err) {
      if (err.response?.status === 422) {
        const serverErrors = err.response.data.errors || {};
        Object.entries(serverErrors).forEach(([field, msgs]) => {
          setError(field, { type: "server", message: msgs[0] });
        });
      } else {
        setFormError(err.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus karyawan ini?")) return;
    setDeleteError("");
    try {
      await deleteKaryawan.mutateAsync(id);
    } catch (err) {
      setDeleteError(
        err.response?.data?.message ||
          "Gagal menghapus karyawan. Pastikan Anda memiliki izin (khusus Super Admin)."
      );
    }
  };

  return (
    <div>
      <div className="page-header">
        <h4>Data Karyawan</h4>
        <Button onClick={openAdd}>
          <Plus data-icon="inline-start" />
          Tambah Karyawan
        </Button>
      </div>

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

      {deleteError && (
        <Alert variant="destructive" className="mb-3">
          <TriangleAlert />
          <AlertDescription>{deleteError}</AlertDescription>
        </Alert>
      )}

      {isError ? (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>
            Gagal memuat data karyawan. Coba muat ulang halaman.
          </AlertDescription>
        </Alert>
      ) : isPending ? (
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
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Divisi</TableHead>
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
                      <TableCell>{item.jabatan || "-"}</TableCell>
                      <TableCell>{item.division?.nama_divisi || "-"}</TableCell>
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
                            title="Lihat Detail"
                            onClick={() => router.navigate({ to: "/data-karyawan/$id", params: { id: item.id } })}
                          >
                            <Eye />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-sm"
                            className="text-primary"
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
        onClose={() => setShowModal(false)}
        title={editId ? "Edit Karyawan" : "Tambah Karyawan"}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <TriangleAlert />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-4">
            <Field data-invalid={errors.nama ? true : undefined}>
              <FieldLabel htmlFor="nama">Nama</FieldLabel>
              <Input
                id="nama"
                placeholder="Nama lengkap"
                aria-invalid={errors.nama ? true : undefined}
                {...register("nama")}
              />
              {errors.nama && <FieldError>{errors.nama.message}</FieldError>}
            </Field>
            <Field data-invalid={errors.nip ? true : undefined}>
              <FieldLabel htmlFor="nip">NIP</FieldLabel>
              <Input
                id="nip"
                placeholder="Nomor induk pegawai"
                aria-invalid={errors.nip ? true : undefined}
                {...register("nip")}
              />
              {errors.nip && <FieldError>{errors.nip.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="jabatan">Jabatan</FieldLabel>
              <Input id="jabatan" placeholder="Jabatan karyawan" {...register("jabatan")} />
            </Field>
            <Controller
              name="divisi_id"
              control={control}
              render={({ field }) => (
                <Field data-invalid={errors.divisi_id ? true : undefined}>
                  <FieldLabel>Divisi</FieldLabel>
                  <Select value={field.value ? String(field.value) : undefined} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full" aria-invalid={errors.divisi_id ? true : undefined}>
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
                  {errors.divisi_id && <FieldError>{errors.divisi_id.message}</FieldError>}
                </Field>
              )}
            />
            <Field data-invalid={errors.rfid_uid ? true : undefined}>
              <FieldLabel htmlFor="rfid_uid">RFID UID</FieldLabel>
              <Input
                id="rfid_uid"
                placeholder="Contoh: A1B2C3"
                aria-invalid={errors.rfid_uid ? true : undefined}
                {...register("rfid_uid")}
              />
              {errors.rfid_uid && (
                <FieldError>{errors.rfid_uid.message}</FieldError>
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
                        <SelectItem value="aktif">Aktif</SelectItem>
                        <SelectItem value="nonaktif">Nonaktif</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>
          <Separator className="my-4" />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
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
