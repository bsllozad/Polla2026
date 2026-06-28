import { Save } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useActiveParticipantStore } from "@/features/family-users/activeParticipantStore";
import { listMatches } from "@/infrastructure/repositories/matchesRepository";
import { listPlayersByIds, listPlayersByTeamId } from "@/infrastructure/repositories/playersRepository";
import { listPredictionsByParticipant, savePrediction, StoredPrediction } from "@/infrastructure/repositories/predictionsRepository";
import { Match, Team } from "@/shared/types/worldcup";

type PredictionDraft = {
  homeScore: string;
  awayScore: string;
  homeScorerId: string;
  awayScorerId: string;
};

function canHaveRoster(team: Team) {
  return team.id !== "pending" && !team.id.startsWith("W") && !team.id.startsWith("L") && !/^\d/.test(team.id);
}

function PredictionCard({
  match,
  participantId,
  storedPrediction
}: {
  match: Match;
  participantId?: string;
  storedPrediction?: StoredPrediction;
}) {
  const queryClient = useQueryClient();
  const isLocked = new Date(match.kickoffAt).getTime() <= Date.now();
  const homeCanHaveRoster = canHaveRoster(match.homeTeam);
  const awayCanHaveRoster = canHaveRoster(match.awayTeam);
  const {
    data: loadedHomePlayers = [],
    error: homePlayersError,
    isLoading: isLoadingHomePlayers
  } = useQuery({
    queryKey: ["players-by-team", match.homeTeam.id],
    queryFn: () => listPlayersByTeamId(match.homeTeam.id),
    enabled: homeCanHaveRoster
  });
  const {
    data: loadedAwayPlayers = [],
    error: awayPlayersError,
    isLoading: isLoadingAwayPlayers
  } = useQuery({
    queryKey: ["players-by-team", match.awayTeam.id],
    queryFn: () => listPlayersByTeamId(match.awayTeam.id),
    enabled: awayCanHaveRoster
  });
  const storedScorerIds = useMemo(
    () => [storedPrediction?.homeScorerId, storedPrediction?.awayScorerId].filter(Boolean) as string[],
    [storedPrediction?.awayScorerId, storedPrediction?.homeScorerId]
  );
  const { data: storedScorers = [] } = useQuery({
    queryKey: ["stored-scorer-players", match.id, storedScorerIds.join(",")],
    queryFn: () => listPlayersByIds(storedScorerIds),
    enabled: storedScorerIds.length > 0
  });
  const homePlayers = useMemo(
    () => [...loadedHomePlayers, ...storedScorers.filter((player) => player.teamId === match.homeTeam.id)].filter(
      (player, index, array) => array.findIndex((item) => item.id === player.id) === index
    ),
    [loadedHomePlayers, match.homeTeam.id, storedScorers]
  );
  const awayPlayers = useMemo(
    () => [...loadedAwayPlayers, ...storedScorers.filter((player) => player.teamId === match.awayTeam.id)].filter(
      (player, index, array) => array.findIndex((item) => item.id === player.id) === index
    ),
    [loadedAwayPlayers, match.awayTeam.id, storedScorers]
  );
  const allMatchPlayers = useMemo(() => [...homePlayers, ...awayPlayers], [awayPlayers, homePlayers]);
  const isLoadingPlayers = isLoadingHomePlayers || isLoadingAwayPlayers;
  const [draft, setDraft] = useState<PredictionDraft>({
    homeScore: "0",
    awayScore: "0",
    homeScorerId: "",
    awayScorerId: ""
  });

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
      queryClient.invalidateQueries({ queryKey: ["match-point-details", participantId] });
    }
  });

  useEffect(() => {
    setDraft({
      homeScore: String(storedPrediction?.homeScore ?? 0),
      awayScore: String(storedPrediction?.awayScore ?? 0),
      homeScorerId: storedPrediction?.homeScorerId ?? "",
      awayScorerId: storedPrediction?.awayScorerId ?? ""
    });
    mutation.reset();
  }, [storedPrediction, participantId, match.id]);

  function updateDraft(key: keyof PredictionDraft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participantId || isLocked) return;
    mutation.mutate();
  }

  const selectedHomeScorer = allMatchPlayers.find((player) => player.id === draft.homeScorerId);
  const selectedAwayScorer = allMatchPlayers.find((player) => player.id === draft.awayScorerId);
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
            {homePlayersError ? <small className="form-error">No pude cargar jugadores de {match.homeTeam.code}.</small> : null}
            {!isLoadingHomePlayers && homeCanHaveRoster && !homePlayersError && homePlayers.length === 0 ? (
              <small className="field-note">No hay jugadores cargados para {match.homeTeam.code}.</small>
            ) : null}
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
            {awayPlayersError ? <small className="form-error">No pude cargar jugadores de {match.awayTeam.code}.</small> : null}
            {!isLoadingAwayPlayers && awayCanHaveRoster && !awayPlayersError && awayPlayers.length === 0 ? (
              <small className="field-note">No hay jugadores cargados para {match.awayTeam.code}.</small>
            ) : null}
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
  const { data: allMatches = [] } = useQuery({
    queryKey: ["prediction-matches"],
    queryFn: () => listMatches({ limit: 104, showAll: true })
  });
  const upcomingMatches = useMemo(() => {
    if (showAll) return allMatches;

    const futureMatches = allMatches.filter((match) => new Date(match.kickoffAt).getTime() >= Date.now());
    return futureMatches.slice(0, 12);
  }, [allMatches, showAll]);
  const { data: storedPredictions = {} } = useQuery({
    queryKey: ["stored-predictions", activeParticipant?.id],
    queryFn: () => listPredictionsByParticipant(activeParticipant?.id),
    enabled: Boolean(activeParticipant?.id)
  });

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
          participantId={activeParticipant?.id}
          storedPrediction={storedPredictions[match.id]}
        />
      ))}
    </div>
  );
}
