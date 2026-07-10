"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./client";
import { isSupabaseConfigured } from "./config";

export interface AuthState {
  user: User | null;
  /** trueの間はセッション確認中(初期ロード時のちらつき防止用)。 */
  loading: boolean;
}

/** 現在のログイン状態を購読するクライアント専用フック。 */
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    // Supabase未設定(セットアップ中)は「未ログイン」として扱い、アプリを止めない。
    if (!isSupabaseConfigured()) {
      setState({ user: null, loading: false });
      return;
    }

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setState({ user: data.user, loading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
