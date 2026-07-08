import type { GeneratedFile } from "@/lib/ai/types";

/** スキャフォールド由来のパス。学習対象(AI生成部分)から除外するために使う。 */
export const SCAFFOLD_PATHS = new Set([
  "package.json",
  "next.config.mjs",
  "app/layout.js",
  "app/globals.css",
]);

/**
 * WebContainersで実行するNext.jsプロジェクトの固定スキャフォールド。
 * ビルド設定やレイアウトなど「毎回同じ内容になるべきファイル」はAI生成せず、
 * AIには app/page.js (実際の機能を実装するファイル) のみ生成させることで
 * ローカルLLMでも現実的な時間・精度で完走できるようにする。
 */
export function getScaffoldFiles(): GeneratedFile[] {
  return [
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "generated-app",
          version: "0.1.0",
          private: true,
          scripts: {
            dev: "next dev",
            build: "next build",
            start: "next start",
          },
          dependencies: {
            // Next.js 15.5.x はWebContainers上で"Expected workUnitAsyncStorage to have a store"
            // という内部invariantエラーで/がクラッシュする既知の不具合がある
            // (https://github.com/vercel/next.js/issues/84026)。
            // 15.4系(15.4.1で動作確認済み)に固定して回避する。
            next: "15.4.11",
            react: "19.2.4",
            "react-dom": "19.2.4",
          },
        },
        null,
        2
      ),
    },
    {
      path: "next.config.mjs",
      content: `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\nexport default nextConfig;\n`,
    },
    {
      path: "app/layout.js",
      content: `import "./globals.css";

export const metadata = {
  title: "生成されたアプリ",
  description: "AIが生成したNext.jsアプリ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
`,
    },
    {
      path: "app/globals.css",
      content: `* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif;
  background: #f7f7f8;
  color: #1a1a1a;
}
`,
    },
  ];
}
