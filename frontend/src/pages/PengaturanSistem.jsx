import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema } from "../schemas";
import { useChangePassword } from "../api/queries";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Settings,
  ShieldCheck,
  TriangleAlert,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const ROLE_LABELS = {
  superadmin: "Super Admin",
  admin: "Admin",
};

export default function PengaturanSistem() {
  const { user, loading } = useAuth();
  const changePassword = useChangePassword();
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      old_password: "",
      new_password: "",
      new_password_confirmation: "",
    },
  });

  const onSubmit = async (data) => {
    setMessage({ type: "", text: "" });
    try {
      await changePassword.mutateAsync(data);
      setMessage({
        type: "success",
        text: "Password berhasil diubah. Gunakan password baru untuk login berikutnya.",
      });
      reset({
        old_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
    } catch (err) {
      setMessage({
        type: "danger",
        text: err.response?.data?.message || "Gagal mengubah password",
      });
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="page-header">
        <h4>Pengaturan Sistem</h4>
        <small className="text-muted-foreground">
          Kelola akun dan konfigurasi aplikasi.
        </small>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 py-4">
            <UserCog className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Info Akun</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <small className="mb-1 block text-muted-foreground">Nama</small>
              <div className="font-semibold">{user?.nama || "-"}</div>
            </div>
            <div>
              <small className="mb-1 block text-muted-foreground">Email</small>
              <div>{user?.email || "-"}</div>
            </div>
            <div>
              <small className="mb-1 block text-muted-foreground">Role</small>
              <div>{ROLE_LABELS[user?.role] || user?.role || "-"}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 py-4">
            <KeyRound className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">
              Ganti Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            {message.text && (
              <Alert
                variant={message.type === "success" ? "default" : "destructive"}
                className="mb-4"
              >
                {message.type === "success" ? (
                  <ShieldCheck />
                ) : (
                  <TriangleAlert />
                )}
                <AlertTitle>
                  {message.type === "success" ? "Berhasil" : "Gagal"}
                </AlertTitle>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Field data-invalid={errors.old_password ? true : undefined}>
                <FieldLabel htmlFor="old_password">Password Lama</FieldLabel>
                <div className="relative">
                  <Input
                    id="old_password"
                    type={showOld ? "text" : "password"}
                    placeholder="Masukkan password saat ini"
                    aria-invalid={errors.old_password ? true : undefined}
                    className="pe-10"
                    {...register("old_password")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground"
                    onClick={() => setShowOld((v) => !v)}
                    tabIndex={-1}
                    aria-label={showOld ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showOld ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.old_password && (
                  <FieldError>{errors.old_password.message}</FieldError>
                )}
              </Field>

              <Field data-invalid={errors.new_password ? true : undefined}>
                <FieldLabel htmlFor="new_password">Password Baru</FieldLabel>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNew ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    aria-invalid={errors.new_password ? true : undefined}
                    className="pe-10"
                    {...register("new_password")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground"
                    onClick={() => setShowNew((v) => !v)}
                    tabIndex={-1}
                    aria-label={showNew ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.new_password && (
                  <FieldError>{errors.new_password.message}</FieldError>
                )}
              </Field>

              <Field
                data-invalid={errors.new_password_confirmation ? true : undefined}
              >
                <FieldLabel htmlFor="new_password_confirmation">
                  Konfirmasi Password Baru
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="new_password_confirmation"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Ulangi password baru"
                    aria-invalid={
                      errors.new_password_confirmation ? true : undefined
                    }
                    className="pe-10"
                    {...register("new_password_confirmation")}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showConfirm ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {errors.new_password_confirmation && (
                  <FieldError>
                    {errors.new_password_confirmation.message}
                  </FieldError>
                )}
              </Field>

              <Separator className="my-2" />

              <div className="flex justify-end">
                <Button type="submit" disabled={changePassword.isPending}>
                  {changePassword.isPending ? (
                    <>
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check data-icon="inline-start" />
                      Simpan Password
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-row items-center gap-2 py-4">
          <Settings className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">
            Tentang Aplikasi
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <small className="mb-1 block text-muted-foreground">
              Aplikasi
            </small>
            <div className="font-semibold">Absensi Karyawan IoT</div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">
              Perangkat Keras
            </small>
            <div>ESP32 + MFRC522 RFID Reader</div>
          </div>
          <div>
            <small className="mb-1 block text-muted-foreground">
              Teknologi
            </small>
            <div>Laravel API + React Dashboard (SSE Realtime)</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
