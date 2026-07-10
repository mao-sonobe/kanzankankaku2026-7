/** Supabaseの接続情報が.env.localに設定済みかどうか(セットアップ中は未設定のことがある)。 */
export function isSupabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
