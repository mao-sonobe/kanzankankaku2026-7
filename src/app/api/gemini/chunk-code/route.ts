import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { buildChunkedFile } from "@/lib/domain/chunk-code";
import { getGoogleProvider } from "@/lib/ai/gemini-server";
import { toFriendlyGeminiError } from "@/lib/ai/friendly-error";

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
      "この空欄が関わる技術スタックノードのid(与えられた一覧から)。データ受け渡しに関わる空欄では必須"
    ),
  explanation: z
    .string()
    .describe(
      "正解した学習者に見せる説明文(1〜2文、初心者向け)。このコードが何をしていて、" +
        "他のどの部分(関数・技術)とどうつながっているかを説明する"
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
  const { model, file, stackProposal } = await req.json();
  const path: string = file?.path ?? "";
  const content: string = file?.content ?? "";

  const stackNodes: { id: string; label: string; category: string; description: string }[] =
    Array.isArray(stackProposal?.nodes) ? stackProposal.nodes : [];
  const stackEdges: { source: string; target: string; label?: string }[] = Array.isArray(
    stackProposal?.edges
  )
    ? stackProposal.edges
    : [];
  const stackContext =
    stackNodes.length > 0
      ? `\n\n技術スタック(ノード一覧):\n${stackNodes
          .map((n) => `- id=${n.id} / ${n.label} (${n.category}): ${n.description}`)
          .join("\n")}\n\nデータの流れ(エッジ一覧):\n${stackEdges
          .map((e) => `- ${e.source} → ${e.target}${e.label ? `: ${e.label}` : ""}`)
          .join("\n")}`
      : "";

  try {
    const provider = getGoogleProvider();
    const { object } = await generateObject({
      model: provider.chat(model),
      schema: chunkCodeSchema,
      system:
        "あなたは初心者エンジニア向けの穴埋め学習教材を作るコーチです。" +
        "与えられたコードを読み、学習に適した「意味のある単位」の空欄を3〜6個選んでください。\n\n" +
        "重要なルール:\n" +
        "- summaryには、このファイルの中でも特に重要な仕組み・注目すべき箇所を2〜3文で説明すること。\n" +
        "- blanks[].text は元のコードから一字一句そのままコピーした連続する文字列にすること。要約や言い換えは禁止。\n" +
        "- 空欄は細かすぎない単位にする(1文字や1トークンではなく、式・関数呼び出し・JSXの一部など意味のあるまとまり)。\n" +
        "- 空欄は必ず1行に収まる範囲にする(複数行にまたがる空欄は禁止)。\n" +
        "- roleは state(状態管理)/event-handler(イベントハンドラ)/api-fetch(APIフェッチ)/jsx(見た目)/logic(ロジック)/import(インポート)/style(スタイル)/other のいずれか。\n" +
        "- wrongAnswersには、textと文字数が近い、もっともらしいが動作としては誤ったコード片を1〜3個含める。\n" +
        "- explanationには、このコードが何をしていて、他の関数や技術とどうつながっているかを" +
          "初心者にも分かる1〜2文で説明する(例: 「fetchで取得したJSONをsetDataに渡し、画面に一覧表示します」)。\n" +
        "- 空欄同士は重複しないようにする。" +
        (stackNodes.length > 0
          ? "\n- 技術スタックが与えられています。空欄は技術間のデータ受け渡しのコア部分" +
            "(fetch呼び出し、APIレスポンスの処理、propsやstateへの受け渡し)を優先して選び、" +
            "その空欄が関わる技術のidをrelatedStackNodeIdに設定してください。"
          : ""),
      messages: [
        {
          role: "user",
          content: `ファイル: ${path}\n\n\`\`\`\n${content}\n\`\`\`${stackContext}\n\nこのコードの穴埋め学習教材を作成してください。`,
        },
      ],
    });

    const chunked = buildChunkedFile(
      path,
      content,
      object.blanks,
      object.summary,
      new Set(stackNodes.map((n) => n.id))
    );
    const slotCount = chunked.segments.filter((s) => s.type === "slot").length;
    if (slotCount === 0) {
      return NextResponse.json(
        { ok: false, error: "空欄を検出できませんでした。もう一度お試しください。" },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, result: { chunked } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: toFriendlyGeminiError(err) }, { status: 200 });
  }
}
