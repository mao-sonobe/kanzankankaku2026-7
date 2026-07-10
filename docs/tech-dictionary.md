# 技術辞書(技術検索ページ)

`/tech` 以下に実装された、技術学習サービス内の「技術検索ページ」。単体のWebアプリではなく、既存のNext.jsアプリ(kanzankankaku2026-7)内の1機能として実装されている。

## 概要

ユーザーが「何を作りたいか → どんな技術があるか → その技術の特徴 → どの技術を組み合わせればいいか」を自分のペースで調べられるようにする、目的→役割→技術一覧→技術詳細という段階的な検索フローを提供する。

```
目的(例: Webサイトを作りたい)
  ↓
役割(例: フロントエンド)
  ↓
技術一覧(検索・フィルターで絞り込み)
  ↓
技術詳細(全項目・関連技術・学習リソース)
```

ログイン不要で誰でも閲覧できる、参照専用のページ。

## スキーマ概要

`supabase/tech-schema.sql` に全テーブルの定義がある。管理者が管理する参照データのため、全テーブルRLSは「誰でも読み取り可、書き込みはSupabaseダッシュボード/service roleのみ」。

| テーブル | 役割 |
|---|---|
| `purposes` | 目的(5件固定: Web/モバイル/ゲーム/データ分析・AI/自動化) |
| `roles` | 役割(5件固定: フロントエンド/バックエンド/データベース/インフラ・デプロイ/ツール) |
| `platforms` | 対応環境(Web/iOS/Android/サーバー/デスクトップ) |
| `tags` | 自由なタグ(将来の拡張用、OSS/BaaS等) |
| `technologies` | 技術本体(計68件)。難易度・費用・学習期間・日本語情報量・人気度は`check`制約付きのenum列、おすすめ度(1-5)は任意 |
| `technology_purposes` / `technology_roles` / `technology_platforms` / `technology_tags` | 多対多の中間テーブル(複合主キー) |
| `technology_relations` | 「どの技術を組み合わせればいいか」に答える自己参照の多対多。`relation_type`が`related`(関連)/`alternative`(代替候補)/`complementary`(組み合わせ推奨)の3種類。片方向のみ登録し、アプリ側で双方向をマージして表示する |
| `learning_resources` | 技術ごとの学習リソース(公式ドキュメント・記事など) |

## SQLの実行方法

**新規セットアップの場合**: Supabase Studio の SQL Editor で `supabase/tech-schema.sql` の内容を貼り付けて実行する。テーブル作成・インデックス・RLS/ポリシー・初期データ(purposes/roles/platforms/tags/technologies計68件とその紐付け)まで一括で投入される。

**すでに`tech-schema.sql`を実行済みの環境に技術を追加した場合**: `supabase/tech-schema-additions-1.sql`のように、CREATE TABLE等を含まない追記専用のSQLファイルを別途用意する。`on conflict do nothing`で冪等にしているため、誤って複数回実行しても重複登録されない。

## ディレクトリ構成

```
supabase/tech-schema.sql                  DB定義+シードデータ
src/lib/domain/technology-labels.ts       enum値・日本語ラベル・色定義
src/lib/domain/tech-search-params.ts      URLクエリ⇄検索状態の変換
src/lib/supabase/technologies.ts          Supabaseアクセス(list/get関数)
src/app/tech/page.tsx                     一覧ページ(サーバー)
src/app/tech/[slug]/page.tsx              詳細ページ(サーバー)
src/components/tech/
  search-page.tsx                         オーケストレーター(目的/役割/検索/フィルター/一覧/ページング)
  purpose-section.tsx                     目的カード
  role-section.tsx                        役割カード
  search-bar.tsx                          検索バー(デバウンス)
  filter-sidebar.tsx                      絞り込みチェックボックス群
  technology-grid.tsx / technology-card.tsx  一覧グリッド・カード
  pagination.tsx                          ページネーション
  technology-detail.tsx                   詳細ページ本体
```

## フィルターの仕組み

検索状態(目的・役割・検索語・各フィルター・ページ番号)は`/tech`のURLクエリパラメータにすべて集約されており、状態全体が共有可能なURLになる。

```
/tech?purpose=web&role=frontend&q=react&difficulty=beginner,intermediate&platforms=web,ios&page=2
```

- **ファセット間(難易度・費用・学習期間・日本語情報量・人気度・対応環境)は AND**: 複数の種類のフィルターを組み合わせると絞り込まれる
- **同じファセット内の複数選択は OR**: 例えば難易度で「初級」「中級」を両方チェックすると、どちらかに該当する技術が表示される
- 目的・役割・対応環境は中間テーブル経由のため、`src/lib/supabase/technologies.ts`の`listTechnologies()`内で先に該当する`technology_id`集合を取得し、JS側で積集合を取ってから本体クエリに`.in("id", ids)`で絞り込んでいる(PostgRESTの`!inner`埋め込みは行が重複するため採用していない)

## 拡張ポイント(今回は未実装)

「全体の技術フロー」ページ(`/plan`のstep3、`src/components/plan/stack-diagram.tsx`)からこの技術辞書に来た場合、技術詳細ページに「この技術を使用する」ボタンを追加し、押すと企画チャット(`/plan`)に遷移して「○○を使いたい」という発言から会話が始まるようにする予定。

実装時は `src/components/history/history-workspace.tsx` の `handleNewHearing`/`handleResume` と同じパターンが使える:

```ts
useProjectStore.getState().resetProject();
useProjectStore.getState().setPlanText(`${tech.name}を使いたい`);
useProjectStore.getState().addChatMessage({ role: "user", content: `${tech.name}を使いたい` });
router.push("/plan");
```

ただし現状の`PlanWorkspace`の`handleSendMessage`はユーザーの能動的な送信でしか発火しないため、「未回答のユーザーメッセージが1件だけ存在する場合、マウント時にAIの最初のヒアリングターンを自動発火する」処理を`src/components/plan/plan-workspace.tsx`に追加する必要がある。`technologies.slug`がボタンに渡す安定した識別子になる想定。この拡張点は`src/components/tech/technology-detail.tsx`内にもコメントで残してある。
