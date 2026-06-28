import { Match, MatchStage, MatchStatus, Team } from "@/shared/types/worldcup";
import { supabase } from "@/infrastructure/supabase/client";

type TeamRow = {
  id: string;
  name: string;
  code: string;
  flag_emoji: string | null;
  group_name: string | null;
};

type MatchRow = {
  id: string;
  fifa_match_no: number | null;
  stage: MatchStage;
  kickoff_at: string;
  venue: string | null;
  status: MatchStatus;
  home_team: TeamRow | null;
  away_team: TeamRow | null;
  home_slot: string | null;
  away_slot: string | null;
};

function toTeam(row: TeamRow | null, slot: string | null): Team {
  if (row) {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      flagEmoji: row.flag_emoji ?? "",
      groupName: row.group_name ?? undefined
    };
  }

  return {
    id: slot ?? "pending",
    name: slot ?? "Por definir",
    code: slot ?? "TBD",
    flagEmoji: "🏆"
  };
}

export async function listUpcomingMatches(limit = 8): Promise<Match[]> {
  return listMatches({ limit });
}

export async function listMatches({ limit = 8, showAll = false }: { limit?: number; showAll?: boolean } = {}): Promise<Match[]> {
  if (!supabase) return [];

  let query = supabase
    .from("matches")
    .select(`
      id,
      fifa_match_no,
      stage,
      kickoff_at,
      venue,
      status,
      home_slot,
      away_slot,
      home_team:home_team_id(id, name, code, flag_emoji, group_name),
      away_team:away_team_id(id, name, code, flag_emoji, group_name)
    `)
    .order("kickoff_at", { ascending: true });

  if (!showAll) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    query = query.gte("kickoff_at", startOfToday.toISOString());
  }

  const { data, error } = await query.limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as MatchRow[]).map((row) => ({
    id: row.id,
    fifaMatchNo: row.fifa_match_no ?? undefined,
    stage: row.stage,
    kickoffAt: row.kickoff_at,
    venue: row.venue ?? undefined,
    status: row.status,
    homeTeam: toTeam(row.home_team, row.home_slot),
    awayTeam: toTeam(row.away_team, row.away_slot),
    homeSlot: row.home_slot ?? undefined,
    awaySlot: row.away_slot ?? undefined
  }));
}
