import { useState } from "react";
import { useRouter } from "../router";
import { useDebounce } from "../hooks/useDebounce";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import FormInput from "../components/FormInput";
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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const { data = [], isPending } = useKaryawanList();
  const { data: divisi = [] } = useDivisiList();
  const createKaryawan = useCreateKaryawan();
  const updateKaryawan = useUpdateKaryawan();
  const deleteKaryawan = useDeleteKaryawan();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const submitting = createKaryawan.isPending || updateKaryawan.isPending;

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
    setErrors({});
    setFormError("");
    const mutation = editId
      ? updateKaryawan.mutateAsync({ id: editId, ...form })
      : createKaryawan.mutateAsync(form);
    try {
      await mutation;
      setShowModal(false);
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setFormError(err.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus karyawan ini?")) return;
    try {
      await deleteKaryawan.mutateAsync(id);
    } catch {}
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
        <form onSubmit={handleSubmit}>
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <TriangleAlert />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-4">
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