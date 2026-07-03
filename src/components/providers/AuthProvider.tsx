"use client";

import { useEffect, type ReactNode } from "react";

import { useSkillStore } from "@/stores/useSkillStore";
import { createClient } from "@/utils/supabase/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // `INITIAL_SESSION` fires once on mount for an already-signed-in
      // user (e.g. page reload) - it is distinct from `SIGNED_IN`, which
      // only fires on a fresh sign-in. Handle both so a returning user's
      // progress is always pulled from Supabase, not left empty.
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        const userId = session.user.id;
        void (async () => {
          if (event === "SIGNED_IN") {
            await useSkillStore.getState().migrateGuestDataToSupabase(userId);
          }
          await useSkillStore.getState().hydrateFromSupabase(userId);
        })();
      }

      if (event === "SIGNED_OUT") {
        useSkillStore.getState().resetGuestState();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
