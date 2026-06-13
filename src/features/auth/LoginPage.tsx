import { Trophy } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useSession } from "@/features/auth/useSession";
import { supabase } from "@/infrastructure/supabase/client";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = typeof location.state === "object" && location.state && "from" in location.state ? String(location.state.from) : "/";

  if (!isLoading && session) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!supabase) {
      setError("Falta configurar Supabase en .env.local.");
      return;
    }

    setIsSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);

    if (signInError) {
      setError("Correo o clave incorrectos.");
      return;
    }

    navigate(redirectTo, { replace: true });
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="brand-mark large"><Trophy size={28} /></div>
        <h1>Polla Mundial 2026</h1>
        <p>Ingreso protegido para la familia. El superadmin administra resultados y usuarios.</p>
        <label>
          Correo
          <input type="email" placeholder="familia@email.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label>
          Clave
          <input type="password" placeholder="Clave familiar" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <Button disabled={isSubmitting}>{isSubmitting ? "Entrando..." : "Entrar"}</Button>
        <Link className="auth-link" to="/registro">Crear cuenta nueva</Link>
      </form>
    </main>
  );
}
