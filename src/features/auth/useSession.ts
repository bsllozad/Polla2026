import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/infrastructure/supabase/client";

type SessionState = {
  session: Session | null;
  isLoading: boolean;
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });

  useEffect(() => {
    if (!supabase) {
      setState({ session: null, isLoading: false });
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, isLoading: false });
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, isLoading: false });
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return state;
}
