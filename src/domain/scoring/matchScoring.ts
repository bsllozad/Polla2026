import { MatchResult, Player, Prediction } from "@/shared/types/worldcup";

export type ScoreBreakdown = {
  matchPoints: number;
  penaltyBonus: number;
  scorerBonus: number;
  total: number;
  label: string;
};

const scorerBonusByPosition: Record<Player["position"], number> = {
  goalkeeper: 20,
  defender: 15,
  holding_midfielder: 10,
  attacking_midfielder: 5,
  forward: 3
};

function sign(value: number) {
  return value === 0 ? 0 : value > 0 ? 1 : -1;
}

export function calculateMatchPoints(prediction: Prediction, result: MatchResult): number {
  if (result.status === "invalid") return 0;

  const exactScore = prediction.homeScore === result.homeScore && prediction.awayScore === result.awayScore;
  const predictedOutcome = sign(prediction.homeScore - prediction.awayScore);
  const realOutcome = sign(result.homeScore - result.awayScore);
  const correctOutcome = predictedOutcome === realOutcome;

  if (!correctOutcome) return 0;
  if (exactScore) return 5;

  if (realOutcome === 0) {
    const homeDistance = Math.abs(prediction.homeScore - result.homeScore);
    const awayDistance = Math.abs(prediction.awayScore - result.awayScore);
    return homeDistance === 1 && awayDistance === 1 ? 3 : 2;
  }

  const totalDistance = Math.abs(prediction.homeScore - result.homeScore) + Math.abs(prediction.awayScore - result.awayScore);
  return totalDistance === 1 ? 3 : 1;
}

export function calculateScorerBonus(prediction: Prediction, result: MatchResult, playersById: Map<string, Player>): number {
  if (result.status === "invalid") return 0;
  const selectedScorers = [prediction.homeScorerId, prediction.awayScorerId].filter(Boolean) as string[];

  return selectedScorers.reduce((total, playerId) => {
    if (!result.scorerIds.includes(playerId)) return total;
    const player = playersById.get(playerId);
    return player ? total + scorerBonusByPosition[player.position] : total;
  }, 0);
}

export function calculatePenaltyBonus(prediction: Prediction, result: MatchResult): number {
  if (result.status === "invalid") return 0;
  if (prediction.homeScore !== prediction.awayScore || result.homeScore !== result.awayScore) return 0;
  if (!prediction.penaltyWinnerTeamId || !result.penaltyWinnerTeamId) return 0;
  return prediction.penaltyWinnerTeamId === result.penaltyWinnerTeamId ? 2 : 0;
}

export function calculatePredictionScore(
  prediction: Prediction,
  result: MatchResult,
  playersById: Map<string, Player>
): ScoreBreakdown {
  const matchPoints = calculateMatchPoints(prediction, result);
  const penaltyBonus = calculatePenaltyBonus(prediction, result);
  const scorerBonus = calculateScorerBonus(prediction, result, playersById);
  return {
    matchPoints,
    penaltyBonus,
    scorerBonus,
    total: matchPoints + penaltyBonus + scorerBonus,
    label: result.status === "invalid" ? "Partido invalidado" : "Puntaje calculado"
  };
}
