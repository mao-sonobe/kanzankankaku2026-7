import { createBrowserClient } from "@supabase/ssr";

/** `.env.local`にSupabaseの値が設定されているか(未設定でもアプリ全体がクラッシュしないようにするためのガード)。 */
export function isSupabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
