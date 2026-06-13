import { Participant } from "@/shared/types/worldcup";
import { supabase } from "@/infrastructure/supabase/client";

type ParticipantRow = {
  id: string;
  display_name: string;
  user_id?: string | null;
  avatar_url: string | null;
  is_active: boolean;
};

export async function listParticipants(): Promise<Participant[]> {
  if (!supabase) return [];

  const query = supabase
    .from("participants")
    .select("id, display_name, user_id, avatar_url, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  let { data, error } = await query;
  let rows = data as ParticipantRow[] | null;

  if (error && error.message.toLowerCase().includes("user_id")) {
    const fallback = await supabase
      .from("participants")
      .select("id, display_name, avatar_url, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    rows = fallback.data as ParticipantRow[] | null;
    error = fallback.error;
  }

  if (error) throw error;

  return (rows ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    userId: row.user_id ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    isActive: row.is_active
  }));
}
