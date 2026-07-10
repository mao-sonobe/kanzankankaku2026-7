import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ログイン不要で見られるパス。それ以外は未ログイン時に/loginへリダイレクトする。
const PUBLIC_PATHS = ["/login", "/auth/callback"];

/**
 * リクエストごとにSupabaseセッションを更新し、未ログインユーザーを/loginへ誘導する。
 * Server ComponentはCookieを書き込めないため、この処理をmiddlewareで行う必要がある。
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabaseの接続情報が未設定の間(セットアップ中)はログイン機能自体を素通りさせ、
  // アプリ全体が真っ白にならないようにする。
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // トークンの検証(単なるCookie読み取りではなく、Supabase側に問い合わせて確認する)。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/plan";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
