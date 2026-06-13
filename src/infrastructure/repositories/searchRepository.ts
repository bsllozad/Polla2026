import { Player, PlayerPosition, Team } from "@/shared/types/worldcup";
import { supabase } from "@/infrastructure/supabase/client";

type SearchPlayerRow = {
  id: string;
  team_id: string;
  full_name: string;
  position: PlayerPosition;
  shirt_number: number | null;
  photo_url: string | null;
  teams: {
    code: string;
    name: string;
    flag_emoji: string | null;
  } | null;
};

type SearchTeamRow = {
  id: string;
  name: string;
  code: string;
  flag_emoji: string | null;
  group_name: string | null;
};

export type PlayerSearchOption = Player & {
  teamCode: string;
  teamName: string;
  label: string;
};

export type TeamSearchOption = Team & {
  label: string;
};

export async function searchPlayers(query: string, limit = 12): Promise<PlayerSearchOption[]> {
  if (!supabase || query.trim().length < 2) return [];

  const { data, error } = await supabase
    .from("players")
    .select("id, team_id, full_name, position, shirt_number, photo_url, teams:team_id(code, name, flag_emoji)")
    .eq("is_active", true)
    .ilike("full_name", `%${query.trim()}%`)
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as SearchPlayerRow[]).map((row) => ({
    id: row.id,
    teamId: row.team_id,
    fullName: row.full_name,
    position: row.position,
    shirtNumber: row.shirt_number ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    teamCode: row.teams?.code ?? "",
    teamName: row.teams?.name ?? "",
    label: `${row.shirt_number ? `${row.shirt_number} · ` : ""}${row.full_name} · ${row.teams?.code ?? ""}`
  }));
}

export async function searchTeams(query: string, limit = 12): Promise<TeamSearchOption[]> {
  if (!supabase || query.trim().length < 2) return [];

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, code, flag_emoji, group_name")
    .or(`name.ilike.%${query.trim()}%,code.ilike.%${query.trim()}%`)
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as SearchTeamRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    flagEmoji: row.flag_emoji ?? "",
    groupName: row.group_name ?? undefined,
    label: `${row.flag_emoji ?? ""} ${row.name} · ${row.code}`
  }));
}
