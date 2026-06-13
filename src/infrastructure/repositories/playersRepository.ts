import { Player, PlayerPosition } from "@/shared/types/worldcup";
import { supabase } from "@/infrastructure/supabase/client";

type PlayerRow = {
  id: string;
  team_id: string;
  full_name: string;
  position: PlayerPosition;
  shirt_number: number | null;
  photo_url: string | null;
};

export async function listPlayersByTeamIds(teamIds: string[]): Promise<Player[]> {
  const uniqueTeamIds = [...new Set(teamIds)].filter(Boolean);
  if (!supabase || uniqueTeamIds.length === 0) return [];

  const { data, error } = await supabase
    .from("players")
    .select("id, team_id, full_name, position, shirt_number, photo_url")
    .in("team_id", uniqueTeamIds)
    .eq("is_active", true)
    .order("team_id", { ascending: true })
    .order("shirt_number", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as PlayerRow[]).map((row) => ({
    id: row.id,
    teamId: row.team_id,
    fullName: row.full_name,
    position: row.position,
    shirtNumber: row.shirt_number ?? undefined,
    photoUrl: row.photo_url ?? undefined
  }));
}

export async function listPlayersByIds(playerIds: string[]): Promise<Player[]> {
  const uniquePlayerIds = [...new Set(playerIds)].filter(Boolean);
  if (!supabase || uniquePlayerIds.length === 0) return [];

  const { data, error } = await supabase
    .from("players")
    .select("id, team_id, full_name, position, shirt_number, photo_url")
    .in("id", uniquePlayerIds);

  if (error) throw error;

  return ((data ?? []) as PlayerRow[]).map((row) => ({
    id: row.id,
    teamId: row.team_id,
    fullName: row.full_name,
    position: row.position,
    shirtNumber: row.shirt_number ?? undefined,
    photoUrl: row.photo_url ?? undefined
  }));
}
