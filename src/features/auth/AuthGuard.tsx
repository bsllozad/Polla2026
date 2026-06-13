import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/features/auth/useSession";
import { supabase } from "@/infrastructure/supabase/client";

export function AuthGuard() {
  const location = useLocation();
  const { session, isLoading } = useSession();

  if (!supabase) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <main className="center-screen">
        <div className="loading-panel">Cargando sesion...</div>
      </main>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
