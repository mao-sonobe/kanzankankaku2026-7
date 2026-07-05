import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { buildChunkedFile } from "@/lib/domain/chunk-code";
import { toFriendlyOllamaError } from "@/lib/ai/friendly-error";

const BLOCK_ROLES = [
  "state",
  "event-handler",
  "api-fetch",
  "jsx",
  "logic",
  "import",
  "style",
  "other",
] as const;

const blankSchema = z.object({
  text: z
    .string()
    .describe("元のコードから一字一句そのままコピーした、空欄にする箇所(5〜60文字程度)"),
  role: z.enum(BLOCK_ROLES),
  label: z.string().describe("この空欄が担う役割の短い日本語ラベル(例: 状態の初期化、増加処理)"),
  wrongAnswers: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("textと同程度の長さの、もっともらしいが誤ったコード片"),
});

const chunkCodeSchema = z.object({
  blanks: z
    .array(blankSchema)
    .min(2)
    .max(8)
    .describe("コード中の意味のある単位(状態管理・イベントハンドラ・JSX表示など)の空欄一覧"),
});

export async function POST(req: NextRequest) {
  const { endpoint, model, file } = await req.json();
  const path: string = file?.path ?? "";
  const content: string = file?.content ?? "";

  const provider = createOpenAICompatible({
    name: "ollama",
    baseURL: `${String(endpoint).replace(/\/$/, "")}/v1`,
    supportsStructuredOutputs: true,
  });

  try {
    const { object } = await generateObject({
      model: provider.chatModel(model),
      schema: chunkCodeSchema,
      allowSystemInMessages: true,
      messages: [
        {
          role: "system",
          content:
            "あなたは初心者エンジニア向けの穴埋め学習教材を作るコーチです。" +
            "与えられたコードを読み、学習に適した「意味のある単位」の空欄を3〜6個選んでください。\n\n" +
            "重要なルール:\n" +
            "- blanks[].text は元のコードから一字一句そのままコピーした連続する文字列にすること。要約や言い換えは禁止。\n" +
            "- 空欄は細かすぎない単位にする(1文字や1トークンではなく、式・関数呼び出し・JSXの一部など意味のあるまとまり)。\n" +
            "- 空欄は必ず1行に収まる範囲にする(複数行にまたがる空欄は禁止)。\n" +
            "- roleは state(状態管理)/event-handler(イベントハンドラ)/api-fetch(APIフェッチ)/jsx(見た目)/logic(ロジック)/import(インポート)/style(スタイル)/other のいずれか。\n" +
            "- wrongAnswersには、textと文字数が近い、もっともらしいが動作としては誤ったコード片を1〜3個含める。\n" +
            "- 空欄同士は重複しないようにする。",
        },
        {
          role: "user",
          content: `ファイル: ${path}\n\n\`\`\`\n${content}\n\`\`\`\n\nこのコードの穴埋め学習教材を作成してください。`,
        },
      ],
    });

    const chunked = buildChunkedFile(path, content, object.blanks);
    const slotCount = chunked.segments.filter((s) => s.type === "slot").length;
    if (slotCount === 0) {
      return NextResponse.json(
        { ok: false, error: "空欄を検出できませんでした。もう一度お試しください。" },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, result: { chunked } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: toFriendlyOllamaError(err) }, { status: 200 });
  }
}
