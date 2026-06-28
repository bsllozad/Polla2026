import { supabase } from "@/infrastructure/supabase/client";
import { advanceKnockoutSlots } from "@/infrastructure/repositories/bracketRepository";

export type GoalInput = {
  teamId: string;
  playerId?: string;
  ownGoalPlayerId?: string;
};

export type MatchResultInput = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  status: "finished" | "invalid";
  goals: GoalInput[];
};

export type StoredMatchResult = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  status: "finished" | "invalid";
  goals: GoalInput[];
};

type ResultRow = {
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  status: "finished" | "invalid";
};

type GoalRow = {
  team_id: string;
  player_id: string | null;
  own_goal_player_id: string | null;
};

export async function getMatchResult(matchId?: string): Promise<StoredMatchResult | null> {
  if (!supabase || !matchId) return null;

  const { data: result, error: resultError } = await supabase
    .from("match_results")
    .select("match_id, home_score, away_score, status")
    .eq("match_id", matchId)
    .maybeSingle();

  if (resultError) throw resultError;

  if (!result) return null;

  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("team_id, player_id, own_goal_player_id")
    .eq("match_id", matchId);

  if (goalsError) throw goalsError;

  const row = result as ResultRow;
  return {
    matchId: row.match_id,
    homeScore: row.home_score ?? 0,
    awayScore: row.away_score ?? 0,
    status: row.status,
    goals: ((goals ?? []) as GoalRow[]).map((goal) => ({
      teamId: goal.team_id,
      playerId: goal.player_id ?? undefined,
      ownGoalPlayerId: goal.own_goal_player_id ?? undefined
    }))
  };
}

export async function saveMatchResult(input: MatchResultInput): Promise<void> {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { error: resultError } = await supabase.from("match_results").upsert(
    {
      match_id: input.matchId,
      home_score: input.status === "invalid" ? null : input.homeScore,
      away_score: input.status === "invalid" ? null : input.awayScore,
      status: input.status,
      updated_at: new Date().toISOString()
    },
    { onConflict: "match_id" }
  );

  if (resultError) throw resultError;

  const { error: matchStatusError } = await supabase
    .from("matches")
    .update({ status: input.status })
    .eq("id", input.matchId);

  if (matchStatusError) throw matchStatusError;

  const { error: deleteError } = await supabase.from("goals").delete().eq("match_id", input.matchId);
  if (deleteError) throw deleteError;

  await advanceKnockoutSlots(input.matchId, input.status, input.homeScore, input.awayScore);

  const validGoals = input.goals.filter((goal) => goal.playerId || goal.ownGoalPlayerId);
  if (input.status === "invalid" || validGoals.length === 0) return;

  const { error: goalsError } = await supabase.from("goals").insert(
    validGoals.map((goal) => ({
      match_id: input.matchId,
      team_id: goal.teamId,
      player_id: goal.playerId ?? null,
      own_goal_player_id: goal.ownGoalPlayerId ?? null
    }))
  );

  if (goalsError) throw goalsError;
}
