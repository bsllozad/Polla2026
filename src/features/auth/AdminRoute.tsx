import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCurrentUserProfile } from "@/infrastructure/repositories/profilesRepository";
import { supabase } from "@/infrastructure/supabase/client";

export function AdminRoute() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: getCurrentUserProfile
  });

  if (!supabase) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <main className="center-screen">
        <div className="loading-panel">Cargando permisos...</div>
      </main>
    );
  }

  if (profile?.role !== "superadmin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
