import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardList, LogOut, Medal, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { useActiveParticipantStore } from "@/features/family-users/activeParticipantStore";
import { ParticipantSwitcher } from "@/features/family-users/ParticipantSwitcher";
import { getCurrentUserProfile } from "@/infrastructure/repositories/profilesRepository";
import { supabase } from "@/infrastructure/supabase/client";

const navItems = [
  { to: "/", label: "Inicio", icon: CalendarDays },
  { to: "/apuestas", label: "Apuestas", icon: Trophy },
  { to: "/puntos-partidos", label: "Puntos partidos", icon: ClipboardList },
  { to: "/posiciones", label: "Posiciones", icon: Medal },
  { to: "/colombia", label: "Polla Colombia", icon: ShieldCheck },
  { to: "/usuarios", label: "Usuarios", icon: UsersRound, adminOnly: true }
];

export function AppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearActiveParticipant = useActiveParticipantStore((state) => state.clearActiveParticipant);
  const { data: profile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: getCurrentUserProfile
  });
  const isAdmin = !supabase || profile?.role === "superadmin";
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  async function handleLogout() {
    clearActiveParticipant();
    queryClient.clear();

    if (supabase) {
      await supabase.auth.signOut();
    }

    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">26</div>
          <div>
            <strong>Polla Mundial</strong>
            <span>Casa Lopez 2026</span>
          </div>
        </div>
        <nav className="nav-list">
          {visibleNavItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className="nav-link">
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {isAdmin ? (
          <NavLink to="/admin-resultados" className="admin-link">
            Admin resultados
          </NavLink>
        ) : null}
      </aside>
      <main className="main-layout">
        <header className="topbar">
          <div>
            <p className="eyebrow">Mundial FIFA 2026</p>
            <h1>Predicciones familiares</h1>
          </div>
          <div className="topbar-actions">
            <ParticipantSwitcher />
            {supabase ? (
              <Button type="button" variant="secondary" onClick={handleLogout} title="Cerrar sesion">
                <LogOut size={16} />
                Salir
              </Button>
            ) : null}
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
