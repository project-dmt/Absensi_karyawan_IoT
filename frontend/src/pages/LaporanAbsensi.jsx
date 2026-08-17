import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import api from "../api/axios";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import Modal from "../components/Modal";
import FormInput from "../components/FormInput";
import {
  CalendarRange,
  CalendarX,
  Check,
  FileSpreadsheet,
  FileText,
  Funnel,
  Loader2,
  Pencil,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [divisi, setDivisi] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetched, setFetched] = useState(true);

  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({ status: "", keterangan: "", jam_pulang: "" });
  const [editErrors, setEditErrors] = useState({});
  const [editMessage, setEditMessage] = useState({ type: "", text: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/divisi")
      .then((res) => setDivisi(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetched(true);
    try {
      const params = { dari: filter.dari, sampai: filter.sampai, per_page: 500 };
      if (filter.divisi_id) params.divisi_id = filter.divisi_id;
      const res = await api.get("/laporan", { params });
      setData(Array.isArray(res.data.data?.data) ? res.data.data.data : (Array.isArray(res.data.data) ? res.data.data : []));
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const handleChange = (e) => {
    setFilter((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleExport = async (format) => {
    try {
      const params = new URLSearchParams({ dari: filter.dari, sampai: filter.sampai, format });
      if (filter.divisi_id) params.append("divisi_id", filter.divisi_id);
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000/api"}/laporan/export`,
        {
          params,
          responseType: "blob",
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }
      );
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
    setEditForm({
      status: item.status,
      keterangan: item.keterangan || "",
      jam_pulang: item.jam_pulang ? item.jam_pulang.substring(0, 5) : "",
    });
    setEditErrors({});
    setEditMessage({ type: "", text: "" });
  };

  const closeEdit = () => {
    setEditItem(null);
    setEditErrors({});
    setEditMessage({ type: "", text: "" });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setEditErrors((prev) => ({ ...prev, [name]: undefined }));
    setEditMessage({ type: "", text: "" });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    setEditErrors({});
    setEditMessage({ type: "", text: "" });
    try {
      const payload = { status: editForm.status };
      if (editForm.keterangan) payload.keterangan = editForm.keterangan;
      if (editForm.jam_pulang) payload.jam_pulang = editForm.jam_pulang + ":00";

      await api.put(`/absensi/${editItem.id}`, payload);
      setEditMessage({ type: "success", text: "Absensi berhasil diupdate" });
      fetchData();
    } catch (err) {
      if (err.response?.status === 422) {
        if (err.response.data.message) {
          setEditMessage({ type: "danger", text: err.response.data.message });
        }
        setEditErrors(err.response.data.errors || {});
      } else {
        setEditMessage({ type: "danger", text: err.response?.data?.message || "Gagal mengupdate absensi" });
      }
    } finally {
      setEditSubmitting(false);
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
            <Button onClick={fetchData} disabled={loading} className="w-full md:w-auto">
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

      {fetched && (
        <div className="mb-3 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("xlsx")}>
            <FileSpreadsheet data-icon="inline-start" className="size-4" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <FileText data-icon="inline-start" className="size-4" />
            Export CSV
          </Button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : !fetched ? (
        <EmptyState message="Pilih rentang tanggal lalu klik Terapkan untuk melihat laporan" icon={<CalendarRange className="size-10" />} />
      ) : data.length === 0 ? (
        <EmptyState message="Tidak ada data absensi untuk rentang tanggal ini" icon={<CalendarX className="size-10" />} />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
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
              {data.map((item, idx) => (
                <TableRow key={item.id}>
                  <TableCell>{idx + 1}</TableCell>
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

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <FormInput
                label="Status"
                name="status"
                as="select"
                value={editForm.status}
                onChange={handleEditChange}
                error={editErrors.status?.[0]}
                options={STATUS_OPTIONS}
              />
              <FormInput
                label="Jam Pulang"
                name="jam_pulang"
                type="time"
                value={editForm.jam_pulang}
                onChange={handleEditChange}
                error={editErrors.jam_pulang?.[0]}
              />
              <FormInput
                label="Keterangan"
                name="keterangan"
                as="textarea"
                value={editForm.keterangan}
                onChange={handleEditChange}
                error={editErrors.keterangan?.[0]}
                placeholder="Keterangan (opsional)"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={closeEdit}>
                  Batal
                </Button>
                <Button type="submit" disabled={editSubmitting}>
                  {editSubmitting ? (
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