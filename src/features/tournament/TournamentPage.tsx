import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useQuery } from "@tanstack/react-query";
import { BracketBoard } from "@/features/tournament/BracketBoard";
import { listMatches } from "@/infrastructure/repositories/matchesRepository";

export function TournamentPage() {
  const { data: matches = [], isLoading, error } = useQuery({
    queryKey: ["tournament-bracket"],
    queryFn: () => listMatches({ limit: 104, showAll: true })
  });

  return (
    <div className="stack">
      <Card>
        <CardHeader>
          <CardTitle>Cruces del Mundial</CardTitle>
          <span className="muted">Se actualiza cuando el admin confirma clasificados y resultados.</span>
        </CardHeader>
        {isLoading ? <p className="empty-state">Cargando cruces...</p> : null}
        {error ? <p className="form-error">No pude cargar los cruces desde Supabase.</p> : null}
        {!isLoading && !error ? <BracketBoard matches={matches} /> : null}
      </Card>
    </div>
  );
}
