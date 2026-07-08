import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { getGoogleProvider } from "@/lib/ai/gemini-server";
import { toFriendlyGeminiError } from "@/lib/ai/friendly-error";

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
    .max(3)
    .describe("生成するファイル一覧。app/page.jsを必ず含み、必要なら追加のコンポーネントファイルを含めてよい"),
});

const CLIENT_ONLY_PATTERN = /\buse(State|Effect|Ref|Callback|Memo|Context)\b|on(Click|Change|Submit|Input|KeyDown|KeyUp|MouseEnter|MouseLeave)=/;

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

function stripStrayUseClientStatements(content: string): string {
  const lines = content.split("\n");
  return lines.filter((line, i) => !(i > 0 && /^\s*use client;?\s*$/.test(line))).join("\n");
}

function stripGlobalCssImports(path: string, content: string): string {
  if (path === "app/globals.css") return content;
  return content
    .split("\n")
    .filter((line) => !/^\s*import\s+["'].*\.css["'];?\s*$/.test(line))
    .join("\n");
}

function stripTrailingCssBlock(path: string, content: string): string {
  if (path === "app/globals.css") return content;
  const lines = content.split("\n");
  const cssSelectorLine = lines.findIndex((l) => /^\s*[.#][a-zA-Z][\w-]*(\s*,\s*[.#][a-zA-Z][\w-]*)*\s*\{\s*$/.test(l));
  if (cssSelectorLine === -1) return content;
  return lines.slice(0, cssSelectorLine).join("\n").trimEnd() + "\n";
}

function stripMarkdownFence(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```[a-z]*\n([\s\S]*?)\n?```$/);
  return match ? match[1] : content;
}

function normalizeFilePath(path: string): string {
  const cleaned = path
    .trim()
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/^src\/+/, "");
  const baseName = cleaned.split("/").pop() ?? cleaned;
  const isRouteFile = /^(page|layout)\.(js|jsx|ts|tsx)$/.test(baseName);
  if (isRouteFile && !cleaned.startsWith("app/")) {
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
    const provider = getGoogleProvider();
    const { object } = await generateObject({
      model: provider.chat(model),
      schema: generateCodeSchema,
      system:
        "あなたはNext.js(App Router)のシニアエンジニアです。" +
        "以下の制約を厳守して、企画書の内容を実際に動くミニアプリとして実装してください。\n\n" +
        "制約:\n" +
        "- 出力は素のJavaScript(TypeScriptではない)。ファイル名は app/page.js を必ず含める。\n" +
        "- Next.js 15 の App Router を使う。外部npmパッケージは一切使わない(next/reactのみ)。\n" +
        "- フックは必ず named import で書く(例: import { useState } from \"react\";)。React.useStateのような書き方は禁止。\n" +
        "- app/globals.css は既にレイアウトで読み込み済みなので、page.js側でCSSファイルをimportしない。\n" +
        "- 状態(useState)やイベントハンドラを使い、実際に画面上で操作できるインタラクティブな機能を実装する。\n" +
        "- 状態を持つ場合は必ずファイル冒頭に \"use client\"; を1回だけ書く(関数の中で再度書かない)。\n" +
        "- スタイルは className と、既存の app/globals.css を前提にした簡単なインラインstyleで表現する(Tailwind等は使わない)。\n" +
        "- コードは初心者が読んでも理解できるよう、シンプルで分かりやすい実装にする。\n" +
        "- コメントやplaceholder(TODO等)は書かず、完全に動作するコードのみを出力する。",
      messages: [
        {
          role: "user",
          content: `企画概要:\n${planSummary}\n\n技術スタック:\n${stackDescription}\n\nこの企画のコア機能を実装したapp/page.jsを生成してください。`,
        },
      ],
    });
    const normalized = object.files
      .filter((f) => f.content.trim().length > 0)
      .map((f) => {
        const path = normalizeFilePath(f.path);
        return { path, content: postProcessFile(path, f.content) };
      });
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
    return NextResponse.json({ ok: false, error: toFriendlyGeminiError(err) }, { status: 200 });
  }
}
