import { Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useActiveParticipantStore } from "@/features/family-users/activeParticipantStore";
import { listMatches } from "@/infrastructure/repositories/matchesRepository";
import { listPlayersByIds, listPlayersByTeamIds } from "@/infrastructure/repositories/playersRepository";
import { listPredictionsByParticipant, savePrediction, StoredPrediction } from "@/infrastructure/repositories/predictionsRepository";
import { Match, Player } from "@/shared/types/worldcup";

type PredictionDraft = {
  homeScore: string;
  awayScore: string;
  homeScorerId: string;
  awayScorerId: string;
};

function PredictionCard({
  match,
  players,
  isLoadingPlayers,
  participantId,
  storedPrediction
}: {
  match: Match;
  players: Player[];
  isLoadingPlayers: boolean;
  participantId?: string;
  storedPrediction?: StoredPrediction;
}) {
  const queryClient = useQueryClient();
  const isLocked = new Date(match.kickoffAt).getTime() <= Date.now();
  const [draft, setDraft] = useState<PredictionDraft>({
    homeScore: "0",
    awayScore: "0",
    homeScorerId: "",
    awayScorerId: ""
  });

  useEffect(() => {
    setDraft({
      homeScore: String(storedPrediction?.homeScore ?? 0),
      awayScore: String(storedPrediction?.awayScore ?? 0),
      homeScorerId: storedPrediction?.homeScorerId ?? "",
      awayScorerId: storedPrediction?.awayScorerId ?? ""
    });
  }, [storedPrediction, participantId, match.id]);

  const mutation = useMutation({
    mutationFn: () =>
      savePrediction({
        participantId: participantId ?? "",
        matchId: match.id,
        homeScore: Number(draft.homeScore),
        awayScore: Number(draft.awayScore),
        homeScorerId: draft.homeScorerId || undefined,
        awayScorerId: draft.awayScorerId || undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stored-predictions", participantId] });
      queryClient.invalidateQueries({ queryKey: ["match-standings"] });
    }
  });

  function updateDraft(key: keyof PredictionDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participantId || isLocked) return;
    mutation.mutate();
  }

  const homePlayers = players.filter((player) => player.teamId === match.homeTeam.id);
  const awayPlayers = players.filter((player) => player.teamId === match.awayTeam.id);
  const selectedHomeScorer = players.find((player) => player.id === draft.homeScorerId);
  const selectedAwayScorer = players.find((player) => player.id === draft.awayScorerId);
  const homeHasStoredOption = !draft.homeScorerId || homePlayers.some((player) => player.id === draft.homeScorerId);
  const awayHasStoredOption = !draft.awayScorerId || awayPlayers.some((player) => player.id === draft.awayScorerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{match.homeTeam.flagEmoji} {match.homeTeam.name} vs {match.awayTeam.flagEmoji} {match.awayTeam.name}</CardTitle>
        <span className="status-pill">{isLocked ? "Apuesta cerrada" : "Abierta hasta el inicio"}</span>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <div className="prediction-grid">
          <label>
            Goles {match.homeTeam.code}
            <input type="number" min="0" value={draft.homeScore} disabled={isLocked} onChange={(event) => updateDraft("homeScore", event.target.value)} />
          </label>
          <label>
            Goles {match.awayTeam.code}
            <input type="number" min="0" value={draft.awayScore} disabled={isLocked} onChange={(event) => updateDraft("awayScore", event.target.value)} />
          </label>
          <label>
            Goleador {match.homeTeam.code}
            <select value={draft.homeScorerId} disabled={isLoadingPlayers || isLocked} onChange={(event) => updateDraft("homeScorerId", event.target.value)}>
              <option value="">{isLoadingPlayers ? "Cargando..." : "Opcional"}</option>
              {!homeHasStoredOption ? (
                <option value={draft.homeScorerId}>{selectedHomeScorer?.fullName ?? "Goleador guardado"}</option>
              ) : null}
              {homePlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.shirtNumber ? `${player.shirtNumber} · ` : ""}{player.fullName} · {player.position}
                </option>
              ))}
            </select>
            {draft.homeScorerId ? <small className="field-note">Guardado: {selectedHomeScorer?.fullName ?? "jugador seleccionado"}</small> : null}
          </label>
          <label>
            Goleador {match.awayTeam.code}
            <select value={draft.awayScorerId} disabled={isLoadingPlayers || isLocked} onChange={(event) => updateDraft("awayScorerId", event.target.value)}>
              <option value="">{isLoadingPlayers ? "Cargando..." : "Opcional"}</option>
              {!awayHasStoredOption ? (
                <option value={draft.awayScorerId}>{selectedAwayScorer?.fullName ?? "Goleador guardado"}</option>
              ) : null}
              {awayPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.shirtNumber ? `${player.shirtNumber} · ` : ""}{player.fullName} · {player.position}
                </option>
              ))}
            </select>
            {draft.awayScorerId ? <small className="field-note">Guardado: {selectedAwayScorer?.fullName ?? "jugador seleccionado"}</small> : null}
          </label>
        </div>
        {isLocked ? <p className="empty-state">Ya no se puede modificar esta apuesta porque el partido comenzo.</p> : null}
        {mutation.isError ? <p className="form-error">No pude guardar esta apuesta.</p> : null}
        {mutation.isSuccess ? <p className="form-success">Apuesta guardada.</p> : null}
        <div className="card-actions">
          <Button disabled={!participantId || mutation.isPending || isLocked}><Save size={16} /> {mutation.isPending ? "Guardando..." : "Guardar apuesta"}</Button>
        </div>
      </form>
    </Card>
  );
}

