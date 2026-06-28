import { Minus, Plus, Save, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { listMatches } from "@/infrastructure/repositories/matchesRepository";
import { listPlayersByTeamIds } from "@/infrastructure/repositories/playersRepository";
import { getMatchResult, saveMatchResult } from "@/infrastructure/repositories/resultsRepository";
import { Match, Player, Team } from "@/shared/types/worldcup";

const positionOrder = ["forward", "attacking_midfielder", "holding_midfielder", "defender", "goalkeeper"];

type GoalCounter = {
  key: string;
  teamId: string;
  playerId?: string;
  ownGoalPlayerId?: string;
  count: number;
};

function orderedTeamPlayers(players: Player[], teamId: string) {
  return players
    .filter((player) => player.teamId === teamId)
    .sort((a, b) => {
      const positionDiff = positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
      return positionDiff || (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99);
    });
}

function ScoreBox({ team, score, onMinus, onPlus }: { team: Team; score: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <div>
      <span>{team.flagEmoji} {team.code}</span>
      <strong>{score}</strong>
      <div className="icon-actions">
        <Button type="button" variant="secondary" onClick={onMinus}><Minus size={16} /></Button>
        <Button type="button" variant="secondary" onClick={onPlus}><Plus size={16} /></Button>
      </div>
    </div>
  );
}

function PlayerGoalColumn({
  title,
  players,
  counters,
  onIncrement,
  onDecrement
}: {
  title: string;
  players: Player[];
  counters: GoalCounter[];
  onIncrement: (counter: GoalCounter) => void;
  onDecrement: (counter: GoalCounter) => void;
}) {
  return (
    <section className="goal-column">
      <h3>{title}</h3>
      {players.map((player) => {
        const counter = counters.find((item) => item.key === player.id);
        return (
          <div className="player-goal-button" key={player.id}>
            <span>{player.shirtNumber ?? "-"} · {player.fullName}</span>
            <small>{player.position}</small>
            <div className="mini-stepper">
              <Button type="button" variant="secondary" onClick={() => counter && onDecrement(counter)}><Minus size={14} /></Button>
              <strong>{counter?.count ?? 0}</strong>
              <Button type="button" variant="secondary" onClick={() => counter && onIncrement(counter)}><Plus size={14} /></Button>
            </div>
          </div>
        );
      })}
      {counters.filter((counter) => !counter.playerId).map((counter) => (
        <div className="player-goal-button own-goal" key={counter.key}>
          <span>Autogol</span>
          <small>Gol a favor de este equipo</small>
          <div className="mini-stepper">
            <Button type="button" variant="secondary" onClick={() => onDecrement(counter)}><Minus size={14} /></Button>
            <strong>{counter.count}</strong>
            <Button type="button" variant="secondary" onClick={() => onIncrement(counter)}><Plus size={14} /></Button>
          </div>
        </div>
      ))}
    </section>
  );
}

export function AdminResultsPage() {
  const queryClient = useQueryClient();
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [goalCounters, setGoalCounters] = useState<Record<string, GoalCounter>>({});
  const { data: matches = [] } = useQuery({
    queryKey: ["admin-result-matches", showAll],
    queryFn: () => listMatches({ limit: 104, showAll })
  });
  const orderedMatches = useMemo(
    () => [...matches].sort((left, right) => new Date(right.kickoffAt).getTime() - new Date(left.kickoffAt).getTime()),
    [matches]
  );
  const match = orderedMatches.find((item) => item.id === selectedMatchId) ?? orderedMatches[0];
  const { data: storedResult } = useQuery({
    queryKey: ["match-result", match?.id],
    queryFn: () => getMatchResult(match?.id),
    enabled: Boolean(match?.id)
  });
  const { data: players = [] } = useQuery({
    queryKey: ["admin-players", match?.homeTeam.id, match?.awayTeam.id],
    queryFn: () => listPlayersByTeamIds(match ? [match.homeTeam.id, match.awayTeam.id] : []),
    enabled: Boolean(match)
  });
  const mutation = useMutation({
    mutationFn: (status: "finished" | "invalid") =>
      saveMatchResult({
        matchId: match?.id ?? "",
        homeScore,
        awayScore,
        status,
        goals: Object.values(goalCounters).flatMap((counter) =>
          Array.from({ length: counter.count }, () => ({
            teamId: counter.teamId,
            playerId: counter.playerId,
            ownGoalPlayerId: counter.ownGoalPlayerId
          }))
        )
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match-result", match?.id] });
      queryClient.invalidateQueries({ queryKey: ["match-standings"] });
      queryClient.invalidateQueries({ queryKey: ["colombia-standings"] });
      queryClient.invalidateQueries({ queryKey: ["world-cup-top-scorers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-bracket-matches"] });
      queryClient.invalidateQueries({ queryKey: ["tournament-bracket"] });
      queryClient.invalidateQueries({ queryKey: ["prediction-matches"] });
    }
  });

  useEffect(() => {
    if (!storedResult || !match) {
      setHomeScore(0);
      setAwayScore(0);
      setGoalCounters({});
      return;
    }

    setHomeScore(storedResult.homeScore);
    setAwayScore(storedResult.awayScore);
    const nextCounters = storedResult.goals.reduce<Record<string, GoalCounter>>((acc, goal) => {
      const key = goal.playerId ?? `${goal.teamId}:own-goal`;
      const existing = acc[key];
      acc[key] = {
        key,
        teamId: goal.teamId,
        playerId: goal.playerId,
        ownGoalPlayerId: goal.ownGoalPlayerId,
        count: (existing?.count ?? 0) + 1
      };
      return acc;
    }, {});
    setGoalCounters(nextCounters);
  }, [storedResult, match?.id]);

  useEffect(() => {
    if (orderedMatches.length === 0 || orderedMatches.some((item) => item.id === selectedMatchId)) return;

    const now = Date.now();
    const pastPending = orderedMatches.find((item) => new Date(item.kickoffAt).getTime() <= now && item.status !== "finished" && item.status !== "invalid");
    const nextMatch = [...orderedMatches]
      .reverse()
      .find((item) => new Date(item.kickoffAt).getTime() > now && item.status !== "finished" && item.status !== "invalid");
    const lastFinished = orderedMatches.find((item) => item.status === "finished");

    setSelectedMatchId((pastPending ?? nextMatch ?? lastFinished ?? orderedMatches[0]).id);
  }, [orderedMatches, selectedMatchId]);

  const counters = useMemo(() => {
    if (!match) return [];
    const playerCounters = players.map((player): GoalCounter => ({
      key: player.id,
      teamId: player.teamId,
      playerId: player.id,
      count: goalCounters[player.id]?.count ?? 0
    }));

    const ownGoalCounters: GoalCounter[] = [
      {
        key: `${match.homeTeam.id}:own-goal`,
        teamId: match.homeTeam.id,
        count: goalCounters[`${match.homeTeam.id}:own-goal`]?.count ?? 0
      },
      {
        key: `${match.awayTeam.id}:own-goal`,
        teamId: match.awayTeam.id,
        count: goalCounters[`${match.awayTeam.id}:own-goal`]?.count ?? 0
      }
    ];

    return [...playerCounters, ...ownGoalCounters];
  }, [goalCounters, match, players]);

  function resetForMatch(matchId: string) {
    setSelectedMatchId(matchId);
    setHomeScore(0);
    setAwayScore(0);
    setGoalCounters({});
  }

  function updateCounter(counter: GoalCounter, direction: 1 | -1) {
    setGoalCounters((current) => {
      const existing = current[counter.key] ?? counter;
      const nextCount = Math.max(0, existing.count + direction);
      return {
        ...current,
        [counter.key]: { ...existing, count: nextCount }
      };
    });
  }

  if (!match) {
    return (
      <div className="stack">
        <div className="page-title">
          <p className="eyebrow">Solo superadmin</p>
          <h2>Registrar resultado real</h2>
        </div>
        <p className="empty-state">No hay partidos cargados para administrar.</p>
      </div>
    );
  }

  const homePlayers = orderedTeamPlayers(players, match.homeTeam.id);
  const awayPlayers = orderedTeamPlayers(players, match.awayTeam.id);
  const homeCounters = counters.filter((counter) => counter.teamId === match.homeTeam.id);
  const awayCounters = counters.filter((counter) => counter.teamId === match.awayTeam.id);

  return (
    <div className="stack">
      <div className="page-title">
        <p className="eyebrow">Solo superadmin</p>
        <h2>Registrar resultado real</h2>
        <Button type="button" variant="secondary" onClick={() => setShowAll((value) => !value)}>
          {showAll ? "Ver proximos" : "Ver todos"}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Partido</CardTitle>
          <select value={match.id} onChange={(event) => resetForMatch(event.target.value)}>
            {orderedMatches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.homeTeam.code} vs {item.awayTeam.code} · {new Date(item.kickoffAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </CardHeader>
        <h2 className="match-heading">{match.homeTeam.flagEmoji} {match.homeTeam.name} vs {match.awayTeam.flagEmoji} {match.awayTeam.name}</h2>
        <div className="score-editor">
          <ScoreBox team={match.homeTeam} score={homeScore} onMinus={() => setHomeScore((value) => Math.max(0, value - 1))} onPlus={() => setHomeScore((value) => value + 1)} />
          <ScoreBox team={match.awayTeam} score={awayScore} onMinus={() => setAwayScore((value) => Math.max(0, value - 1))} onPlus={() => setAwayScore((value) => value + 1)} />
        </div>
        <div className="goal-columns">
          <PlayerGoalColumn title={`${match.homeTeam.code} goleadores`} players={homePlayers} counters={homeCounters} onIncrement={(counter) => updateCounter(counter, 1)} onDecrement={(counter) => updateCounter(counter, -1)} />
          <PlayerGoalColumn title={`${match.awayTeam.code} goleadores`} players={awayPlayers} counters={awayCounters} onIncrement={(counter) => updateCounter(counter, 1)} onDecrement={(counter) => updateCounter(counter, -1)} />
        </div>
        {mutation.isError ? <p className="form-error">No pude guardar el resultado.</p> : null}
        {mutation.isSuccess ? <p className="form-success">Resultado guardado.</p> : null}
        <div className="card-actions split-actions">
          <Button type="button" variant="danger" onClick={() => mutation.mutate("invalid")}><ShieldAlert size={16} /> Invalidar partido</Button>
          <Button type="button" onClick={() => mutation.mutate("finished")} disabled={mutation.isPending}><Save size={16} /> {mutation.isPending ? "Guardando..." : "Guardar resultado"}</Button>
        </div>
      </Card>
    </div>
  );
}
