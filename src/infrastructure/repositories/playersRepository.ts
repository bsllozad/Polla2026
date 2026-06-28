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

function toPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    teamId: row.team_id,
    fullName: row.full_name,
    position: row.position,
    shirtNumber: row.shirt_number ?? undefined,
    photoUrl: row.photo_url ?? undefined
  };
}

export async function listPlayersByTeamIds(teamIds: string[]): Promise<Player[]> {
  const uniqueTeamIds = [...new Set(teamIds)].filter(Boolean);
  if (!supabase || uniqueTeamIds.length === 0) return [];

  const rows: PlayerRow[] = [];
  const chunkSize = 20;
  const pageSize = 1000;
  for (let index = 0; index < uniqueTeamIds.length; index += chunkSize) {
    const chunk = uniqueTeamIds.slice(index, index + chunkSize);
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("players")
        .select("id, team_id, full_name, position, shirt_number, photo_url")
        .in("team_id", chunk)
        .eq("is_active", true)
        .order("team_id", { ascending: true })
        .order("shirt_number", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const pageRows = (data ?? []) as PlayerRow[];
      rows.push(...pageRows);
      if (pageRows.length < pageSize) break;
    }
  }

  return rows
    .filter((row, index, array) => array.findIndex((item) => item.id === row.id) === index)
    .map(toPlayer);
}

export async function listPlayersByTeamId(teamId: string): Promise<Player[]> {
  if (!supabase || !teamId) return [];

  const { data, error } = await supabase
    .from("players")
    .select("id, team_id, full_name, position, shirt_number, photo_url")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("shirt_number", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as PlayerRow[]).map(toPlayer);
}

export async function listPlayersByIds(playerIds: string[]): Promise<Player[]> {
  const uniquePlayerIds = [...new Set(playerIds)].filter(Boolean);
  if (!supabase || uniquePlayerIds.length === 0) return [];

  const rows: PlayerRow[] = [];
  const chunkSize = 500;
  for (let index = 0; index < uniquePlayerIds.length; index += chunkSize) {
    const chunk = uniquePlayerIds.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from("players")
      .select("id, team_id, full_name, position, shirt_number, photo_url")
      .in("id", chunk);

    if (error) throw error;
    rows.push(...((data ?? []) as PlayerRow[]));
  }

  return rows.map(toPlayer);
}
