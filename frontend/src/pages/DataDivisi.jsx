import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useDebounce } from "../hooks/useDebounce";
import Modal from "../components/Modal";
import FormInput from "../components/FormInput";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import { Check, Eye, Loader2, Network, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

export default function DataDivisi() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [namaDivisi, setNamaDivisi] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/divisi");
      setData(res.data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = data.filter((item) =>
    item.nama_divisi.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const openAdd = () => {
    setEditId(null);
    setNamaDivisi("");
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditId(item.id);
    setNamaDivisi(item.nama_divisi);
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const payload = { nama_divisi: namaDivisi };
      if (editId) {
        await api.put(`/divisi/${editId}`, payload);
      } else {
        await api.post("/divisi", payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus divisi ini?")) return;
    try {
      await api.delete(`/divisi/${id}`);
      fetchData();
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <h4>Data Divisi</h4>
        <Button onClick={openAdd}>
          <Plus data-icon="inline-start" />
          Tambah Divisi
        </Button>
      </div>

      <div className="mb-3 max-w-[360px]">
        <InputGroup>
          <InputGroupAddon>
            <Search className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            placeholder="Cari divisi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          message="Tidak ada divisi ditemukan"
          icon={<Network className="size-10" />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama Divisi</TableHead>
                    <TableHead>Jumlah Karyawan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">
                        {item.nama_divisi}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-md text-primary">
                          {item.employees_count ?? 0} orang
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon-sm"
                            title="Lihat Detail"
                            onClick={() => navigate(`/data-divisi/${item.id}`)}
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
        title={editId ? "Edit Divisi" : "Tambah Divisi"}
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Nama Divisi"
            name="nama_divisi"
            value={namaDivisi}
            onChange={(e) => {
              setNamaDivisi(e.target.value);
              setErrors((prev) => ({ ...prev, nama_divisi: undefined }));
            }}
            error={errors.nama_divisi?.[0]}
            placeholder="Contoh: Teknologi Informasi"
            required
          />
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