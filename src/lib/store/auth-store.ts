import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  /** 初回のgetSession()が完了したか(falseの間はローディング扱い) */
  initialized: boolean;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  initialized: false,
  setSession: (session) => set({ session, user: session?.user ?? null, initialized: true }),
}));
