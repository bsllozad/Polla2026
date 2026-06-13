import { supabase } from "@/infrastructure/supabase/client";

type GoalRow = {
  player_id: string | null;
};

type PlayerRow = {
  id: string;
  team_id: string;
  full_name: string;
  shirt_number: number | null;
  team: {
    code: string;
    flag_emoji: string | null;
  } | null;
};

export type TopScorerRow = {
  playerId: string;
  fullName: string;
  teamCode: string;
  flagEmoji: string;
  shirtNumber?: number;
  goals: number;
};

export async function listWorldCupTopScorers(limit = 5): Promise<TopScorerRow[]> {
  if (!supabase) return [];

  const { data: goals, error: goalsError } = await supabase
    .from("goals")
    .select("player_id")
    .not("player_id", "is", null);

  if (goalsError) throw goalsError;

  const goalsByPlayer = ((goals ?? []) as GoalRow[]).reduce<Record<string, number>>((acc, goal) => {
    if (!goal.player_id) return acc;
    acc[goal.player_id] = (acc[goal.player_id] ?? 0) + 1;
    return acc;
  }, {});
  const playerIds = Object.keys(goalsByPlayer);

  if (playerIds.length === 0) return [];

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, team_id, full_name, shirt_number, team:team_id(code, flag_emoji)")
    .in("id", playerIds);

  if (playersError) throw playersError;

  return ((players ?? []) as unknown as PlayerRow[])
    .map((player) => ({
      playerId: player.id,
      fullName: player.full_name,
      teamCode: player.team?.code ?? "",
      flagEmoji: player.team?.flag_emoji ?? "",
      shirtNumber: player.shirt_number ?? undefined,
      goals: goalsByPlayer[player.id] ?? 0
    }))
    .sort((a, b) => b.goals - a.goals || a.fullName.localeCompare(b.fullName))
    .slice(0, limit);
}
