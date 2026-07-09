import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { validateFeatureFlows } from "@/lib/domain/feature-flow";
import { getGoogleProvider, retryGemini } from "@/lib/ai/gemini-server";
import { toFriendlyGeminiError } from "@/lib/ai/friendly-error";

// スキーマは小型モデルでも構造化出力できるよう緩めに定義し、
// role/kindの正規化や件数チェックはサーバー側のvalidateFeatureFlowsで行う。
const featureFlowsSchema = z.object({
  features: z
    .array(
      z.object({
        name: z.string().describe("機能名(ユーザーがやりたいことの単位。例: 本を検索する、感想を投稿する)"),
        nodes: z.array(
          z.object({
            id: z.string().describe("このfeature内で一意なノードid(例: n1)"),
            label: z
              .string()
              .describe("コード上の要素名(例: HomeScreen, useState, handleSearch, supabase.from('books'))"),
            file: z.string().describe("由来ファイルのpath"),
            role: z
              .string()
              .describe("種別: screen/hook/state/db/api/component/util のいずれか"),
            data: z.string().describe("このノードが持つ・扱うデータの説明"),
            snippet: z
              .string()
              .describe("そのファイルから一字一句そのままコピーした、このノードに対応するコード片(10〜80文字程度)"),
          })
        ),
        steps: z
          .array(
            z.object({
              fromId: z.string().describe("データの出発ノードid"),
              toId: z.string().describe("データの到達ノードid"),
              kind: z.string().describe("呼び出し(データを渡す)=call / 戻り値(結果が返る)=return"),
              dataLabel: z.string().describe("この手順で渡る具体的なデータ(例: 入力された検索キーワード)"),
              explanation: z.string().describe("何がどこからどこへ渡るかの1〜2文の解説"),
              uiResult: z.string().optional().describe("この手順の結果、画面に出るもの(あれば)"),
            })
          )
          .describe("データが流れる順番のステップ一覧(実行順に並べる)"),
      })
    )
    .describe("このアプリの全機能を実現するのに必要な、機能ごとのデータの流れ"),
});

const MAX_FILE_CHARS = 40000;

export async function POST(req: NextRequest) {
  const { model, files, planText } = await req.json();

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

  try {
    const provider = getGoogleProvider();
    const { object } = await retryGemini(() => generateObject({
      model: provider.chat(model),
      schema: featureFlowsSchema,
      system:
        "あなたは初心者エンジニアに「アプリの中でデータがどう流れるか」を教えるコーチです。" +
        "与えられた生成コードを読み、このアプリが提供する機能を洗い出してください。\n\n" +
        "重要なルール:\n" +
        "- 代表的な機能だけでなく、このアプリの全機能(ユーザーがやりたいことを実現する手順)を漏れなく挙げること。\n" +
        "- 各機能について、コード上の要素をnodesとして列挙し、データが流れる順番をstepsで表すこと。\n" +
        "- nodes[].snippet と、そのノードのlabelは、必ず与えられたコードの中に実在するものにすること(一字一句コピー)。\n" +
        "- steps[].dataLabel は『入力された検索キーワード』『取得した本の一覧JSON』のように具体的な実データで書くこと。\n" +
        "- kindは、呼び出し(データを渡す方向)ならcall、戻り値(結果が返ってくる方向)ならreturn。\n" +
        "- steps は実行順に並べること(最初のトリガーから画面反映まで)。\n" +
        "- 生成コードが1ファイルでも、その中の状態・イベントハンドラ・API/DB呼び出し・描画の流れをnodesとstepsに分解すること。",
      messages: [
        {
          role: "user",
          content: `企画: ${planText}\n\n${filesText}\n\nこのアプリの全機能について、機能ごとのデータの流れを作成してください。`,
        },
      ],
    }));

    const features = validateFeatureFlows(usableFiles, object.features);
    if (features.length === 0) {
      return NextResponse.json(
        { ok: false, error: "機能のデータフローを特定できませんでした。もう一度お試しください。" },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, result: { features } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: toFriendlyGeminiError(err) }, { status: 200 });
  }
}
