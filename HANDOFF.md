# 引き継ぎサマリー

作成日: 2026-07-07。別セッション/別AIへの引き継ぎ用にこのセッションの経緯をまとめたもの。

## プロジェクト概要

「アウトプットがインプットになる」開発学習アプリ。企画書入力→AI技術選定→コード生成→ブロック穴埋め学習、という3〜4ステップの体験がコア。詳細仕様は[AUTONOMOUS_BUILD_PROMPT.md](AUTONOMOUS_BUILD_PROMPT.md)(v1のオリジナル要件定義)を参照。Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui + Zustand + IndexedDB。

リポジトリ: `github.com/mao-sonobe/kanzankankaku2026-7`。コラボレーターは`mao-sonobe`(オーナー)と`takurateruyoshi`(このセッションのユーザー)の2人。ブランチを切って作業しPR経由でmainにマージする運用。

## ブランチ状況

- **main**: PR #1, #2がマージ済み(下記「mainに反映済みの作業」)。
- **takura**: mainにマージ済みで現在mainと同一。リモートに残置(削除していない)。
- **geminiAPI**(現在のブランチ): **ローカルに変更が溜まっているが一切コミット・push未**。下記「geminiAPIブランチの未コミット作業」参照。**意図的に古い時点(mcp-plugin導入より前のコミット `23a69d9`)から分岐している** — Ollama用の`AIProvider`抽象をそのまま活かしGeminiに差し替えて精度比較する実験のため。

## mainに反映済みの作業(PR #1, #2)

1. **Ollama系バグ修正**: shadcnをdevDependenciesへ移動、chatルートのエラーハンドリング統一、generate-codeのファイルパス正規化(衝突防止)、tech-stack提案プロンプト強化(具体的技術名を強制)、chunk-codeに`summary`(ファイル概要)と`relatedStackNodeId`(技術スタックとの対応)を追加、実行ログのANSI/スピナー文字除去。
2. **Claude Code拡張機能(Skill+MCPサーバー)**: `mcp-plugin/`にMCPサーバー(`build_stack_graph_widget`, `build_code_blank_widget`)、`.claude/skills/learn-while-coding/SKILL.md`(基礎説明→可視化の順序を強制)。**Ollama/独自ミニアプリ生成に依存せず、Claude Code自身が実プロジェクトで書いたコード・選定した技術をそのまま可視化する方式**に転換(ユーザーからの「いきなり技術名が出ない」「コード⇔技術スタックの連携が弱い」というフィードバックが動機)。
3. **プラグインの審査なし公開**: MCPサーバーをesbuildで単一ファイルにバンドル(`npm install`不要、node_modulesなしで動作確認済み)。`.claude-plugin/plugin.json` + `marketplace.json`を追加し、`/plugin marketplace add mao-sonobe/kanzankankaku2026-7` → `/plugin install learn-while-coding@learn-while-coding`で誰でも導入できる状態(実機でadd/install/uninstallまで検証済み)。**ユーザーの明示的な確認を得て進めた**(共有リポジトリを公開マーケットプレイスの入口にする、自動セーフガードがブロックした操作だったため)。

### 調査で判明した重要な制約(再度調べ直す必要なし)

- **Claude Codeは無料プランでは使えない**(Pro/Max/Team/Enterprise等の有料プランかAPI課金が必須)。プラグインの審査有無に関わらずこれは変わらない。
- 審査(`platform.claude.com/plugins/submit`)を通しても「claude.aiの通常チャットで使える」ようにはならない。Claude Code専用のまま。審査は「検索・一覧に出るようになる」だけの効果。
- claude.aiの通常チャットには「コネクタ」機能があるが、**ローカルのstdio MCPサーバーには繋がらず、リモート公開が必須**。ArtifactsもMCPツール出力を自動描画する仕組みではない(Claudeが応答内でコードを書く方式)。
- ChatGPTの「Apps」(旧Connector)は無料プラン不可、リモート必須という点は同じだが、**Apps SDKにはMCPツール出力をそのままウィジェット描画する仕組みがある**(claude.aiより有利な点)。
- **「Claudeアカウントでログインし、そのユーザー自身の利用枠を消費する」OAuth的な仕組みはAnthropicもGoogleも公式には提供していない**。Google側は第三者アプリがこれを試みたケースを2026年2月に禁止・アカウント停止する対応を取っている。
- **Geminiは無料枠ならAPIキー発行にクレジットカード登録が一切不要**(Anthropicは無料プランでもAPI利用には課金設定必須)。「各ユーザーが自分の無料Geminiキーを設定画面に貼る」方式(BYOK)なら無料ユーザーも実質含められる、という結論に至ったが、**現状の実装はサーバー側`.env.local`に1つだけキーを持つ方式のままで、BYOK化はまだ未実装**。
- OpenAI Codex CLIはMCPクライアント・Skill相当(`SKILL.md`)・プラグインマーケットプレイス機構をすべて備えるが、**ウィジェット描画(visualize相当)の仕組みは存在しない**ため、MCPツールがSVG/HTMLを返してもそのままテキスト表示されるだけ。

