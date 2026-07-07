import { NextResponse } from "next/server";

// Gemini(Google Generative Language API)への疎通確認。
// APIキーがサーバー環境変数に設定されているか、実際にモデル一覧を取得できるかを確認する。
export async function POST() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GOOGLE_GENERATIVE_AI_API_KEYが.env.localに設定されていません。" },
      { status: 200 }
    );
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { method: "GET", signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Gemini APIがステータス${res.status}を返しました: ${text}` },
        { status: 200 }
      );
    }
    const data = await res.json();
    const models: string[] = Array.isArray(data.models)
      ? data.models.map((m: { name: string }) => m.name.replace(/^models\//, ""))
      : [];
    return NextResponse.json({ ok: true, models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "接続に失敗しました";
    return NextResponse.json(
      { ok: false, error: `Gemini APIに接続できません: ${message}` },
      { status: 200 }
    );
  }
}
