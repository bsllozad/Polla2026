import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/app/layout/AppLayout";
import { AdminResultsPage } from "@/features/admin-results/AdminResultsPage";
import { AdminRoute } from "@/features/auth/AdminRoute";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { ColombiaPollaPage } from "@/features/colombia-polla/ColombiaPollaPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { FamilyUsersPage } from "@/features/family-users/FamilyUsersPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { MatchPointsPage } from "@/features/match-points/MatchPointsPage";
import { PredictionsPage } from "@/features/predictions/PredictionsPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { StandingsPage } from "@/features/standings/StandingsPage";
import { TournamentPage } from "@/features/tournament/TournamentPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/registro", element: <RegisterPage /> },
  {
    path: "/",
    element: <AuthGuard />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "apuestas", element: <PredictionsPage /> },
          { path: "puntos-partidos", element: <MatchPointsPage /> },
          { path: "posiciones", element: <StandingsPage /> },
          { path: "colombia", element: <ColombiaPollaPage /> },
          { path: "torneo", element: <TournamentPage /> },
          {
            element: <AdminRoute />,
            children: [
              { path: "admin-resultados", element: <AdminResultsPage /> },
              { path: "usuarios", element: <FamilyUsersPage /> }
            ]
          }
        ]
      }
    ]
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);
