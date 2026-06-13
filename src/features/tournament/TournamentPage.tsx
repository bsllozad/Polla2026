import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export function TournamentPage() {
  return (
    <div className="stack">
      <Card>
        <CardHeader>
          <CardTitle>Cruces del Mundial</CardTitle>
          <span className="muted">Ronda de 32 con los 8 mejores terceros editable por superadmin.</span>
        </CardHeader>
        <div className="bracket-placeholder">
          Importar fixture oficial FIFA y ajustar cruces manualmente si hace falta.
        </div>
      </Card>
    </div>
  );
}
