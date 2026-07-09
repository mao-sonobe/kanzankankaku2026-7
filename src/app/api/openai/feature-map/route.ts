import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { validateFeatureSpans } from "@/lib/domain/feature-map";
import { getOpenAIProvider } from "@/lib/ai/openai-server";
import { toFriendlyOpenAIError } from "@/lib/ai/friendly-error";

const featureMapSchema = z.object({
  features: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().describe("機能名(初心者にも分かる短い日本語。例: 予定の追加)"),
        description: z.string().describe("この機能が何をするかの1〜2文の説明"),
        dataShape: z
          .string()
          .describe(
            "この機能が扱う入出力データの形式を1文で(例: タイトル・詳細・日付を持つオブジェクト)"
          ),
        spans: z
          .array(
            z.object({
              filePath: z.string().describe("該当コードが含まれるファイルのpath(与えられた一覧から)"),
              text: z
                .string()
                .describe(
                  "そのファイルから一字一句そのままコピーした、この機能を実装しているコード片(10〜80文字程度)"
                ),
              explanation: z
                .string()
                .describe("このコードがこの機能の中で何をしているかの短い日本語解説(1文)"),
            })
          )
          .min(1)
          .describe("この機能を実装しているコード片の一覧(ファイルをまたいでもよい。1〜4箇所)"),
      })
    )
    .min(1)
    .max(8)
    .describe("アプリを構成する機能の一覧"),
});

// プロンプト肥大化のガード。生成コードは通常このサイズに十分収まる。
const MAX_FILE_CHARS = 40000;

export async function POST(req: NextRequest) {
  const { model, files, stackProposal } = await req.json();

  if (!Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ ok: false, error: "生成コードが必要です。" }, { status: 200 });
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
  const stackNodes: { label: string; description: string }[] = Array.isArray(stackProposal?.nodes)
    ? stackProposal.nodes
    : [];
  const stackText =
    stackNodes.length > 0
      ? `\n\n技術スタック:\n${stackNodes.map((n) => `- ${n.label}: ${n.description}`).join("\n")}`
      : "";

  try {
    const provider = getOpenAIProvider();
    const { object } = await generateObject({
      model: provider.chat(model),
      schema: featureMapSchema,
      system:
        "あなたは初心者エンジニアにコードの構造を教えるコーチです。" +
        "与えられた複数ファイルのコードを読み、アプリを構成する「機能」単位(例: 予定の追加、予定の一覧表示、予定の削除)に分解してください。\n\n" +
        "重要なルール:\n" +
        "- 機能は3〜8個程度。技術名やファイル名ではなく、ユーザーから見た機能で名付けること。\n" +
        "- spans[].text は必ず該当ファイルの本文から一字一句そのままコピーした連続する文字列にすること。要約や言い換えは禁止。\n" +
        "- 1つの機能が複数ファイルにまたがって実装されている場合は、spansに各ファイルの該当箇所をすべて含めること" +
        "(例: 一覧表示コンポーネントのJSXと、それにpropsでデータを渡すpage.js側の両方)。\n" +
        "- spansは1機能につき1〜4箇所程度。コードの本質的な部分(状態定義・関数本体・JSXの該当部分)を選び、" +
        "importやスタイルなどの些末な行は選ばないこと。\n" +
        "- dataShapeには、その機能が扱うデータの形(プロパティ名や型のイメージ)を初心者にも分かる1文で書くこと。\n" +
        "- explanationは「このコードが機能の中で何を担っているか」が一目で分かる短い日本語で。",
      messages: [
        {
          role: "user",
          content: `${filesText}${stackText}\n\nこのアプリの機能マップを作成してください。`,
        },
      ],
    });

    const spans = validateFeatureSpans(usableFiles, object.features, object.features.flatMap((f) =>
      f.spans.map((s) => ({ ...s, featureId: f.id }))
    ));
    if (spans.length === 0) {
      return NextResponse.json(
        { ok: false, error: "機能マップを特定できませんでした。もう一度お試しください。" },
        { status: 200 }
      );
    }

    const features = object.features.map((f) => ({
      id: f.id,
      label: f.label,
      description: f.description,
      dataShape: f.dataShape,
    }));

    return NextResponse.json({ ok: true, result: { features, spans } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: toFriendlyOpenAIError(err) }, { status: 200 });
  }
}
