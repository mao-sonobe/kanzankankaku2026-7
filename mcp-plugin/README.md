# output-input-learning MCPサーバー

コーディング中に、選んだ技術スタックの関係(データがどう受け渡されるか)と、
実際に書いたコードの理解ポイントを可視化するためのMCPサーバー。
Claude Code自身が生成する情報を土台にするため、外部AI APIやローカルLLMは不要。

## この開発リポジトリで使う場合

リポジトリ直下の `.mcp.json` が `mcp-plugin/dist/server.bundle.mjs` (依存関係を
バンドル済みの単一ファイル、`npm install`不要)を自動起動する設定になっているため、
`git clone`してプロジェクトをClaude Codeで開くだけで有効になる。

## 誰でもインストールできるプラグインとして使う場合

このリポジトリ自体がClaude Codeのプラグイン/マーケットプレイスになっている
(`.claude-plugin/marketplace.json` + `.claude-plugin/plugin.json`)。
このリポジトリをクローンしていない第三者でも、次の2コマンドだけで導入できる:

```
/plugin marketplace add mao-sonobe/kanzankankaku2026-7
/plugin install learn-while-coding@learn-while-coding
```

`claude plugin marketplace add <ローカルパス>` → `claude plugin install ...` で
ローカルインストールの実機検証済み。

## 開発者向け: バンドルの再ビルド

`src/`配下を変更したら、配布物である `dist/server.bundle.mjs` を再ビルドしてコミットすること
(マーケットプレイス経由のインストールではビルドステップが走らないため、ビルド済みファイルを
リポジトリに含める必要がある)。

```bash
cd mcp-plugin
npm install   # 開発時のみ(esbuild等のdevDependencies用)
npm run build
```

## 提供ツール

- `build_stack_graph_widget` — 技術スタックのノードと、ノード間のデータの受け渡し(dataFlow)を示すSVG図を組み立てる
- `build_code_blank_widget` — 実コードから穴埋め演習ウィジェット(自己完結HTML)を組み立てる

呼び出し方の判断や「いつ基礎を説明してから見せるか」は
[`../.claude/skills/learn-while-coding/SKILL.md`](../.claude/skills/learn-while-coding/SKILL.md) 側に定義されている。
