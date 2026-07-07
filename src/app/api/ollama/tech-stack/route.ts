import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { toFriendlyOllamaError } from "@/lib/ai/friendly-error";

const STACK_CATEGORIES = ["frontend", "backend", "infra", "data", "other"] as const;

const techStackSchema = z.object({
  phrases: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().describe("企画書本文からの厳密な抜粋（部分文字列）"),
        category: z.enum(STACK_CATEGORIES),
      })
    )
    .describe("企画書中の「実現したいこと」を表すフレーズ一覧"),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().describe("技術要素名（例: Next.js, PostgreSQL）"),
        category: z.enum(STACK_CATEGORIES),
        description: z.string().describe("この技術が企画の中でどんな役割を果たすかの説明"),
        relatedPhraseIds: z.array(z.string()).describe("関連するphrasesのid一覧"),
      })
    )
    .describe("提案する技術スタックのノード一覧"),
  edges: z
    .array(
      z.object({
        id: z.string(),
        source: z.string().describe("nodesのid"),
        target: z.string().describe("nodesのid"),
        label: z.string().optional(),
      })
    )
    .describe("ノード間の関係（例: フロントエンドがバックエンドAPIを呼ぶ）"),
});

export async function POST(req: NextRequest) {
  const { endpoint, model, planText, chatHistory, currentProposal, feedback } = await req.json();

  const provider = createOpenAICompatible({
    name: "ollama",
    baseURL: `${String(endpoint).replace(/\/$/, "")}/v1`,
    supportsStructuredOutputs: true,
  });

  const historyText = Array.isArray(chatHistory)
    ? chatHistory.map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join("\n")
    : "";

  const isRegeneration = Boolean(feedback && currentProposal);
  const regenerationContext = isRegeneration
    ? `\n\n現在の提案(JSON):\n${JSON.stringify(currentProposal)}\n\nユーザーからの変更要望:\n${feedback}`
    : "";

  try {
    const { object } = await generateObject({
      model: provider.chatModel(model),
      schema: techStackSchema,
      allowSystemInMessages: true,
      messages: [
        {
          role: "system",
          content:
            "あなたは初心者エンジニアの開発を支援するAIアーキテクトです。" +
            "企画書と対話内容から、実装に必要な技術スタックを提案してください。\n\n" +
            "重要なルール:\n" +
            "- phrases.text は企画書本文から一字一句そのままコピーした短い抜粋(5〜20文字程度)にしてください。要約や言い換えは禁止です。\n" +
            "- 例: 企画書が「複数人でリアルタイムに編集できるようにしたい」を含む場合、phrases.text は\"リアルタイムに編集\"のように本文中の連続した文字列そのものにしてください。\n" +
            "- 各技術ノード(nodes)は、なぜその技術が必要かをdescriptionで説明し、関連するphrasesのidをrelatedPhraseIdsに列挙してください。\n" +
            "- カテゴリは frontend/backend/infra/data/other のいずれかにしてください。\n" +
            "- ノード数は3〜8個程度、フレーズ数は3〜8個程度に抑えてください。" +
            (isRegeneration
              ? "\n\n【再生成モード】現在の提案(JSON)とユーザーの変更要望が与えられます。" +
                "変更要望に関係するノード/エッジ**だけ**を変更し、それ以外のnodes/edges/idは現在の提案からそのまま維持してください。" +
                "既存のidは変更しないこと(新しいノードを追加する場合のみ新しいidを発行してよい)。"
              : ""),
        },
        {
          role: "user",
          content: `企画書:\n${planText}\n\n対話履歴:\n${historyText || "(なし)"}${regenerationContext}`,
        },
      ],
    });
    return NextResponse.json({ ok: true, proposal: object });
  } catch (err) {
    return NextResponse.json({ ok: false, error: toFriendlyOllamaError(err) }, { status: 200 });
  }
}
