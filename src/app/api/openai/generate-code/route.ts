import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { resolveModel, getOpenAIProvider, retryOpenAI } from "@/lib/ai/openai-server";
import { toFriendlyOpenAIError } from "@/lib/ai/friendly-error";

const generatedFileSchema = z.object({
  path: z
    .string()
    .describe("app/page.js のようなファイルパス。app/page.js は必ず含めること"),
  content: z.string().describe("ファイルの完全なソースコード"),
});

const generateCodeSchema = z.object({
  files: z
    .array(generatedFileSchema)
    .min(1)
    .max(8)
    .describe(
      "生成するファイル一覧。app/page.jsを必ず含み、機能ごとに意味のある単位で" +
        "app/components/配下にコンポーネントファイルを分割してよい"
    ),
});

const CLIENT_ONLY_PATTERN = /\buse(State|Effect|Ref|Callback|Memo|Context)\b|on(Click|Change|Submit|Input|KeyDown|KeyUp|MouseEnter|MouseLeave)=/;

/** モデルが"use client"指示を守らないことがあるため、必要なファイルには機械的に付与する。 */
function ensureUseClientDirective(content: string): string {
  const trimmed = content.trimStart();
  if (trimmed.startsWith('"use client"') || trimmed.startsWith("'use client'")) {
    return content;
  }
  if (CLIENT_ONLY_PATTERN.test(content)) {
    return `"use client";\n\n${content}`;
  }
  return content;
}

