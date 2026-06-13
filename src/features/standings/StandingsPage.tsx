import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { listColombiaStandings, listMatchStandings, StandingRow } from "@/infrastructure/repositories/standingsRepository";

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  if (rows.length === 0) {
    return <p className="empty-state">No hay participantes todavia.</p>;
  }

  return (
    <table>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row.participantId}>
            <td>{index + 1}</td>
            <td>{row.displayName}</td>
            <td>{row.points} pts</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StandingsPage() {
  const { data: matchStandings = [] } = useQuery({
    queryKey: ["match-standings"],
    queryFn: listMatchStandings
  });
  const { data: colombiaStandings = [] } = useQuery({
    queryKey: ["colombia-standings"],
    queryFn: listColombiaStandings
  });

  return (
    <div className="page-grid">
      <Card>
        <CardHeader>
          <CardTitle>Tabla polla resultados</CardTitle>
        </CardHeader>
        <StandingsTable rows={matchStandings} />
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tabla polla Colombia</CardTitle>
        </CardHeader>
        <StandingsTable rows={colombiaStandings} />
      </Card>
    </div>
  );
}
