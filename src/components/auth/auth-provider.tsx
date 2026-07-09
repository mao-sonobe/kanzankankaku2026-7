"use client";

import { useEffect } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useHearingSync } from "@/hooks/use-hearing-sync";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);

  // ルート全体(/plan, /build, /learnをまたいで)で保持し続けるため、
  // ページごとのWorkspaceコンポーネントではなくここで呼ぶ。
  useHearingSync();

  useEffect(() => {
    // Supabase未設定時はログイン機能なし(ローカルのみ)として扱う。今まで通り使えることを優先する。
    if (!isSupabaseConfigured()) {
      setSession(null);
      return;
    }

    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));

    return () => subscription.unsubscribe();
  }, [setSession]);

  return children;
}
