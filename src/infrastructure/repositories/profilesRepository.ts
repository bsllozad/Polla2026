import { supabase } from "@/infrastructure/supabase/client";

export type AppRole = "superadmin" | "viewer";

export type CurrentUserProfile = {
  id: string;
  email: string;
  role: AppRole;
};

type ProfileRow = {
  id: string;
  email: string;
  role: AppRole;
};

export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return {
      id: userData.user.id,
      email: userData.user.email ?? "",
      role: "superadmin"
    };
  }

  const row = data as ProfileRow;
  return {
    id: row.id,
    email: row.email,
    role: row.role
  };
}
