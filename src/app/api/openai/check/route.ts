import { NextResponse } from "next/server";

// OpenAI(ChatGPT) APIへの疎通確認。
// APIキーがサーバー環境変数に設定されているか、実際にモデル一覧を取得できるかを確認する。
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEYが.env.localに設定されていません。" },
      { status: 200 }
    );
  }

  // OPENAI_BASE_URL 設定時はそのOpenAI互換エンドポイント(Qwen等)に対して疎通確認する。
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  try {
    const res = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `OpenAI APIがステータス${res.status}を返しました: ${text}` },
        { status: 200 }
      );
    }
    const data = await res.json();
    const models: string[] = Array.isArray(data.data)
      ? data.data.map((m: { id: string }) => m.id).sort()
      : [];
    return NextResponse.json({ ok: true, models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "接続に失敗しました";
    return NextResponse.json(
      { ok: false, error: `OpenAI APIに接続できません: ${message}` },
      { status: 200 }
    );
  }
}
