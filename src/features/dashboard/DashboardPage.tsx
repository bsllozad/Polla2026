import { Clock, MapPin, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { listMatches } from "@/infrastructure/repositories/matchesRepository";
import { listMatchStandings } from "@/infrastructure/repositories/standingsRepository";
import { listWorldCupTopScorers } from "@/infrastructure/repositories/topScorersRepository";

export function DashboardPage() {
  const [showAll, setShowAll] = useState(false);
  const { data: matches = [], isLoading, error } = useQuery({
    queryKey: ["upcoming-matches", showAll],
    queryFn: () => listMatches({ limit: showAll ? 104 : 8, showAll })
  });
  const { data: standings = [] } = useQuery({
    queryKey: ["match-standings"],
    queryFn: listMatchStandings
  });
  const { data: topScorers = [], isLoading: isLoadingTopScorers, error: topScorersError } = useQuery({
    queryKey: ["world-cup-top-scorers"],
    queryFn: () => listWorldCupTopScorers(5),
    refetchInterval: 15000
  });
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  });

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Apuestas abiertas</p>
          <h2>Partidos del dia, tabla familiar y seguimiento del Mundial en un solo lugar.</h2>
        </div>
        <div className="hero-stat">
          <strong>5 pts</strong>
          <span>Marcador exacto</span>
        </div>
      </section>

      <Card className="span-2">
        <CardHeader>
          <CardTitle>Proximos partidos</CardTitle>
          <Button type="button" variant="secondary" onClick={() => setShowAll((value) => !value)}>
            {showAll ? "Ver proximos" : "Ver todos"}
          </Button>
        </CardHeader>
        <div className="match-list">
          {isLoading ? <p className="empty-state">Cargando partidos...</p> : null}
          {error ? <p className="form-error">No pude cargar los partidos desde Supabase.</p> : null}
          {!isLoading && matches.length === 0 ? <p className="empty-state">No hay partidos cargados todavia.</p> : null}
          {matches.map((match) => (
            <article className="match-row" key={match.id}>
              <div className="teams">
                <strong>{match.homeTeam.flagEmoji} {match.homeTeam.name}</strong>
                <span>vs</span>
                <strong>{match.awayTeam.flagEmoji} {match.awayTeam.name}</strong>
              </div>
              <div className="match-meta">
                <span><Clock size={15} /> {formatter.format(new Date(match.kickoffAt))}</span>
                <span><MapPin size={15} /> {match.venue}</span>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top polla</CardTitle>
          <TrendingUp size={18} />
        </CardHeader>
        {standings.length === 0 ? (
          <p className="empty-state">Agrega participantes para iniciar la tabla.</p>
        ) : (
          <ol className="ranking-list">
            {standings.slice(0, 5).map((row) => (
              <li key={row.participantId}><span>{row.displayName}</span><strong>{row.points}</strong></li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goleadores Mundial</CardTitle>
        </CardHeader>
        {isLoadingTopScorers ? <p className="empty-state">Cargando goleadores...</p> : null}
        {topScorersError ? <p className="form-error">No pude cargar los goleadores.</p> : null}
        {!isLoadingTopScorers && topScorers.length === 0 ? (
          <p className="empty-state">Se llena automaticamente al registrar goles oficiales.</p>
        ) : (
          <ol className="ranking-list">
            {topScorers.map((row) => (
              <li key={row.playerId}>
                <span>{row.flagEmoji} {row.fullName} <small>{row.teamCode}</small></span>
                <strong>{row.goals}</strong>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
