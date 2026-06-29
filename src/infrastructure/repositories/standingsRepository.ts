import { calculatePredictionScore } from "@/domain/scoring/matchScoring";
import { supabase } from "@/infrastructure/supabase/client";
import { listParticipants } from "@/infrastructure/repositories/participantsRepository";
import { listPlayersByIds } from "@/infrastructure/repositories/playersRepository";
import { MatchResult, Player, Prediction } from "@/shared/types/worldcup";

export type StandingRow = {
  participantId: string;
  displayName: string;
  points: number;
};

type PredictionRow = {
  participant_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  penalty_winner_team_id: string | null;
  home_scorer_id: string | null;
  away_scorer_id: string | null;
  created_at: string;
};

type ResultRow = {
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  penalty_winner_team_id: string | null;
  status: "finished" | "invalid";
};

type GoalRow = {
  match_id: string;
  player_id: string | null;
  own_goal_player_id: string | null;
};

type ColombiaBetRow = {
  participant_id: string;
  question_key: string;
  answer_text: string | null;
  selected_team_id: string | null;
  selected_player_id: string | null;
  numeric_answer: number | null;
};

type ColombiaAnswerRow = {
  question_key: string;
  answer_text: string | null;
  selected_team_id: string | null;
  selected_player_id: string | null;
  numeric_answer: number | null;
  points: number;
  is_closed?: boolean;
};

function normalizeAnswer(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function officialAnswerHasValue(answer: ColombiaAnswerRow) {
  return Boolean(answer.is_closed && (answer.answer_text || answer.selected_team_id || answer.selected_player_id || answer.numeric_answer !== null));
}

function isCorrectColombiaAnswer(bet: ColombiaBetRow, answer: ColombiaAnswerRow) {
  if (!officialAnswerHasValue(answer)) return false;

  if (answer.selected_player_id) {
    return bet.selected_player_id === answer.selected_player_id || normalizeAnswer(bet.answer_text) === normalizeAnswer(answer.answer_text);
  }

  if (answer.selected_team_id) {
    return bet.selected_team_id === answer.selected_team_id;
  }

  if (answer.numeric_answer !== null) {
    return bet.numeric_answer === answer.numeric_answer;
  }

  return normalizeAnswer(bet.answer_text) === normalizeAnswer(answer.answer_text);
}

export async function listMatchStandings(): Promise<StandingRow[]> {
  const participants = await listParticipants();
  const baseRows = participants.map((participant) => ({
    participantId: participant.id,
    displayName: participant.displayName,
    points: 0
  }));

  if (!supabase || participants.length === 0) return baseRows;

  const [{ data: predictions, error: predictionsError }, { data: results, error: resultsError }, { data: goals, error: goalsError }] =
    await Promise.all([
      supabase.from("predictions").select("participant_id, match_id, home_score, away_score, penalty_winner_team_id, home_scorer_id, away_scorer_id, created_at"),
      supabase.from("match_results").select("match_id, home_score, away_score, penalty_winner_team_id, status"),
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
        penaltyWinnerTeamId: result.penalty_winner_team_id ?? undefined,
        scorerIds: goalsByMatch[result.match_id] ?? [],
        status: result.status
      }
    ])
  );
  const pointsByParticipant = new Map(baseRows.map((row) => [row.participantId, 0]));

  for (const row of (predictions ?? []) as PredictionRow[]) {
    const result = resultsByMatch.get(row.match_id);
    if (!result) continue;

    const prediction: Prediction = {
      participantId: row.participant_id,
      matchId: row.match_id,
      homeScore: row.home_score,
      awayScore: row.away_score,
      penaltyWinnerTeamId: row.penalty_winner_team_id ?? undefined,
      homeScorerId: row.home_scorer_id ?? undefined,
      awayScorerId: row.away_scorer_id ?? undefined,
      createdAt: row.created_at
    };
    const score = calculatePredictionScore(prediction, result, playersById);
    pointsByParticipant.set(row.participant_id, (pointsByParticipant.get(row.participant_id) ?? 0) + score.total);
  }

  return baseRows
    .map((row) => ({ ...row, points: pointsByParticipant.get(row.participantId) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
}

export async function listColombiaStandings(): Promise<StandingRow[]> {
  const participants = await listParticipants();
  const baseRows = participants.map((participant) => ({
    participantId: participant.id,
    displayName: participant.displayName,
    points: 0
  }));

  if (!supabase || participants.length === 0) return baseRows;

  const [
    { data: bets, error: betsError },
    { data: answers, error: answersError }
  ] = await Promise.all([
    supabase.from("colombia_bets").select("participant_id, question_key, answer_text, selected_team_id, selected_player_id, numeric_answer"),
    supabase.from("colombia_answers").select("question_key, answer_text, selected_team_id, selected_player_id, numeric_answer, points, is_closed")
  ]);

  if (betsError) throw betsError;
  if (answersError) throw answersError;

  const answersByQuestion = new Map<string, ColombiaAnswerRow>(
    ((answers ?? []) as ColombiaAnswerRow[]).map((answer) => [answer.question_key, answer])
  );

  const pointsByParticipant = new Map(baseRows.map((row) => [row.participantId, 0]));

  for (const bet of (bets ?? []) as ColombiaBetRow[]) {
    const answer = answersByQuestion.get(bet.question_key);
    if (!answer || !isCorrectColombiaAnswer(bet, answer)) continue;

    pointsByParticipant.set(bet.participant_id, (pointsByParticipant.get(bet.participant_id) ?? 0) + answer.points);
  }

  return baseRows
    .map((row) => ({ ...row, points: pointsByParticipant.get(row.participantId) ?? 0 }))
    .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
}
