import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { validateDataFlowSpans } from "@/lib/domain/data-flow";
import { getOpenAIProvider } from "@/lib/ai/openai-server";
import { toFriendlyOpenAIError } from "@/lib/ai/friendly-error";

const dataFlowSchema = z.object({
  spans: z
    .array(
      z.object({
        filePath: z.string().describe("該当コードが含まれるファイルのpath(与えられた一覧から)"),
        text: z
          .string()
          .describe(
            "そのファイルから一字一句そのままコピーした、データ受け渡しを担うコード片(10〜80文字程度)"
          ),
        edgeId: z.string().describe("このコードが実装している技術スタックのエッジid"),
        explanation: z
          .string()
          .describe("どのデータが、どこからどこへ渡るのかの短い日本語解説(1〜2文)"),
      })
    )
    .min(1)
    .describe("生成コード内で「データが移動する瞬間」を実装している箇所の一覧(2〜10箇所)"),
});

// プロンプト肥大化のガード。生成コードは通常このサイズに十分収まる。
const MAX_FILE_CHARS = 40000;

export async function POST(req: NextRequest) {
  const { model, files, stackProposal } = await req.json();

  if (!Array.isArray(files) || files.length === 0 || !stackProposal) {
    return NextResponse.json(
      { ok: false, error: "生成コードと技術スタックの両方が必要です。" },
      { status: 200 }
    );
  }

  const usableFiles = (files as { path: string; content: string }[]).filter(
    (f) => f?.path && typeof f.content === "string" && f.content.length <= MAX_FILE_CHARS
  );
  if (usableFiles.length === 0) {
    return NextResponse.json(
      { ok: false, error: "解析対象にできるファイルがありませんでした。" },
      { status: 200 }
    );
  }

  const filesText = usableFiles
    .map((f) => `ファイル: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");
  const nodesText = (stackProposal.nodes as { id: string; label: string; category: string }[])
    .map((n) => `- id=${n.id}: ${n.label} (${n.category})`)
    .join("\n");
  const edgesText = (
    stackProposal.edges as { id: string; source: string; target: string; label?: string }[]
  )
    .map((e) => `- id=${e.id}: ${e.source} → ${e.target}${e.label ? ` (${e.label})` : ""}`)
    .join("\n");

  try {
    const provider = getOpenAIProvider();
    const { object } = await generateObject({
      model: provider.chat(model),
      schema: dataFlowSchema,
      system:
            "あなたは初心者エンジニアに「データの流れ」を教えるコーチです。" +
            "生成されたコードと技術スタック(ノードとエッジ)が与えられます。" +
            "各エッジ(技術Aから技術Bへのデータの流れ)がコード上のどこで実現されているかを特定してください。\n\n" +
            "重要なルール:\n" +
            "- text は必ず該当ファイルの本文から一字一句そのままコピーした連続する文字列にすること。要約や言い換えは禁止。\n" +
            "- fetch呼び出し、APIレスポンスのstateへの格納、propsの受け渡し、イベントからの状態更新など" +
            "「データが移動する瞬間」を選ぶこと。\n" +
            "- 各エッジにつき1〜2箇所。コードに現れないエッジは無理に挙げなくてよい。\n" +
            "- explanationは「何のデータが、どこから、どこへ」が一目で分かる短い日本語で。",
      messages: [
        {
          role: "user",
          content:
            `技術スタックのノード:\n${nodesText}\n\nエッジ(データの流れ):\n${edgesText}\n\n` +
            `${filesText}\n\n各エッジがコード上のどこで実装されているかを特定してください。`,
        },
      ],
    });

    const spans = validateDataFlowSpans(usableFiles, stackProposal, object.spans);
    if (spans.length === 0) {
      return NextResponse.json(
        { ok: false, error: "データフローを特定できませんでした。もう一度お試しください。" },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, result: { spans } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: toFriendlyOpenAIError(err) }, { status: 200 });
  }
}
