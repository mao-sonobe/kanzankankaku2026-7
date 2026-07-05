import { NextRequest, NextResponse } from "next/server";

// ブラウザから直接Ollamaへ疎通確認するとCORSで弾かれる場合があるため、
// Next.jsのRoute Handler経由でサーバーサイドから中継する。
export async function POST(req: NextRequest) {
  const { endpoint } = await req.json();
  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json({ ok: false, error: "endpointが指定されていません" }, { status: 400 });
  }

  try {
    const res = await fetch(`${endpoint.replace(/\/$/, "")}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Ollamaがステータス${res.status}を返しました` },
        { status: 200 }
      );
    }
    const data = await res.json();
    const models: string[] = Array.isArray(data.models)
      ? data.models.map((m: { name: string }) => m.name)
      : [];
    return NextResponse.json({ ok: true, models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "接続に失敗しました";
    return NextResponse.json(
      { ok: false, error: `Ollamaに接続できません: ${message}` },
      { status: 200 }
    );
  }
}