/** モデルが古いJSXランタイムの記法(React.useState等)を使いReactをimportし忘れることがあるため補完する。 */
function ensureReactImport(content: string): string {
  const usesReactNamespace = /\bReact\.\w/.test(content);
  const alreadyImportsReact = /import\s+React\b/.test(content);
  if (!usesReactNamespace || alreadyImportsReact) return content;

  const lines = content.split("\n");
  const directiveIndex = lines.findIndex((l) => /^["']use client["'];?$/.test(l.trim()));
  const insertAt = directiveIndex === -1 ? 0 : directiveIndex + 1;
  lines.splice(insertAt, 0, 'import React from "react";');
  return lines.join("\n");
}

const REACT_HOOK_NAMES = [
  "useState",
  "useEffect",
  "useRef",
  "useCallback",
  "useMemo",
  "useContext",
  "useReducer",
  "useLayoutEffect",
];

/** モデルがuseState等のフックをimportなしで裸のまま使うことがあるため、named importを補完する。 */
function ensureNamedHookImports(content: string): string {
  const usedHooks = REACT_HOOK_NAMES.filter((hook) => new RegExp(`\\b${hook}\\s*\\(`).test(content));
  if (usedHooks.length === 0) return content;

  const namedImportRegex = /import\s*\{([^}]*)\}\s*from\s*["']react["'];?/;
  const existingMatch = content.match(namedImportRegex);
  const existingNames = existingMatch
    ? existingMatch[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const missing = usedHooks.filter((h) => !existingNames.includes(h));
  if (missing.length === 0) return content;

  if (existingMatch) {
    const merged = Array.from(new Set([...existingNames, ...missing]));
    return content.replace(namedImportRegex, `import { ${merged.join(", ")} } from "react";`);
  }

  const lines = content.split("\n");
  const directiveIndex = lines.findIndex((l) => /^["']use client["'];?$/.test(l.trim()));
  const insertAt = directiveIndex === -1 ? 0 : directiveIndex + 1;
  lines.splice(insertAt, 0, `import { ${missing.join(", ")} } from "react";`);
  return lines.join("\n");
}

/** モデルが関数本体の中に"use client"の裸の(引用符なし)複製を紛れ込ませることがあるため取り除く。 */
function stripStrayUseClientStatements(content: string): string {
  // 引用符なしの"use client;"は(先頭行であっても)常に無効なので取り除く。
  // 正しい引用符付きディレクティブはensureUseClientDirectiveが別途付与する。
  const lines = content.split("\n");
  return lines.filter((line) => !/^\s*use client;?\s*$/.test(line)).join("\n");
}

/** app/page.js等でグローバルCSSを再importするとNext.jsがビルドエラーになるため取り除く(globals.cssはlayout.jsで読み込み済み)。 */
function stripGlobalCssImports(path: string, content: string): string {
  if (path === "app/globals.css") return content;
  return content
    .split("\n")
    .filter((line) => !/^\s*import\s+["'].*\.css["'];?\s*$/.test(line))
    .join("\n");
}

/** モデルがJSファイルの末尾に生のCSSルールを紛れ込ませることがあるため、それ以降を切り捨てる。 */
function stripTrailingCssBlock(path: string, content: string): string {
  if (path === "app/globals.css") return content;
  const lines = content.split("\n");
  const cssSelectorLine = lines.findIndex((l) => /^\s*[.#][a-zA-Z][\w-]*(\s*,\s*[.#][a-zA-Z][\w-]*)*\s*\{\s*$/.test(l));
  if (cssSelectorLine === -1) return content;
  return lines.slice(0, cssSelectorLine).join("\n").trimEnd() + "\n";
}

/** モデルがコードブロックのMarkdown記法を混入させることがあるため取り除く。 */
function stripMarkdownFence(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```[a-z]*\n([\s\S]*?)\n?```$/);
  return match ? match[1] : content;
}

/** モデルは "./page.js" や "page.js" のようにapp/配下から外れたパスを返すことがあるため矯正する。 */
function normalizeFilePath(path: string): string {
  const cleaned = path
    .trim()
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/^src\/+/, "");
  const baseName = cleaned.split("/").pop() ?? cleaned;
  const isRouteFile = /^(page|layout)\.(js|jsx|ts|tsx)$/.test(baseName);
  if (isRouteFile && !cleaned.startsWith("app/")) {
    // ネストしたフォルダ構造(例: counter/page.js)は保持したままapp/配下に移す。
    // basenameだけを使うと、異なるフォルダの複数ファイルが同じapp/page.jsに衝突しうる。
    return `app/${cleaned}`;
  }
  return cleaned;
}

function postProcessFile(path: string, content: string): string {
  let result = stripMarkdownFence(content);
  if (path.endsWith(".js") || path.endsWith(".jsx")) {
    result = stripStrayUseClientStatements(result);
    result = stripGlobalCssImports(path, result);
    result = stripTrailingCssBlock(path, result);
    result = ensureReactImport(result);
    result = ensureNamedHookImports(result);
    result = ensureUseClientDirective(result);
  }
  return result;
}

export async function POST(req: NextRequest) {
  const { model, planSummary, stackNodes } = await req.json();

  const stackDescription = Array.isArray(stackNodes)
    ? stackNodes
        .map((n: { label: string; description: string }) => `- ${n.label}: ${n.description}`)
        .join("\n")
    : "";

  try {
    const provider = getOpenAIProvider();
    const { object } = await retryOpenAI(() => generateObject({
      model: provider.chat(resolveModel(model)),
      schema: generateCodeSchema,
      system:
            "あなたはNext.js(App Router)のシニアエンジニアです。" +
            "以下の制約を厳守して、企画書の内容を実際に動くミニアプリとして実装してください。\n\n" +
            "制約:\n" +
            "- 出力は素のJavaScript(TypeScriptではない)。ファイル名は app/page.js を必ず含める。\n" +
            "- Next.js 15 の App Router を使う。外部npmパッケージは一切使わない(next/reactのみ)。\n" +
            "- 機能や役割ごとに意味のある単位でコンポーネントに分割し、app/components/配下に" +
            "ファイルを作って app/page.js からimportする構成にしてよい(単純な企画なら1ファイルのままでもよい)。\n" +
            "- フックは必ず named import で書く(例: import { useState } from \"react\";)。React.useStateのような書き方は禁止。\n" +
            "- app/globals.css は既にレイアウトで読み込み済みなので、CSSファイルをimportしない(page.js・コンポーネント共通)。\n" +
            "- 状態(useState)やイベントハンドラを使い、実際に画面上で操作できるインタラクティブな機能を実装する。\n" +
            "- 状態やイベントハンドラを持つファイルは必ず冒頭に \"use client\"; を1回だけ書く(関数の中で再度書かない)。\n" +
            "- コンポーネント間でstateを共有する場合はprops経由で受け渡す(親で状態を持ち、子にpropsで渡す)。\n" +
            "- スタイルは className と、既存の app/globals.css を前提にした簡単なインラインstyleで表現する(Tailwind等は使わない)。\n" +
            "- コードは初心者が読んでも理解できるよう、シンプルで分かりやすい実装にする。\n" +
            "- コメントやplaceholder(TODO等)は書かず、完全に動作するコードのみを出力する。",
      messages: [
        {
          role: "user",
          content: `企画概要:\n${planSummary}\n\n技術スタック:\n${stackDescription}\n\nこの企画のコア機能を実装してください。機能が複数ある場合は意味のある単位でコンポーネントファイルに分割してください。`,
        },
      ],
    }));
    const normalized = object.files

      .filter((f) => f.content.trim().length > 0)
      .map((f) => {
        const path = normalizeFilePath(f.path);
        return { path, content: postProcessFile(path, f.content) };
      });
    // 正規化後にパスが衝突した場合(異なる意図のファイルが同じパスになった場合)は
    // 後勝ちで一意化し、無警告の上書きではなく決定的な結果にする。
    const files = Array.from(new Map(normalized.map((f) => [f.path, f])).values());
    if (files.length === 0) {
      return NextResponse.json(
        { ok: false, error: "有効なコードが生成されませんでした。もう一度お試しください。" },
        { status: 200 }
      );
    }
    if (!files.some((f) => f.path === "app/page.js")) {
      files[0].path = "app/page.js";
    }
    return NextResponse.json({ ok: true, result: { files } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: toFriendlyOpenAIError(err) }, { status: 200 });
  }
}
