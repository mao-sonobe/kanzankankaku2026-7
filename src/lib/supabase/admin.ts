import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * service_role(secret)キーを使う管理者クライアント。
 * RLSを無視できる強い権限を持つため、サーバー(Route Handler)からのみ使うこと。
 * 絶対にクライアントコンポーネントやレスポンスに露出させない。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEYが設定されていません。.env.localに設定してから再起動してください。"
    );
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
