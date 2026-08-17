import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jadwalSchema } from "../schemas";
import { useJadwal, useUpdateJadwal } from "../api/queries";
import LoadingSpinner from "../components/LoadingSpinner";
import { Check, Clock, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function JamKerja() {
  const [message, setMessage] = useState({ type: "", text: "" });
  const updateJadwal = useUpdateJadwal();
  const { isPending, data: jadwal } = useJadwal();

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(jadwalSchema),
    defaultValues: {
      jam_masuk_standar: "08:00",
      jam_pulang_standar: "17:00",
      toleransi_menit: 15,
    },
  });

  const watchJamMasuk = watch("jam_masuk_standar");
  const watchToleransi = watch("toleransi_menit");

  useEffect(() => {
    if (jadwal) {
      reset({
        jam_masuk_standar: jadwal.jam_masuk_standar?.substring(0, 5) || "08:00",
        jam_pulang_standar: jadwal.jam_pulang_standar?.substring(0, 5) || "17:00",
        toleransi_menit: jadwal.toleransi_menit ?? 15,
      });
    }
  }, [jadwal, reset]);

  const onSubmit = async (data) => {
    setMessage({ type: "", text: "" });
    try {
      await updateJadwal.mutateAsync({
        jam_masuk_standar: data.jam_masuk_standar + ":00",
        jam_pulang_standar: data.jam_pulang_standar + ":00",
        toleransi_menit: data.toleransi_menit,
      });
      setMessage({ type: "success", text: "Jam kerja berhasil disimpan" });
    } catch (err) {
      const msg = err.response?.data?.message || "Gagal menyimpan jam kerja";
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="jam_masuk_standar">Jam Masuk Standar</FieldLabel>
                <Input type="time" id="jam_masuk_standar" {...register("jam_masuk_standar")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="jam_pulang_standar">Jam Pulang Standar</FieldLabel>
                <Input type="time" id="jam_pulang_standar" {...register("jam_pulang_standar")} />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="toleransi_menit">Toleransi Keterlambatan (menit)</FieldLabel>
              <Input type="number" id="toleransi_menit" min={0} {...register("toleransi_menit")} />
              {errors.toleransi_menit && (
                <span className="text-sm text-destructive">{errors.toleransi_menit.message}</span>
              )}
            </Field>
            <Alert className="text-sm">
              <Info className="size-4" />
              <AlertDescription>
                Karyawan yang masuk setelah jam{" "}
                <strong>
                  {watchJamMasuk} + {watchToleransi} menit
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
