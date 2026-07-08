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
        text: z.string().describe("企画書本文からの厳密な抜粋(部分文字列)"),
        category: z.enum(STACK_CATEGORIES),
      })
    )
    .describe("企画書中の「実現したいこと」を表すフレーズ一覧"),
  nodes: z
    .array(
      z.object({
        id: z.string(),
        label: z
          .string()
          .describe(
            "実際にインストール/採用する固有の技術名(例: Node.js, Next.js, PostgreSQL, Redis, Docker, Vercel)。" +
              "「バックエンド」「データベース」のような抽象的な総称は禁止"
          ),
        category: z.enum(STACK_CATEGORIES),
        description: z.string().describe("この技術が企画の中でどんな役割を果たすかの説明"),
        relatedPhraseIds: z.array(z.string()).describe("関連するphrasesのid一覧"),
        wrongAnswers: z
          .array(
            z.object({
              label: z
                .string()
                .describe(
                  "labelと同じ役割を担えそうな実在の技術名(例: label=Next.js なら Nuxt.js)。labelや他ノードのlabelとの重複は禁止"
                ),
              reason: z
                .string()
                .describe(
                  "その技術自体は実在の選択肢だが、今回の企画には最適でない理由(初心者向けの1文。例: 「Vueベースのため、Reactの学習資産を活かしにくい」)"
                ),
            })
          )
          .min(3)
          .max(3)
          .describe("4択クイズ用の誤答3つ(不正解理由つき)"),
      })
    )
    .describe("提案する技術スタックのノード一覧"),
  edges: z
    .array(
      z.object({
        id: z.string(),
        source: z.string().describe("nodesのid"),
        target: z.string().describe("nodesのid"),
        label: z
          .string()
          .describe(
            "この2つの技術間で実際に受け渡されるデータの短い説明(5〜12文字。例: 検索リクエスト、SQLクエリ結果、認証トークン)"
          ),
      })
    )
    .describe("ノード間のデータの流れ(例: フロントエンドがバックエンドAPIを呼ぶ)"),
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
      // Qwen3等の推論モデルはデフォルトで長い思考過程を出力し遅くなるため無効化する。
      providerOptions: { ollama: { reasoningEffort: "none" } },
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
            "- nodes.label は必ず実在する固有の技術名にしてください(例: Node.js, Next.js, React, PostgreSQL, Redis, Prisma, Docker, Vercel, AWS S3)。" +
            "「バックエンド」「データベース」「インフラ」のような抽象的な総称や、カテゴリ名そのままの言い換えは禁止です。\n" +
            "- 少なくとも1つは実行環境/言語(例: Node.js)、1つはフレームワーク、必要なら永続化層・インフラのノードも固有名詞で含めてください。\n" +
            "- カテゴリは frontend/backend/infra/data/other のいずれかにしてください。\n" +
            "- 各ノードのwrongAnswersには、その役割を担えそうな実在の代替技術を必ず3つ挙げてください" +
            "(学習者向けの4択クイズの誤答として使います)。labelと同カテゴリ・同粒度の固有名詞にし、" +
            "label自体や他ノードのlabelと重複させないでください。" +
            "各誤答のreasonには「その技術も実在の選択肢だが、今回の企画には最適でない理由」を" +
            "初心者に分かる1文で書いてください(技術をけなすのではなく、企画との相性で説明する)。\n" +
            "- 各エッジのlabelには「その2つの技術間で実際に何のデータが渡るか」を5〜12文字で必ず書いてください" +
            "(例: 検索リクエスト、書籍データJSON、SQLクエリ結果、認証トークン)。「関係がある」のような曖昧な表現は禁止です。\n" +
            "- ノード数は3〜8個程度、フレーズ数は3〜8個程度に抑えてください。" +
            (isRegeneration
              ? "\n\n【再生成モード】現在の提案(JSON)とユーザーの変更要望が与えられます。" +
                "変更要望に関係するノード/エッジ**だけ**を変更し、それ以外のnodes/edges/idは現在の提案からそのまま維持してください。" +
                "既存のidは変更しないこと(新しいノードを追加する場合のみ新しいidを発行してよい)。" +
                "維持するノードも含め、全ノードのwrongAnswersを必ず3つ埋めてください。"
              : ""),
        },
        {
          role: "user",
          content: `企画書:\n${planText}\n\n対話履歴:\n${historyText || "(なし)"}${regenerationContext}`,
        },
      ],
    });
    // 誤答の重複・正解との重複を除去(空になった場合はUI側がクイズなしで開示する)。
    const proposal = {
      ...object,
      nodes: object.nodes.map((node) => {
        const seen = new Set<string>();
        const wrongAnswers = node.wrongAnswers
          .map((w) => ({ label: w.label.trim(), reason: w.reason.trim() }))
          .filter((w) => {
            if (!w.label || w.label === node.label.trim() || seen.has(w.label)) return false;
            seen.add(w.label);
            return true;
          })
          .slice(0, 3);
        return { ...node, wrongAnswers };
      }),
    };
    return NextResponse.json({ ok: true, proposal });
  } catch (err) {
    return NextResponse.json({ ok: false, error: toFriendlyOllamaError(err) }, { status: 200 });
  }
}
