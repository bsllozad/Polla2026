import { Award, CalendarClock, Goal, ListChecks } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useActiveParticipantStore } from "@/features/family-users/activeParticipantStore";
import { listParticipants } from "@/infrastructure/repositories/participantsRepository";
import { listMatchPointDetails, MatchPointDetail } from "@/infrastructure/repositories/matchPointsRepository";
import { getCurrentUserProfile } from "@/infrastructure/repositories/profilesRepository";

const formatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short"
});

function PlayerList({ players, emptyLabel }: { players: { id: string; fullName: string }[]; emptyLabel: string }) {
  if (players.length === 0) return <span className="muted">{emptyLabel}</span>;

  return (
    <span>
      {players.map((player) => player.fullName).join(", ")}
    </span>
  );
}

function MatchPointCard({ detail }: { detail: MatchPointDetail }) {
  const { match, prediction, result, points } = detail;
  const predictionLabel = prediction ? `${prediction.homeScore} - ${prediction.awayScore}` : "Sin apuesta";
  const resultLabel = result.status === "invalid" ? "Invalidado" : `${result.homeScore} - ${result.awayScore}`;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{match.homeTeam.flagEmoji} {match.homeTeam.name} vs {match.awayTeam.flagEmoji} {match.awayTeam.name}</CardTitle>
          <div className="match-meta match-points-meta">
            <span><CalendarClock size={15} /> {formatter.format(new Date(match.kickoffAt))}</span>
          </div>
        </div>
        <span className="status-pill">{points.total} pts</span>
      </CardHeader>

      <div className="prediction-grid readonly-prediction-grid">
        <div className="readonly-field">
          <span>Apuesta</span>
          <strong>{predictionLabel}</strong>
        </div>
        <div className="readonly-field">
          <span>Resultado admin</span>
          <strong>{resultLabel}</strong>
        </div>
        <div className="readonly-field">
          <span>Goleadores apostados</span>
          <PlayerList players={detail.selectedScorers} emptyLabel="Sin goleadores" />
        </div>
        <div className="readonly-field">
          <span>Goleadores reales</span>
          <PlayerList players={detail.realScorers} emptyLabel="Sin goles registrados" />
        </div>
      </div>

      <div className="points-breakdown">
        <div>
          <Award size={18} />
          <span>Marcador</span>
          <strong>{points.matchPoints} pts</strong>
        </div>
        <div>
          <Goal size={18} />
          <span>Goleadores</span>
          <strong>{points.scorerBonus} pts</strong>
        </div>
        <div>
          <ListChecks size={18} />
          <span>Total</span>
          <strong>{points.total} pts</strong>
        </div>
      </div>

      <ul className="reason-list">
        {detail.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </Card>
  );
}

export function MatchPointsPage() {
  const activeParticipant = useActiveParticipantStore((state) => state.activeParticipant);
  const [viewParticipantId, setViewParticipantId] = useState("");
  const { data: profile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: getCurrentUserProfile
  });
  const { data: participants = [] } = useQuery({
    queryKey: ["participants"],
    queryFn: listParticipants
  });
  const ownParticipant = participants.find((participant) => participant.userId === profile?.id);
  const selectedParticipant = participants.find((participant) => participant.id === viewParticipantId) ?? activeParticipant;
  const { data: details = [], isLoading, error } = useQuery({
    queryKey: ["match-point-details", selectedParticipant?.id],
    queryFn: () => listMatchPointDetails(selectedParticipant?.id),
    enabled: Boolean(selectedParticipant?.id)
  });
  const totalPoints = details.reduce((total, detail) => total + detail.points.total, 0);

  useEffect(() => {
    const defaultParticipant = ownParticipant ?? activeParticipant ?? participants[0];
    if (!viewParticipantId && defaultParticipant) {
      setViewParticipantId(defaultParticipant.id);
    }
  }, [activeParticipant, ownParticipant, participants, viewParticipantId]);

  return (
    <div className="stack">
      <div className="page-title page-title-row">
        <div>
          <p className="eyebrow">Detalle por partido</p>
          <h2>{selectedParticipant?.displayName ?? "Selecciona un participante"}</h2>
        </div>
        <div className="points-title-actions">
          <label className="compact-select">
            Ver participante
            <select value={selectedParticipant?.id ?? ""} onChange={(event) => setViewParticipantId(event.target.value)}>
              {participants.length === 0 ? <option value="">Sin participantes</option> : null}
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.displayName}
                </option>
              ))}
            </select>
          </label>
          <div className="points-summary">
            <span>Total partidos</span>
            <strong>{totalPoints} pts</strong>
          </div>
        </div>
      </div>

      {!selectedParticipant ? <p className="form-error">Selecciona un participante para ver sus puntos por partido.</p> : null}
      {isLoading ? <p className="empty-state">Cargando puntos por partido...</p> : null}
      {error ? <p className="form-error">No pude cargar el detalle de puntos.</p> : null}
      {!isLoading && selectedParticipant && details.length === 0 ? <p className="empty-state">Todavia no hay resultados ingresados por el admin.</p> : null}
      {details.map((detail) => (
        <MatchPointCard key={detail.match.id} detail={detail} />
      ))}
    </div>
  );
}
