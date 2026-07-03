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
      if (event === "SIGNED_IN" && session?.user) {
        void useSkillStore.getState().migrateGuestDataToSupabase(session.user.id);
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
