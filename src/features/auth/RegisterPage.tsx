import { Trophy } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/features/auth/useSession";
import { supabase } from "@/infrastructure/supabase/client";

export function RegisterPage() {
  const navigate = useNavigate();
  const { session, isLoading } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!supabase) {
      setError("Falta configurar Supabase en .env.local.");
      return;
    }

    setIsSubmitting(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setMessage("Cuenta creada. Revisa tu correo para confirmar el acceso.");
      return;
    }

    navigate("/", { replace: true });
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="brand-mark large"><Trophy size={28} /></div>
        <h1>Crear cuenta</h1>
        <p>Tu cuenta queda conectada a tu propio participante de la polla.</p>
        <label>
          Nombre visible
          <input value={displayName} placeholder="Ej: Bernardo" onChange={(event) => setDisplayName(event.target.value)} required />
        </label>
        <label>
          Correo
          <input type="email" placeholder="tu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Clave
          <input type="password" minLength={6} placeholder="Minimo 6 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}
        <Button disabled={isSubmitting}>{isSubmitting ? "Creando..." : "Crear cuenta"}</Button>
        <Link className="auth-link" to="/login">Ya tengo cuenta</Link>
      </form>
    </main>
  );
}