export function PredictionsPage() {
  const activeParticipant = useActiveParticipantStore((state) => state.activeParticipant);
  const [showAll, setShowAll] = useState(false);
  const { data: upcomingMatches = [] } = useQuery({
    queryKey: ["prediction-matches", showAll],
    queryFn: () => listMatches({ limit: showAll ? 104 : 12, showAll })
  });
  const teamIds = upcomingMatches.flatMap((match) => [match.homeTeam.id, match.awayTeam.id]);
  const teamKey = [...new Set(teamIds)].sort().join(",");
  const { data: players = [], isLoading: isLoadingPlayers } = useQuery({
    queryKey: ["players-by-teams", teamKey],
    queryFn: () => listPlayersByTeamIds(teamIds),
    enabled: teamIds.length > 0
  });
  const { data: storedPredictions = {} } = useQuery({
    queryKey: ["stored-predictions", activeParticipant?.id],
    queryFn: () => listPredictionsByParticipant(activeParticipant?.id),
    enabled: Boolean(activeParticipant?.id)
  });
  const selectedScorerIds = Object.values(storedPredictions).flatMap((prediction) =>
    [prediction.homeScorerId, prediction.awayScorerId].filter(Boolean) as string[]
  );
  const selectedScorerKey = [...new Set(selectedScorerIds)].sort().join(",");
  const { data: storedScorers = [] } = useQuery({
    queryKey: ["stored-scorer-players", selectedScorerKey],
    queryFn: () => listPlayersByIds(selectedScorerIds),
    enabled: selectedScorerIds.length > 0
  });
  const allPlayers = [...players, ...storedScorers].filter(
    (player, index, array) => array.findIndex((item) => item.id === player.id) === index
  );

  return (
    <div className="stack">
      <div className="page-title page-title-row">
        <div>
          <p className="eyebrow">Participante activo</p>
          <h2>{activeParticipant?.displayName ?? "Selecciona un participante"}</h2>
        </div>
        <Button type="button" variant="secondary" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Ver proximos" : "Ver todos"}
        </Button>
      </div>
      {!activeParticipant ? <p className="form-error">Selecciona un participante antes de guardar apuestas.</p> : null}
      {upcomingMatches.length === 0 ? <p className="empty-state">No hay partidos disponibles.</p> : null}
      {upcomingMatches.map((match) => (
        <PredictionCard
          key={match.id}
          match={match}
          players={allPlayers}
          isLoadingPlayers={isLoadingPlayers}
          participantId={activeParticipant?.id}
          storedPrediction={storedPredictions[match.id]}
        />
      ))}
    </div>
  );
}
