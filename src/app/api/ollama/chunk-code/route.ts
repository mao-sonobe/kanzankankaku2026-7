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
  relatedStackNodeId: z
    .string()
    .optional()
    .describe(
      "この空欄が体現している技術スタックノードのid(与えられたstackNodes一覧から選ぶ)。" +
        "例えばuseStateの空欄なら状態管理ライブラリ/機能のノードidを入れる。対応するノードがなければ省略してよい"
    ),
});

const chunkCodeSchema = z.object({
  summary: z
    .string()
    .describe(
      "このファイルで何が重要か・どこが肝心な仕組みかを2〜3文の日本語で説明する概要。" +
        "初心者が読んで「このファイルはここを理解すればよい」とわかる内容にする"
    ),
  blanks: z
    .array(blankSchema)
    .min(2)
    .max(8)
    .describe("コード中の意味のある単位(状態管理・イベントハンドラ・JSX表示など)の空欄一覧"),
});

export async function POST(req: NextRequest) {
  const { endpoint, model, file, stackNodes } = await req.json();
  const path: string = file?.path ?? "";
  const content: string = file?.content ?? "";

  const provider = createOpenAICompatible({
    name: "ollama",
    baseURL: `${String(endpoint).replace(/\/$/, "")}/v1`,
    supportsStructuredOutputs: true,
  });

  const stackDescription = Array.isArray(stackNodes)
    ? stackNodes
        .map((n: { id: string; label: string; description: string }) => `- id=${n.id}: ${n.label} (${n.description})`)
        .join("\n")
    : "";

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
            "- summaryには、このファイルの中でも特に重要な仕組み・注目すべき箇所を2〜3文で説明すること。\n" +
            "- blanks[].text は元のコードから一字一句そのままコピーした連続する文字列にすること。要約や言い換えは禁止。\n" +
            "- 空欄は細かすぎない単位にする(1文字や1トークンではなく、式・関数呼び出し・JSXの一部など意味のあるまとまり)。\n" +
            "- 空欄は必ず1行に収まる範囲にする(複数行にまたがる空欄は禁止)。\n" +
            "- roleは state(状態管理)/event-handler(イベントハンドラ)/api-fetch(APIフェッチ)/jsx(見た目)/logic(ロジック)/import(インポート)/style(スタイル)/other のいずれか。\n" +
            "- wrongAnswersには、textと文字数が近い、もっともらしいが動作としては誤ったコード片を1〜3個含める。\n" +
            "- 与えられたstackNodes一覧の技術がこの空欄で実際に使われている場合は、relatedStackNodeIdフィールド(labelとは別の専用フィールド)にそのidをそのまま入れて、コードと技術スタックの対応関係を示すこと。\n" +
            "- relatedStackNodeIdという文字列自体をlabelやtextに書き込んではいけない。idの値だけをrelatedStackNodeIdフィールドに入れること。\n" +
            '  例: { "text": "useState(0)", "role": "state", "label": "状態の初期化", "relatedStackNodeId": "state-1", "wrongAnswers": [...] }\n' +
            "- 空欄同士は重複しないようにする。",
        },
        {
          role: "user",
          content: `技術スタック一覧:\n${stackDescription || "(なし)"}\n\nファイル: ${path}\n\n\`\`\`\n${content}\n\`\`\`\n\nこのコードの穴埋め学習教材を作成してください。`,
        },
      ],
    });

    const validStackIds = new Set(
      Array.isArray(stackNodes) ? stackNodes.map((n: { id: string }) => n.id) : []
    );
    // ローカルLLMがrelatedStackNodeIdを専用フィールドではなくlabel/textに
    // "relatedStackNodeId: xxx" のように書き込んでしまうことがあるため、
    // 検出して本来のフィールドへ復元し、表示用テキストからは除去する。
    const strayIdPattern = /relatedStackNodeId\s*[:=]\s*["']?([\w.-]+)["']?/i;
    const sanitizedBlanks = object.blanks.map((b) => {
      let relatedStackNodeId = b.relatedStackNodeId && validStackIds.has(b.relatedStackNodeId)
        ? b.relatedStackNodeId
        : undefined;
      let label = b.label;
      if (!relatedStackNodeId) {
        const match = label.match(strayIdPattern);
        if (match && validStackIds.has(match[1])) {
          relatedStackNodeId = match[1];
          label = label.replace(strayIdPattern, "").trim();
        }
      }
      return { ...b, label: label || b.label, relatedStackNodeId };
    });

    const chunked = buildChunkedFile(path, content, sanitizedBlanks, object.summary);
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
