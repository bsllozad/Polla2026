import { calculatePredictionScore } from "@/domain/scoring/matchScoring";
import { supabase } from "@/infrastructure/supabase/client";
import { listParticipants } from "@/infrastructure/repositories/participantsRepository";
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

type PlayerRow = {
  id: string;
  team_id: string;
  full_name: string;
  position: Player["position"];
  shirt_number: number | null;
  photo_url: string | null;
};

export async function listMatchStandings(): Promise<StandingRow[]> {
  const participants = await listParticipants();
  const baseRows = participants.map((participant) => ({
    participantId: participant.id,
    displayName: participant.displayName,
    points: 0
  }));

  if (!supabase || participants.length === 0) return baseRows;

  const [{ data: predictions, error: predictionsError }, { data: results, error: resultsError }, { data: goals, error: goalsError }, { data: players, error: playersError }] =
    await Promise.all([
      supabase.from("predictions").select("participant_id, match_id, home_score, away_score, home_scorer_id, away_scorer_id, created_at"),
      supabase.from("match_results").select("match_id, home_score, away_score, status"),
      supabase.from("goals").select("match_id, player_id, own_goal_player_id"),
      supabase.from("players").select("id, team_id, full_name, position, shirt_number, photo_url")
    ]);

  if (predictionsError) throw predictionsError;
  if (resultsError) throw resultsError;
  if (goalsError) throw goalsError;
  if (playersError) throw playersError;

  const playersById = new Map<string, Player>(
    ((players ?? []) as PlayerRow[]).map((player) => [
      player.id,
      {
        id: player.id,
        teamId: player.team_id,
        fullName: player.full_name,
        position: player.position,
        shirtNumber: player.shirt_number ?? undefined,
        photoUrl: player.photo_url ?? undefined
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
  const pointsByParticipant = new Map(baseRows.map((row) => [row.participantId, 0]));

  for (const row of (predictions ?? []) as PredictionRow[]) {
    const result = resultsByMatch.get(row.match_id);
    if (!result) continue;

    const prediction: Prediction = {
      participantId: row.participant_id,
      matchId: row.match_id,
      homeScore: row.home_score,
      awayScore: row.away_score,
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
  return participants.map((participant) => ({
    participantId: participant.id,
    displayName: participant.displayName,
    points: 0
  }));
}
