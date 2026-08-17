import { useEffect, useState } from "react";
import { useJadwal, useUpdateJadwal } from "../api/queries";
import FormInput from "../components/FormInput";
import LoadingSpinner from "../components/LoadingSpinner";
import { Check, Clock, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JamKerja() {
  const [form, setForm] = useState({
    jam_masuk_standar: "08:00",
    jam_pulang_standar: "17:00",
    toleransi_menit: 15,
  });
  const [message, setMessage] = useState({ type: "", text: "" });
  const updateJadwal = useUpdateJadwal();

  const { isPending, data: jadwal } = useJadwal();

  useEffect(() => {
    if (jadwal) {
      setForm({
        jam_masuk_standar:
          jadwal.jam_masuk_standar?.substring(0, 5) || "08:00",
        jam_pulang_standar:
          jadwal.jam_pulang_standar?.substring(0, 5) || "17:00",
        toleransi_menit: jadwal.toleransi_menit ?? 15,
      });
    }
  }, [jadwal]);

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
    setMessage({ type: "", text: "" });
    try {
      await updateJadwal.mutateAsync({
        jam_masuk_standar: form.jam_masuk_standar + ":00",
        jam_pulang_standar: form.jam_pulang_standar + ":00",
        toleransi_menit: form.toleransi_menit,
      });
      setMessage({ type: "success", text: "Jam kerja berhasil disimpan" });
    } catch (err) {
      const msg =
        err.response?.data?.message || "Gagal menyimpan jam kerja";
      setMessage({ type: "danger", text: msg });
    }
  };

  if (isPending) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header">
        <h4>Jam Kerja</h4>
      </div>

      {message.text && (
        <Alert
          variant={message.type === "success" ? "default" : "destructive"}
          className="mb-3"
        >
          <AlertTitle>
            {message.type === "success" ? "Berhasil" : "Gagal"}
          </AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Clock className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">
            Pengaturan Jam Kerja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormInput
                label="Jam Masuk Standar"
                name="jam_masuk_standar"
                type="time"
                value={form.jam_masuk_standar}
                onChange={handleChange}
                required
              />
              <FormInput
                label="Jam Pulang Standar"
                name="jam_pulang_standar"
                type="time"
                value={form.jam_pulang_standar}
                onChange={handleChange}
                required
              />
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
            <Alert className="text-sm">
              <Info className="size-4" />
              <AlertDescription>
                Karyawan yang masuk setelah jam{" "}
                <strong>
                  {form.jam_masuk_standar} + {form.toleransi_menit} menit
                </strong>{" "}
                akan ditandai sebagai <strong>Terlambat</strong>.
              </AlertDescription>
            </Alert>
            <Button type="submit" disabled={updateJadwal.isPending}>
              {updateJadwal.isPending ? (
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}