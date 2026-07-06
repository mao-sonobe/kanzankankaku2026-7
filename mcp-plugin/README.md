# output-input-learning MCPサーバー

コーディング中に、選んだ技術スタックの関係(データがどう受け渡されるか)と、
実際に書いたコードの理解ポイントを可視化するためのMCPサーバー。
Claude Code自身が生成する情報を土台にするため、外部AI APIやローカルLLMは不要。

## セットアップ(初回のみ)

```bash
cd mcp-plugin
npm install
```

リポジトリ直下の `.mcp.json` がこのサーバーを自動起動する設定になっているため、
`npm install` 後はプロジェクトをClaude Codeで開くだけで有効になる。

## 提供ツール

- `build_stack_graph_widget` — 技術スタックのノードと、ノード間のデータの受け渡し(dataFlow)を示すSVG図を組み立てる
- `build_code_blank_widget` — 実コードから穴埋め演習ウィジェット(自己完結HTML)を組み立てる

呼び出し方の判断や「いつ基礎を説明してから見せるか」は
[`../.claude/skills/learn-while-coding/SKILL.md`](../.claude/skills/learn-while-coding/SKILL.md) 側に定義されている。
