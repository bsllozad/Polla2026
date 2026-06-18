import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useActiveParticipantStore } from "@/features/family-users/activeParticipantStore";
import { listColombiaResultDetails } from "@/infrastructure/repositories/colombiaResultsRepository";

export function ColombiaPointsPage() {
  const activeParticipant = useActiveParticipantStore((state) => state.activeParticipant);
  const { data: details = [], isLoading } = useQuery({
    queryKey: ["colombia-result-details", activeParticipant?.id],
    queryFn: () => listColombiaResultDetails(activeParticipant?.id),
    enabled: Boolean(activeParticipant?.id)
  });
  const totalPoints = details.reduce((total, detail) => total + detail.earnedPoints, 0);

  return (
    <div className="stack">
      <div className="page-title">
        <p className="eyebrow">Puntos por pregunta</p>
        <h2>Puntos Polla Colombia</h2>
      </div>
      {!activeParticipant ? <p className="form-error">Selecciona un participante para ver sus puntos.</p> : null}
      <Card>
        <CardHeader>
          <CardTitle>{activeParticipant?.displayName ?? "Participante"}</CardTitle>
          <div className="points-summary">
            <span>Total</span>
            <strong>{totalPoints} pts</strong>
          </div>
        </CardHeader>
        {isLoading ? <p className="empty-state">Cargando puntos...</p> : null}
        {!isLoading && details.length === 0 ? <p className="empty-state">Todavia no hay respuestas para mostrar.</p> : null}
        <div className="question-result-list">
          {details.map((detail) => {
            const isHit = detail.isClosed && detail.earnedPoints > 0;
            return (
              <article key={detail.questionKey} className="question-result-card">
                <div className="question-result-title">
                  <h3>{detail.label}</h3>
                  <span className={detail.isClosed ? "status-pill" : "status-pill pending"}>
                    {detail.isClosed ? "Cerrada" : "Pendiente"}
                  </span>
                </div>
                <div className="points-breakdown colombia-breakdown">
                  <div>
                    <Clock3 size={18} />
                    <span>Tu apuesta</span>
                    <strong>{detail.userAnswer?.label ?? "Sin respuesta"}</strong>
                  </div>
                  <div>
                    {detail.isClosed ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                    <span>Resultado real</span>
                    <strong>{detail.officialAnswer?.label ?? "Pendiente"}</strong>
                  </div>
                  <div>
                    {isHit ? <CheckCircle2 size={18} /> : detail.isClosed ? <XCircle size={18} /> : <Clock3 size={18} />}
                    <span>Puntos</span>
                    <strong>{detail.earnedPoints} / {detail.points}</strong>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