### 社内ポール調査(意思決定の根拠)

開発で一番使うAIは Claude Code(課金)68%、Gemini 18%、Claude(無課金)9%、Codex 5%。この結果から「Gemini版(ライトユーザー向け)」と「Claude Codeプラグイン版」の**両方を作る**方針に決定。

## geminiAPIブランチの未コミット作業(要コミット)

1. **GeminiAIProvider実装**: `src/lib/ai/gemini-provider.ts`, `gemini-server.ts`, `src/app/api/gemini/{chat,tech-stack,generate-code,chunk-code,check}/route.ts`。`@ai-sdk/google`使用。**Geminiはmessages配列内のrole:"system"を受け付けず、別のsystemパラメータが必要**という仕様差があり対応済み。設定画面(`/settings`)にOllama/Geminiのプロバイダー切り替えタブを追加(`AIProviderSettings.provider`フィールド)。
2. **`.env.local`にユーザー自身のGemini APIキーが実際に設定済み**(gitignore対象、コミットされない)。実機でGeminiの技術スタック提案・コード生成を試し、**Ollamaの小型ローカルモデルより明確に精度が高いことを確認済み**。
3. **ロゴ/ブランディング**: `public/logo-icon.png`(歯車+脳のアイコン、歯車=作る/アウトプット=青、脳=理解する/インプット=赤)、`public/logo-wordmark.png`("Out↓In"ワードマーク)。ヘッダー・favicon・トップページ(3ステップカードの色分け)に反映済み。
4. **技術スタック理解の4ステップウィザードUI(大規模UI刷新)**: ユーザーがモックアップ画像(グラデーション・アイコン・パイプライン図)を提示し、「見た目も忠実に再現」を選択。
   - ヘッダーを2つのグラデーションピルタブ(「技術スタック」/「コード理解」)+設定(レンチ)アイコンに刷新(`header-nav.tsx`)
   - `src/components/plan/`配下に新規: `wizard-steps.tsx`(4ステップのシェブロン型ブレッドクラム、本/耳/電球/吹き出しアイコン)、`step-input.tsx`(STEP1)、`step-hearing.tsx`(STEP2、吹き出し型チャットUI)、`step-proposal.tsx`(STEP3、技術スタック提案+選定理由表示+パイプライン表示+**フィードバックによる再生成**)、`step-explain.tsx`(STEP4、カテゴリチップで技術を整理・解説)
   - `plan-workspace.tsx`を全面書き換えてこの4ステップを統括するオーケストレーターに
   - `project-store.ts`に`planStep`(1-4)を追加、永続化対象にも追加
   - `ProposeTechStackOptions`に`currentProposal`/`feedback`を追加し、tech-stack API(Ollama/Gemini両方)を「現在の提案+変更要望→関係する部分だけ変更した提案」を返すよう拡張(プロンプトで既存id維持を指示)
   - **実機で一連の流れ(STEP1→4、フィードバックによる再生成)を動作確認済み**。`tsc`/`eslint`/`npm run build`すべて成功。
   - **スコープ外(手を付けていない)**: 「コード理解」タブ側(`/build`, `/learn`ページ)。旧`stack-graph.tsx`/`highlighted-plan-text.tsx`は未使用だが削除していない。

## 次のセッションで最初に確認すべきこと

1. 現在`geminiAPI`ブランチの変更は**全て未コミット**。ユーザーに確認の上コミット/push/マージするか、このまま作業継続するか判断すること。
2. `.env.local`に実際のGemini APIキーが入っている状態なので、絶対にこの値を出力・ログ・コミットメッセージ等に含めないこと。
3. Claude Code拡張機能(`main`に既にマージ済み)のマーケットプレイス申請(`platform.claude.com/plugins/submit`)はユーザー自身のAnthropicアカウントでの手続きが必要で、Claudeが代行できない。
4. Gemini BYOK(ユーザー自身の無料キーを設定画面から入力する方式)は提案のみで未実装。無料ユーザーを含めたい場合の次の実装候補。
