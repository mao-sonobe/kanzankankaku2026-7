import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * ログイン中の本人のアカウントのみ削除する。
 * user_idはリクエストボディからではなく、Cookieのセッションから取得したものだけを使う
 * (他人のアカウントを指定して消せてしまわないようにするため)。
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "ログインしていません" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "アカウントの削除に失敗しました" },
      { status: 500 }
    );
  }
}
