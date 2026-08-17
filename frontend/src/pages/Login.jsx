import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "../schemas";
import { Mail, Lock, LogIn, TriangleAlert, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useRouteContext, useRouter } from "../router";

export default function Login() {
  const router = useRouter();
  const { auth } = useRouteContext({ strict: false });
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data) => {
    setError("");
    try {
      await auth.login(data.email, data.password);
      router.navigate({ to: "/" });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        "Login gagal. Periksa email dan password.";
      setError(msg);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__bg" />
      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__icon">
            <UserCog className="size-7" />
          </div>
          <h4>Sistem Absensi IoT</h4>
          <p>Silakan login untuk melanjutkan</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <TriangleAlert />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Mail className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                type="email"
                id="email"
                placeholder="Masukkan email"
                autoFocus
                aria-invalid={errors.email ? true : undefined}
                {...register("email")}
              />
            </InputGroup>
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>
          <Field data-invalid={errors.password ? true : undefined}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Lock className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                type="password"
                id="password"
                placeholder="Masukkan password"
                aria-invalid={errors.password ? true : undefined}
                {...register("password")}
              />
            </InputGroup>
            {errors.password && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </Field>
          <Button
            type="submit"
            className="mt-1 h-10 w-full text-sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <LogIn data-icon="inline-start" />
                Login
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
