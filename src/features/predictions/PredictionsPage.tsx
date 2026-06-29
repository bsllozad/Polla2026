import { Save } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useActiveParticipantStore } from "@/features/family-users/activeParticipantStore";
import { listMatches } from "@/infrastructure/repositories/matchesRepository";
import { listPlayersByTeamIds } from "@/infrastructure/repositories/playersRepository";
import { listPredictionsByParticipant, savePrediction, StoredPrediction } from "@/infrastructure/repositories/predictionsRepository";
import { Match, Player, Team } from "@/shared/types/worldcup";

type PredictionDraft = {
  homeScore: string;
  awayScore: string;
  penaltyWinnerTeamId: string;
  homeScorerId: string;
  awayScorerId: string;
};

function canHaveRoster(team: Team) {
  return team.id !== "pending" && !/^[WL]\d+$/.test(team.id) && !/^[12][A-L]$/.test(team.id) && !/^3[A-L]+$/.test(team.id);
}

function PredictionCard({
  match,
  players,
  isLoadingPlayers,
  playersError,
  participantId,
  storedPrediction
}: {
  match: Match;
  players: Player[];
  isLoadingPlayers: boolean;
  playersError: unknown;
  participantId?: string;
  storedPrediction?: StoredPrediction;
}) {
  const queryClient = useQueryClient();
  const isLocked = new Date(match.kickoffAt).getTime() <= Date.now();
  const homeCanHaveRoster = canHaveRoster(match.homeTeam);
  const awayCanHaveRoster = canHaveRoster(match.awayTeam);
  const homePlayers = useMemo(
    () => players.filter((player) => player.teamId === match.homeTeam.id),
    [match.homeTeam.id, players]
  );
  const awayPlayers = useMemo(
    () => players.filter((player) => player.teamId === match.awayTeam.id),
    [match.awayTeam.id, players]
  );
  const allMatchPlayers = useMemo(() => [...homePlayers, ...awayPlayers], [awayPlayers, homePlayers]);
  const [draft, setDraft] = useState<PredictionDraft>({
    homeScore: "0",
    awayScore: "0",
    penaltyWinnerTeamId: "",
    homeScorerId: "",
    awayScorerId: ""
  });
  const scoreIsTie = draft.homeScore !== "" && draft.awayScore !== "" && Number(draft.homeScore) === Number(draft.awayScore);
  const canPickPenaltyWinner = match.stage !== "group" && scoreIsTie;
  const needsPenaltyWinner = canPickPenaltyWinner && !draft.penaltyWinnerTeamId;

  const mutation = useMutation({
    mutationFn: () =>
      savePrediction({
        participantId: participantId ?? "",
        matchId: match.id,
        homeScore: Number(draft.homeScore),
        awayScore: Number(draft.awayScore),
        penaltyWinnerTeamId: canPickPenaltyWinner ? draft.penaltyWinnerTeamId || undefined : undefined,
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
      penaltyWinnerTeamId: storedPrediction?.penaltyWinnerTeamId ?? "",
      homeScorerId: storedPrediction?.homeScorerId ?? "",
      awayScorerId: storedPrediction?.awayScorerId ?? ""
    });
    mutation.reset();
  }, [storedPrediction, participantId, match.id]);

  function updateDraft(key: keyof PredictionDraft, value: string) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if ((key === "homeScore" || key === "awayScore") && Number(next.homeScore) !== Number(next.awayScore)) {
        next.penaltyWinnerTeamId = "";
      }
      return next;
    });
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
          <fieldset className="penalty-choice" disabled={isLocked || !canPickPenaltyWinner}>
            <legend>Si empatan, penales</legend>
            <label>
              <input
                type="radio"
                name={`penalty-winner-${match.id}`}
                value={match.homeTeam.id}
                checked={canPickPenaltyWinner && draft.penaltyWinnerTeamId === match.homeTeam.id}
                onChange={(event) => updateDraft("penaltyWinnerTeamId", event.target.value)}
              />
              {match.homeTeam.flagEmoji} {match.homeTeam.code}
            </label>
            <label>
              <input
                type="radio"
                name={`penalty-winner-${match.id}`}
                value={match.awayTeam.id}
                checked={canPickPenaltyWinner && draft.penaltyWinnerTeamId === match.awayTeam.id}
                onChange={(event) => updateDraft("penaltyWinnerTeamId", event.target.value)}
              />
              {match.awayTeam.flagEmoji} {match.awayTeam.code}
            </label>
            {!canPickPenaltyWinner ? <small>Solo aplica en eliminacion con empate.</small> : null}
            {needsPenaltyWinner ? <small className="form-error">Elige quien gana por penales para guardar este empate.</small> : null}
          </fieldset>
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
            {playersError ? <small className="form-error">No pude cargar jugadores de {match.homeTeam.code}.</small> : null}
            {!isLoadingPlayers && homeCanHaveRoster && !playersError && homePlayers.length === 0 ? (
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
            {playersError ? <small className="form-error">No pude cargar jugadores de {match.awayTeam.code}.</small> : null}
            {!isLoadingPlayers && awayCanHaveRoster && !playersError && awayPlayers.length === 0 ? (
              <small className="field-note">No hay jugadores cargados para {match.awayTeam.code}.</small>
            ) : null}
          </label>
        </div>
        {isLocked ? <p className="empty-state">Ya no se puede modificar esta apuesta porque el partido comenzo.</p> : null}
        {mutation.isError ? <p className="form-error">No pude guardar esta apuesta.</p> : null}
        {mutation.isSuccess ? <p className="form-success">Apuesta guardada.</p> : null}
        <div className="card-actions">
          <Button disabled={!participantId || mutation.isPending || isLocked || needsPenaltyWinner}><Save size={16} /> {mutation.isPending ? "Guardando..." : "Guardar apuesta"}</Button>
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
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const availableMatches = allMatches.filter((match) => new Date(match.kickoffAt).getTime() >= startOfToday.getTime());
    return showAll ? availableMatches : availableMatches.slice(0, 12);
  }, [allMatches, showAll]);
  const visibleTeamIds = useMemo(
    () => [...new Set(
      upcomingMatches
        .flatMap((match) => [match.homeTeam, match.awayTeam])
        .filter(canHaveRoster)
        .map((team) => team.id)
    )].sort(),
    [upcomingMatches]
  );
  const visibleTeamKey = visibleTeamIds.join(",");
  const {
    data: visiblePlayers = [],
    error: visiblePlayersError,
    isLoading: isLoadingVisiblePlayers
  } = useQuery({
    queryKey: ["players-by-visible-teams", visibleTeamKey],
    queryFn: () => listPlayersByTeamIds(visibleTeamIds),
    enabled: visibleTeamIds.length > 0,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000
  });
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
          players={visiblePlayers}
          isLoadingPlayers={isLoadingVisiblePlayers}
          playersError={visiblePlayersError}
          participantId={activeParticipant?.id}
          storedPrediction={storedPredictions[match.id]}
        />
      ))}
    </div>
  );
}
