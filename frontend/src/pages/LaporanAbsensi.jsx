import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { absensiUpdateSchema } from "../schemas";
import api from "../api/axios";
import { useDivisiList, useLaporan, useUpdateAbsensi } from "../api/queries";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";
import FormInput from "../components/FormInput";
import {
  CalendarX,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Funnel,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { laporanKeys } from "../api/queries";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_OPTIONS = [
  { value: "Hadir", label: "Hadir" },
  { value: "Terlambat", label: "Terlambat" },
  { value: "Alpha", label: "Alpha" },
  { value: "Izin", label: "Izin" },
  { value: "Sakit", label: "Sakit" },
];

const PAGE_SIZE = 20;

export default function LaporanAbsensi() {
  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [filter, setFilter] = useState({
    dari: sevenDaysAgo,
    sampai: today,
    divisi_id: "",
  });
  const [appliedFilter, setAppliedFilter] = useState({
    dari: sevenDaysAgo,
    sampai: today,
    divisi_id: "",
  });
  const [page, setPage] = useState(1);
  const { data: divisi = [] } = useDivisiList();
  const { data = [], isFetching: loading } = useLaporan({
    dari: appliedFilter.dari,
    sampai: appliedFilter.sampai,
    divisi_id: appliedFilter.divisi_id || undefined,
    per_page: 1000, // ponytail: ceiling backend /laporan; loop pagination kalau perlu >1000
  });
  const updateAbsensi = useUpdateAbsensi();

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = data.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const [editItem, setEditItem] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const queryClient = useQueryClient();
  const [editMessage, setEditMessage] = useState({ type: "", text: "" });

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors: editErrors },
  } = useForm({
    resolver: zodResolver(absensiUpdateSchema),
    defaultValues: { status: "", keterangan: "", jam_pulang: "" },
  });

  const handleChange = (e) => {
    setFilter((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleClearToday = async () => {
    setConfirmReset(false);
    try {
      const res = await api.delete("/absensi/clear-today", {
        params: { tanggal: appliedFilter.sampai },
      });
      const deleted = res.data?.data?.deleted ?? 0;
      window.alert(`Berhasil menghapus ${deleted} absensi`);
      await queryClient.invalidateQueries({ queryKey: laporanKeys.all });
    } catch (err) {
      window.alert(err.response?.data?.message || "Gagal hapus — butuh role admin/superadmin");
    }
  };

  const handleExport = async (format) => {
    try {
      const params = { dari: filter.dari, sampai: filter.sampai, format };
      if (filter.divisi_id) params.divisi_id = filter.divisi_id;
      const res = await api.get("/laporan/export", {
        params,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `laporan_absensi_${filter.dari}_sd_${filter.sampai}.${format === "xlsx" ? "xlsx" : "csv"}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Export belum tersedia atau terjadi kesalahan");
    }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditMessage({ type: "", text: "" });
    reset({
      status: item.status,
      keterangan: item.keterangan || "",
      jam_pulang: item.jam_pulang ? item.jam_pulang.substring(0, 5) : "",
    });
  };

  const closeEdit = () => {
    setEditItem(null);
    setEditMessage({ type: "", text: "" });
  };

  const onEditSubmit = async (formData) => {
    setEditMessage({ type: "", text: "" });
    try {
      const payload = { status: formData.status };
      if (formData.keterangan) payload.keterangan = formData.keterangan;
      if (formData.jam_pulang) payload.jam_pulang = formData.jam_pulang + ":00";

      await updateAbsensi.mutateAsync({ id: editItem.id, ...payload });
      setEditMessage({ type: "success", text: "Absensi berhasil diupdate" });
    } catch (err) {
      if (err.response?.status === 422) {
        if (err.response.data.message) {
          setEditMessage({ type: "danger", text: err.response.data.message });
        }
        const serverErrors = err.response.data.errors || {};
        Object.entries(serverErrors).forEach(([field, msgs]) => {
          setError(field, { type: "server", message: msgs[0] });
        });
      } else {
        setEditMessage({ type: "danger", text: err.response?.data?.message || "Gagal mengupdate absensi" });
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <h4>Laporan Absensi</h4>
      </div>

      <div className="mb-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Funnel className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filter Laporan</span>
        </div>
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
          <FormInput
            label="Dari Tanggal"
            name="dari"
            type="date"
            value={filter.dari}
            onChange={handleChange}
          />
          <FormInput
            label="Sampai Tanggal"
            name="sampai"
            type="date"
            value={filter.sampai}
            onChange={handleChange}
          />
          <FormInput
            label="Divisi"
            name="divisi_id"
            as="select"
            value={filter.divisi_id}
            onChange={handleChange}
            placeholder="Semua Divisi"
            options={divisi.map((d) => ({
              value: d.id,
              label: d.nama_divisi,
            }))}
          />
          <div className="md:col-span-3">
            <Button
              onClick={() => {
                setAppliedFilter(filter);
                setPage(1);
              }}
              disabled={loading}
              className="w-full md:w-auto"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Search data-icon="inline-start" className="size-4" />
                  Terapkan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
          <FileSpreadsheet data-icon="inline-start" className="size-4" />
          Export Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
          <FileText data-icon="inline-start" className="size-4" />
          Export CSV
        </Button>
        {/* ponytail: testing helper — hapus absensi hari ini */}
        <Button variant="destructive" size="sm" onClick={() => setConfirmReset(true)}>
          <Trash2 data-icon="inline-start" className="size-4" />
          Reset Absensi Hari Ini
        </Button>
        <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Absensi Hari Ini</DialogTitle>
              <DialogDescription>
                Hapus semua absensi tanggal {appliedFilter.sampai} (testing).
                Record yang akan terhapus: {data.filter((d) => d.tanggal === appliedFilter.sampai).length || data.length}.
                Tindakan ini tidak bisa dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
                Batal
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClearToday}>
                <Trash2 data-icon="inline-start" className="size-4" />
                Ya, Hapus
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : data.length === 0 ? (
        <EmptyState message="Tidak ada data absensi untuk rentang tanggal ini" icon={<CalendarX className="size-10" />} />
      ) : (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jam Masuk</TableHead>
                  <TableHead>Jam Pulang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {(safePage - 1) * PAGE_SIZE + idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">{item.employee?.nama}</TableCell>
                    <TableCell>
                      <code>{item.employee?.nip}</code>
                    </TableCell>
                    <TableCell>{item.tanggal}</TableCell>
                    <TableCell>{item.jam_masuk || "-"}</TableCell>
                    <TableCell>{item.jam_pulang || "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>{item.keterangan || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        className="text-primary"
                        title="Edit Absensi"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <small className="text-muted-foreground">
                Halaman {safePage} dari {totalPages}
              </small>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Sebelumnya"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Berikutnya"
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}

      <Modal show={!!editItem} onClose={closeEdit} title="Edit Absensi">
        {editItem && (
          <>
            <div className="mb-4 rounded-md bg-muted p-3 text-sm">
              <div className="font-semibold">
                {editItem.employee?.nama} ({editItem.employee?.nip})
              </div>
              <small className="text-muted-foreground">
                Tanggal: {editItem.tanggal} | Jam Masuk: {editItem.jam_masuk || "-"}
              </small>
            </div>

            {editMessage.text && (
              <div
                className={`mb-3 rounded-md border px-3 py-2 text-sm ${
                  editMessage.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {editMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Field data-invalid={editErrors.status ? true : undefined}>
                    <FieldLabel>Status</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full" aria-invalid={editErrors.status ? true : undefined}>
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
                    {editErrors.status && (
                      <FieldError>{editErrors.status.message}</FieldError>
                    )}
                  </Field>
                )}
              />
              <Field data-invalid={editErrors.jam_pulang ? true : undefined}>
                <FieldLabel htmlFor="jam_pulang_edit">Jam Pulang</FieldLabel>
                <Input type="time" id="jam_pulang_edit" {...register("jam_pulang")} />
                {editErrors.jam_pulang && (
                  <FieldError>{editErrors.jam_pulang.message}</FieldError>
                )}
              </Field>
              <Field data-invalid={editErrors.keterangan ? true : undefined}>
                <FieldLabel htmlFor="keterangan_edit">Keterangan</FieldLabel>
                <textarea
                  id="keterangan_edit"
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  rows={3}
                  style={{ resize: "vertical" }}
                  placeholder="Keterangan (opsional)"
                  {...register("keterangan")}
                />
                {editErrors.keterangan && (
                  <FieldError>{editErrors.keterangan.message}</FieldError>
                )}
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeEdit}>
                  Batal
                </Button>
                <Button type="submit" disabled={updateAbsensi.isPending}>
                  {updateAbsensi.isPending ? (
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
          </>
        )}
      </Modal>
    </div>
  );
}
