import { useState } from "react";
import { Envelope, Lock, LogIn, TriangleAlert, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onLogin(form.email, form.password);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        "Login gagal. Periksa email dan password.";
      setError(msg);
    } finally {
      setLoading(false);
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Envelope className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Masukkan email"
                required
                autoFocus
              />
            </InputGroup>
            <FieldError />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Lock className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Masukkan password"
                required
              />
            </InputGroup>
            <FieldError />
          </Field>
          <Button
            type="submit"
            className="mt-1 h-10 w-full text-sm"
            disabled={loading}
          >
            {loading ? (
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