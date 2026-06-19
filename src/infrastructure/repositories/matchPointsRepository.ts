import { calculatePredictionScore } from "@/domain/scoring/matchScoring";
import { listMatches } from "@/infrastructure/repositories/matchesRepository";
import { listPlayersByIds } from "@/infrastructure/repositories/playersRepository";
import { supabase } from "@/infrastructure/supabase/client";
import { Match, MatchResult, Player, Prediction } from "@/shared/types/worldcup";

type PredictionRow = {
  participant_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  home_scorer_id: string | null;
  away_scorer_id: string | null;
  created_at: string;
};

type ResultRow = {
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  status: "finished" | "invalid";
};

type GoalRow = {
  match_id: string;
  player_id: string | null;
  own_goal_player_id: string | null;
};

export type MatchPointDetail = {
  match: Match;
  prediction?: Prediction;
  result: MatchResult;
  points: {
    matchPoints: number;
    scorerBonus: number;
    total: number;
  };
  selectedScorers: Player[];
  realScorers: Player[];
  reasons: string[];
};

const positionBonusLabels: Record<Player["position"], string> = {
  goalkeeper: "20 pts",
  defender: "15 pts",
  holding_midfielder: "10 pts",
  attacking_midfielder: "5 pts",
  forward: "3 pts"
};

function sign(value: number) {
  return value === 0 ? 0 : value > 0 ? 1 : -1;
}

function resultLabel(value: number) {
  if (value === 0) return "empate";
  return value > 0 ? "gana local" : "gana visitante";
}

function buildReasons(prediction: Prediction | undefined, result: MatchResult, playersById: Map<string, Player>) {
  if (!prediction) return ["No hay apuesta guardada para este partido."];
  if (result.status === "invalid") return ["Partido invalidado por el admin: no suma puntos."];

  const reasons: string[] = [];
  const predictedOutcome = sign(prediction.homeScore - prediction.awayScore);
  const realOutcome = sign(result.homeScore - result.awayScore);
  const exactScore = prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore;

  if (predictedOutcome !== realOutcome) {
    reasons.push(`Resultado distinto: apostaste ${resultLabel(predictedOutcome)} y fue ${resultLabel(realOutcome)}.`);
  } else if (exactScore) {
    reasons.push("Marcador exacto: 5 puntos.");
  } else if (realOutcome === 0) {
    const homeDistance = Math.abs(prediction.homeScore - result.homeScore);
    const awayDistance = Math.abs(prediction.awayScore - result.awayScore);
    reasons.push(homeDistance === 1 && awayDistance === 1 ? "Empate acertado y marcador cerca: 3 puntos." : "Empate acertado: 2 puntos.");
  } else {
    const totalDistance = Math.abs(prediction.homeScore - result.homeScore) + Math.abs(prediction.awayScore - result.awayScore);
    reasons.push(totalDistance === 1 ? "Ganador acertado y marcador cerca: 3 puntos." : "Ganador acertado: 1 punto.");
  }

  const selectedScorerIds = [prediction.homeScorerId, prediction.awayScorerId].filter(Boolean) as string[];
  const scorerHits = selectedScorerIds
    .filter((playerId) => result.scorerIds.includes(playerId))
    .map((playerId) => playersById.get(playerId))
    .filter(Boolean) as Player[];

  if (selectedScorerIds.length === 0) {
    reasons.push("No seleccionaste goleadores.");
  } else if (scorerHits.length === 0) {
    reasons.push("Tus goleadores seleccionados no anotaron.");
  } else {
    reasons.push(...scorerHits.map((player) => `${player.fullName} anoto: +${positionBonusLabels[player.position]}.`));
  }

  return reasons;
}

export async function listMatchPointDetails(participantId?: string): Promise<MatchPointDetail[]> {
  if (!supabase || !participantId) return [];

  const matches = await listMatches({ limit: 104, showAll: true });
  const [{ data: predictions, error: predictionsError }, { data: results, error: resultsError }, { data: goals, error: goalsError }] =
    await Promise.all([
      supabase
        .from("predictions")
        .select("participant_id, match_id, home_score, away_score, home_scorer_id, away_scorer_id, created_at")
        .eq("participant_id", participantId),
      supabase.from("match_results").select("match_id, home_score, away_score, status"),
      supabase.from("goals").select("match_id, player_id, own_goal_player_id")
    ]);

  if (predictionsError) throw predictionsError;
  if (resultsError) throw resultsError;
  if (goalsError) throw goalsError;

  const playerIds = [
    ...((predictions ?? []) as PredictionRow[]).flatMap((prediction) => [prediction.home_scorer_id, prediction.away_scorer_id]),
    ...((goals ?? []) as GoalRow[]).flatMap((goal) => [goal.player_id, goal.own_goal_player_id])
  ].filter(Boolean) as string[];
  const players = await listPlayersByIds(playerIds);
  const playersById = new Map<string, Player>(players.map((player) => [player.id, player]));
  const predictionsByMatch = new Map<string, Prediction>(
    ((predictions ?? []) as PredictionRow[]).map((prediction) => [
      prediction.match_id,
      {
        participantId: prediction.participant_id,
        matchId: prediction.match_id,
        homeScore: prediction.home_score,
        awayScore: prediction.away_score,
        homeScorerId: prediction.home_scorer_id ?? undefined,
        awayScorerId: prediction.away_scorer_id ?? undefined,
        createdAt: prediction.created_at
      }
    ])
  );
  const goalsByMatch = ((goals ?? []) as GoalRow[]).reduce<Record<string, string[]>>((acc, goal) => {
    const scorerId = goal.player_id ?? goal.own_goal_player_id;
    if (!scorerId) return acc;
    acc[goal.match_id] = [...(acc[goal.match_id] ?? []), scorerId];
    return acc;
  }, {});
  const resultsByMatch = new Map<string, MatchResult>(
    ((results ?? []) as ResultRow[]).map((result) => [
      result.match_id,
      {
        matchId: result.match_id,
        homeScore: result.home_score ?? 0,
        awayScore: result.away_score ?? 0,
        scorerIds: goalsByMatch[result.match_id] ?? [],
        status: result.status
      }
    ])
  );

  return matches
    .map((match): MatchPointDetail | null => {
      const result = resultsByMatch.get(match.id);
      if (!result) return null;

      const prediction = predictionsByMatch.get(match.id);
      const score = prediction ? calculatePredictionScore(prediction, result, playersById) : { matchPoints: 0, scorerBonus: 0, total: 0 };
      const selectedScorers = prediction
        ? ([prediction.homeScorerId, prediction.awayScorerId].filter(Boolean) as string[])
            .map((playerId) => playersById.get(playerId))
            .filter(Boolean) as Player[]
        : [];
      const realScorers = result.scorerIds.map((playerId) => playersById.get(playerId)).filter(Boolean) as Player[];

      return {
        match,
        prediction,
        result,
        points: {
          matchPoints: score.matchPoints,
          scorerBonus: score.scorerBonus,
          total: score.total
        },
        selectedScorers,
        realScorers,
        reasons: buildReasons(prediction, result, playersById)
      };
    })
    .filter((detail): detail is MatchPointDetail => detail !== null)
    .sort((a, b) => new Date(b.match.kickoffAt).getTime() - new Date(a.match.kickoffAt).getTime());
}
