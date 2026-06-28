import { supabase } from "@/infrastructure/supabase/client";
import { Team } from "@/shared/types/worldcup";

type TeamRow = {
  id: string;
  name: string;
  code: string;
  flag_emoji: string | null;
  group_name: string | null;
};

export async function listTeams(): Promise<Team[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, code, flag_emoji, group_name")
    .order("code", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as TeamRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    flagEmoji: row.flag_emoji ?? "",
    groupName: row.group_name ?? undefined
  }));
}
