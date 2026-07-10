-- tech-schema.sql 実行後に追加で実行するSQL(既存テーブルへの追記のみ、CREATE TABLE等は含まない)。
-- Supabase Studio の SQL Editor に貼り付けて実行してください。
-- HTML/CSS/JavaScript/C/C++/C#/Java/Kotlin/PHP/Laravel/Express/FastAPI/Django/Flask/Nuxt.js/Svelte/
-- Electron/React Native/Go/Rust/Redis/SQLite/Oracle Database/Azure/Google Cloud/GitHub/GitHub Actions/
-- npm/pnpm/Yarn/Ruby/Deno/Bun/Objective-C/Spring Boot/ASP.NET Core/NestJS/GraphQL/Kubernetes/Terraform/
-- Nginx/Linux/Vite/Jest・Vitest/WordPress/Godot を追加する(計46件)。

insert into public.technologies
  (slug, name, description, official_url, difficulty, cost, learning_period, japanese_docs, popularity, recommendation_score)
values
('html', 'HTML', 'Webページの構造を定義するマークアップ言語。Web開発の最も基本的な技術。', 'https://developer.mozilla.org/ja/docs/Web/HTML', 'beginner', 'free', 'short', 'abundant', 'popular', 5),
('css', 'CSS', 'Webページの見た目・レイアウトを指定するスタイルシート言語。', 'https://developer.mozilla.org/ja/docs/Web/CSS', 'beginner', 'free', 'short', 'abundant', 'popular', 5),
('javascript', 'JavaScript', 'Webブラウザで動作するプログラミング言語。Node.jsを使えばサーバーサイドでも動く。', 'https://developer.mozilla.org/ja/docs/Web/JavaScript', 'beginner', 'free', 'medium', 'abundant', 'popular', 5),
('c', 'C', '低レベルな操作が可能な歴史あるプログラミング言語。OSや組み込み開発の基盤。', 'https://en.cppreference.com/w/c', 'advanced', 'free', 'long', 'abundant', 'moderate', 3),
('cpp', 'C++', 'Cを拡張した言語。高いパフォーマンスが必要なゲーム・ソフトウェア開発で使われる。', 'https://en.cppreference.com/w/cpp', 'advanced', 'free', 'long', 'abundant', 'moderate', 3),
('csharp', 'C#', 'Microsoftが開発した言語。Unityでのゲーム開発や業務システム開発で使われる。', 'https://learn.microsoft.com/ja-jp/dotnet/csharp/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 4),
('java', 'Java', '「一度書けばどこでも動く」を掲げる、業務システムやAndroidアプリ開発で広く使われる言語。', 'https://www.java.com/ja/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 4),
('kotlin', 'Kotlin', 'JVM上で動く言語。Android公式推奨言語で、Javaよりも簡潔に書ける。', 'https://kotlinlang.org/', 'intermediate', 'free', 'medium', 'moderate', 'moderate', 4),
('php', 'PHP', 'Web開発向けに広く使われるサーバーサイド言語。WordPressなど多くのCMSの基盤。', 'https://www.php.net/', 'beginner', 'free', 'short', 'abundant', 'moderate', 3),
('laravel', 'Laravel', 'PHPの高機能なWebフレームワーク。規約が整っており高速に開発できる。', 'https://laravel.com/', 'intermediate', 'free', 'medium', 'abundant', 'moderate', 4),
('express', 'Express', 'Node.js向けの軽量なWebフレームワーク。シンプルなAPI開発に向く。', 'https://expressjs.com/ja/', 'beginner', 'free', 'short', 'abundant', 'popular', 4),
('fastapi', 'FastAPI', 'Python向けの高速なWeb/APIフレームワーク。型ヒントを活用した自動ドキュメント生成が特徴。', 'https://fastapi.tiangolo.com/ja/', 'intermediate', 'free', 'short', 'moderate', 'popular', 5),
('django', 'Django', 'Python向けの高機能なWebフレームワーク。管理画面などが標準で付いてくる。', 'https://www.djangoproject.com/', 'intermediate', 'free', 'medium', 'abundant', 'moderate', 4),
('flask', 'Flask', 'Python向けの軽量なWebフレームワーク。小規模なアプリやAPIに向く。', 'https://flask.palletsprojects.com/', 'beginner', 'free', 'short', 'abundant', 'moderate', 4),
('nuxtjs', 'Nuxt.js', 'Vue.jsベースのフルスタックフレームワーク。SSR/SSGを標準サポート。', 'https://nuxt.com/', 'intermediate', 'free', 'medium', 'moderate', 'moderate', 4),
('svelte', 'Svelte', 'コンパイル時に最適化される軽量なフロントエンドフレームワーク。', 'https://svelte.dev/', 'beginner', 'free', 'short', 'scarce', 'moderate', 4),
('electron', 'Electron', 'Web技術(HTML/CSS/JS)でデスクトップアプリを作れるフレームワーク。', 'https://www.electronjs.org/ja/', 'intermediate', 'free', 'medium', 'moderate', 'moderate', 3),
('reactnative', 'React Native', 'Reactの知識でiOS/Androidアプリを作れるモバイル向けフレームワーク。', 'https://reactnative.dev/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 4),
('go', 'Go', 'Googleが開発したシンプルで高速なプログラミング言語。サーバーサイド開発で人気。', 'https://go.dev/', 'intermediate', 'free', 'medium', 'moderate', 'popular', 4),
('rust', 'Rust', '安全性と速度を両立する低レベル言語。メモリ管理の安全性が特徴。', 'https://www.rust-lang.org/ja', 'advanced', 'free', 'long', 'moderate', 'popular', 4),
('redis', 'Redis', '高速なインメモリ型のデータベース。キャッシュやセッション管理で使われる。', 'https://redis.io/', 'beginner', 'free', 'short', 'moderate', 'popular', 4),
('sqlite', 'SQLite', 'ファイル1つで動く軽量なリレーショナルデータベース。組み込み用途やモバイルアプリで使われる。', 'https://www.sqlite.org/index.html', 'beginner', 'free', 'short', 'abundant', 'popular', 4),
('oracle', 'Oracle Database', '大企業の業務システムで広く使われる商用リレーショナルデータベース。', 'https://www.oracle.com/jp/database/', 'advanced', 'paid', 'long', 'abundant', 'moderate', 2),
('azure', 'Azure', 'Microsoftが提供するクラウドインフラサービス群。', 'https://azure.microsoft.com/ja-jp/', 'advanced', 'paid', 'long', 'abundant', 'popular', 3),
('gcp', 'Google Cloud', 'Googleが提供するクラウドインフラサービス群。データ分析・AI関連のサービスが強い。', 'https://cloud.google.com/?hl=ja', 'advanced', 'paid', 'long', 'abundant', 'popular', 3),
('github', 'GitHub', 'Gitリポジトリをホスティングするサービス。コラボレーションやIssue/PR管理を提供。', 'https://github.com/', 'beginner', 'freemium', 'short', 'abundant', 'popular', 5),
('githubactions', 'GitHub Actions', 'GitHubに統合されたCI/CD自動化サービス。テストやデプロイを自動化できる。', 'https://docs.github.com/ja/actions', 'intermediate', 'freemium', 'medium', 'abundant', 'popular', 4),
('npm', 'npm', 'Node.jsの標準パッケージマネージャー。JavaScriptライブラリの配布・管理に使う。', 'https://www.npmjs.com/', 'beginner', 'free', 'short', 'abundant', 'popular', 4),
('pnpm', 'pnpm', 'ディスク容量を節約し高速に動作するパッケージマネージャー。npmの代替。', 'https://pnpm.io/ja/', 'beginner', 'free', 'short', 'moderate', 'moderate', 4),
('yarn', 'Yarn', 'Facebookが開発したパッケージマネージャー。npmの代替として広く使われる。', 'https://yarnpkg.com/', 'beginner', 'free', 'short', 'abundant', 'moderate', 3),
('ruby', 'Ruby', 'シンプルで書きやすい文法が特徴のプログラミング言語。Ruby on Railsのベースになっている。', 'https://www.ruby-lang.org/ja/', 'beginner', 'free', 'short', 'abundant', 'moderate', 3),
('deno', 'Deno', 'TypeScriptを標準サポートする、セキュリティを重視したJavaScript/TypeScriptランタイム。', 'https://deno.com/', 'intermediate', 'free', 'short', 'scarce', 'moderate', 3),
('bun', 'Bun', '高速な実行速度を売りにしたJavaScript/TypeScriptランタイム・パッケージマネージャー。', 'https://bun.sh/', 'intermediate', 'free', 'short', 'scarce', 'moderate', 3),
('objectivec', 'Objective-C', 'Swift以前に使われていたiOS/macOSアプリ開発向けの言語。', 'https://developer.apple.com/documentation/objectivec', 'advanced', 'free', 'long', 'moderate', 'niche', 2),
('springboot', 'Spring Boot', 'Java向けの代表的なWeb・業務システム開発フレームワーク。企業システムで広く使われる。', 'https://spring.io/projects/spring-boot', 'advanced', 'free', 'long', 'abundant', 'moderate', 3),
('aspnetcore', 'ASP.NET Core', 'C#向けの高性能なWebフレームワーク。Microsoftが開発。', 'https://dotnet.microsoft.com/ja-jp/apps/aspnet', 'intermediate', 'free', 'medium', 'abundant', 'moderate', 3),
('nestjs', 'NestJS', 'TypeScriptで書く、構造化されたNode.jsフレームワーク。大規模開発に向く。', 'https://nestjs.com/', 'intermediate', 'free', 'medium', 'moderate', 'moderate', 4),
('graphql', 'GraphQL', 'REST APIに代わる、必要なデータだけを柔軟に取得できるAPIクエリ言語・仕様。', 'https://graphql.org/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 4),
('kubernetes', 'Kubernetes', '複数のコンテナを自動でデプロイ・スケール・管理するオーケストレーションツール。', 'https://kubernetes.io/ja/', 'advanced', 'free', 'long', 'abundant', 'popular', 3),
('terraform', 'Terraform', 'クラウドのインフラ構成をコードで管理・自動構築するIaCツール。', 'https://www.terraform.io/', 'advanced', 'free', 'long', 'abundant', 'moderate', 3),
('nginx', 'Nginx', 'Webサーバー・リバースプロキシとして広く使われる高性能ミドルウェア。', 'https://nginx.org/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 3),
('linux', 'Linux', 'サーバー用途で定番のオープンソースOS。コマンドライン操作の基礎を学べる。', 'https://www.linux.org/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 4),
('vite', 'Vite', '高速な開発サーバーとビルドを提供するフロントエンド向けビルドツール。', 'https://ja.vite.dev/', 'beginner', 'free', 'short', 'abundant', 'popular', 4),
('jestvitest', 'Jest / Vitest', 'JavaScript/TypeScriptのテストを書くためのテストフレームワーク。', 'https://vitest.dev/', 'intermediate', 'free', 'short', 'abundant', 'popular', 4),
('wordpress', 'WordPress', '世界で最も使われているCMS。プラグイン・テーマで簡単にWebサイトを構築できる。', 'https://ja.wordpress.org/', 'beginner', 'freemium', 'short', 'abundant', 'popular', 3),
('godot', 'Godot', 'オープンソースの無料ゲームエンジン。UnityやUnreal Engineの代替。', 'https://godotengine.org/', 'intermediate', 'free', 'long', 'moderate', 'moderate', 4)
on conflict (slug) do nothing;

insert into public.technology_purposes (technology_id, purpose_id)
select t.id, p.id
from (values
  ('html','web'), ('css','web'), ('javascript','web'), ('javascript','automation'),
  ('c','automation'), ('cpp','game'), ('cpp','automation'),
  ('csharp','game'), ('csharp','web'), ('csharp','automation'),
  ('java','web'), ('java','automation'), ('kotlin','mobile'), ('kotlin','web'),
  ('php','web'), ('laravel','web'), ('express','web'), ('express','automation'),
  ('fastapi','web'), ('fastapi','data-ai'), ('fastapi','automation'),
  ('django','web'), ('django','data-ai'), ('flask','web'), ('flask','automation'),
  ('nuxtjs','web'), ('svelte','web'), ('electron','automation'),
  ('reactnative','mobile'), ('go','web'), ('go','automation'),
  ('rust','automation'), ('redis','web'), ('redis','automation'),
  ('sqlite','web'), ('sqlite','mobile'), ('sqlite','automation'),
  ('oracle','web'), ('oracle','automation'),
  ('azure','web'), ('azure','data-ai'), ('azure','automation'),
  ('gcp','web'), ('gcp','data-ai'), ('gcp','automation'),
  ('github','web'), ('github','mobile'), ('github','game'), ('github','data-ai'), ('github','automation'),
  ('githubactions','web'), ('githubactions','automation'),
  ('npm','web'), ('npm','automation'), ('pnpm','web'), ('pnpm','automation'), ('yarn','web'), ('yarn','automation'),
  ('ruby','web'), ('ruby','automation'), ('deno','web'), ('deno','automation'), ('bun','web'), ('bun','automation'),
  ('objectivec','mobile'),
  ('springboot','web'), ('springboot','automation'), ('aspnetcore','web'), ('aspnetcore','automation'),
  ('nestjs','web'), ('nestjs','automation'), ('graphql','web'), ('graphql','automation'),
  ('kubernetes','web'), ('kubernetes','automation'), ('terraform','web'), ('terraform','automation'),
  ('nginx','web'), ('nginx','automation'),
  ('linux','web'), ('linux','automation'), ('linux','data-ai'),
  ('vite','web'), ('jestvitest','web'), ('jestvitest','automation'),
  ('wordpress','web'), ('godot','game')
) as pairs(tech_slug, purpose_slug)
join public.technologies t on t.slug = pairs.tech_slug
join public.purposes p on p.slug = pairs.purpose_slug
on conflict do nothing;

insert into public.technology_roles (technology_id, role_id)
select t.id, r.id
from (values
  ('html','frontend'), ('css','frontend'), ('javascript','frontend'), ('javascript','backend'),
  ('c','backend'), ('c','tools'), ('cpp','backend'), ('cpp','tools'),
  ('csharp','backend'), ('csharp','frontend'), ('java','backend'), ('kotlin','backend'), ('kotlin','frontend'),
  ('php','backend'), ('laravel','backend'), ('express','backend'),
  ('fastapi','backend'), ('django','backend'), ('flask','backend'),
  ('nuxtjs','frontend'), ('nuxtjs','backend'), ('svelte','frontend'),
  ('electron','tools'), ('electron','frontend'), ('reactnative','frontend'),
  ('go','backend'), ('rust','backend'), ('rust','tools'),
  ('redis','database'), ('sqlite','database'), ('oracle','database'),
  ('azure','infra'), ('gcp','infra'), ('github','tools'), ('githubactions','infra'), ('githubactions','tools'),
  ('npm','tools'), ('pnpm','tools'), ('yarn','tools'),
  ('ruby','backend'), ('deno','backend'), ('bun','backend'), ('bun','tools'), ('objectivec','frontend'),
  ('springboot','backend'), ('aspnetcore','backend'), ('nestjs','backend'), ('graphql','backend'), ('graphql','frontend'),
  ('kubernetes','infra'), ('terraform','infra'), ('nginx','infra'), ('linux','infra'), ('linux','tools'),
  ('vite','tools'), ('vite','frontend'), ('jestvitest','tools'), ('wordpress','tools'), ('wordpress','backend'),
  ('godot','tools')
) as pairs(tech_slug, role_slug)
join public.technologies t on t.slug = pairs.tech_slug
join public.roles r on r.slug = pairs.role_slug
on conflict do nothing;

insert into public.technology_platforms (technology_id, platform_id)
select t.id, pf.id
from (values
  ('html','web'), ('css','web'), ('javascript','web'), ('javascript','server'),
  ('c','server'), ('c','desktop'), ('cpp','desktop'), ('cpp','server'),
  ('csharp','desktop'), ('csharp','server'), ('java','server'), ('java','android'), ('java','desktop'),
  ('kotlin','android'), ('kotlin','server'), ('php','server'), ('laravel','server'), ('express','server'),
  ('fastapi','server'), ('django','server'), ('flask','server'),
  ('nuxtjs','web'), ('nuxtjs','server'), ('svelte','web'), ('electron','desktop'),
  ('reactnative','ios'), ('reactnative','android'), ('go','server'), ('rust','server'), ('rust','desktop'),
  ('redis','server'), ('sqlite','server'), ('sqlite','desktop'), ('sqlite','ios'), ('sqlite','android'),
  ('oracle','server'), ('azure','server'), ('gcp','server'),
  ('github','web'), ('githubactions','server'), ('npm','server'), ('npm','desktop'),
  ('pnpm','server'), ('pnpm','desktop'), ('yarn','server'), ('yarn','desktop'),
  ('ruby','server'), ('deno','server'), ('bun','server'), ('objectivec','ios'),
  ('springboot','server'), ('aspnetcore','server'), ('nestjs','server'), ('graphql','server'), ('graphql','web'),
  ('kubernetes','server'), ('terraform','server'), ('nginx','server'),
  ('linux','server'), ('linux','desktop'), ('vite','web'), ('vite','server'),
  ('jestvitest','web'), ('jestvitest','server'), ('wordpress','server'),
  ('godot','desktop'), ('godot','ios'), ('godot','android'), ('godot','web')
) as pairs(tech_slug, platform_slug)
join public.technologies t on t.slug = pairs.tech_slug
join public.platforms pf on pf.slug = pairs.platform_slug
on conflict do nothing;

insert into public.technology_tags (technology_id, tag_id)
select t.id, tg.id
from (values
  ('ruby','oss'), ('deno','oss'), ('bun','oss'), ('nestjs','oss'), ('kubernetes','oss'), ('terraform','oss'),
  ('nginx','oss'), ('linux','oss'), ('vite','oss'), ('jestvitest','oss'), ('wordpress','oss'), ('godot','oss'),
  ('springboot','oss'), ('aspnetcore','oss'), ('go','oss'), ('rust','oss'), ('php','oss'), ('laravel','oss'),
  ('express','oss'), ('fastapi','oss'), ('django','oss'), ('flask','oss'), ('nuxtjs','oss'), ('svelte','oss'),
  ('electron','oss'), ('reactnative','oss'), ('redis','oss'), ('sqlite','oss'), ('npm','oss'), ('pnpm','oss'), ('yarn','oss'),
  ('csharp','static-typed'), ('java','static-typed'), ('kotlin','static-typed'), ('rust','static-typed'), ('go','static-typed'),
  ('electron','cross-platform'), ('reactnative','cross-platform'), ('godot','cross-platform')
) as pairs(tech_slug, tag_slug)
join public.technologies t on t.slug = pairs.tech_slug
join public.tags tg on tg.slug = pairs.tag_slug
on conflict do nothing;

insert into public.technology_relations (technology_id, related_technology_id, relation_type, note)
select t1.id, t2.id, v.relation_type, v.note
from (values
  ('nodejs', 'express', 'related', 'Node.js向けの代表的なWebフレームワーク'),
  ('python', 'django', 'related', null),
  ('python', 'flask', 'related', null),
  ('python', 'fastapi', 'related', null),
  ('django', 'flask', 'alternative', null),
  ('django', 'fastapi', 'alternative', null),
  ('flask', 'fastapi', 'alternative', null),
  ('php', 'laravel', 'related', null),
  ('rails', 'laravel', 'alternative', null),
  ('vuejs', 'nuxtjs', 'related', null),
  ('nextjs', 'nuxtjs', 'alternative', null),
  ('react', 'svelte', 'alternative', null),
  ('vuejs', 'svelte', 'alternative', null),
  ('react', 'reactnative', 'related', 'Reactの知識をモバイル開発に活かせる'),
  ('flutter', 'reactnative', 'alternative', null),
  ('nodejs', 'electron', 'related', null),
  ('aws', 'azure', 'alternative', null),
  ('aws', 'gcp', 'alternative', null),
  ('azure', 'gcp', 'alternative', null),
  ('postgresql', 'sqlite', 'alternative', null),
  ('postgresql', 'oracle', 'alternative', null),
  ('mysql', 'oracle', 'alternative', null),
  ('postgresql', 'redis', 'complementary', 'DB本体とキャッシュを併用する構成が定番'),
  ('nodejs', 'redis', 'complementary', null),
  ('git', 'github', 'related', 'Gitのホスティングサービス'),
  ('github', 'githubactions', 'complementary', 'GitHub上でCI/CDを回す定番の組み合わせ'),
  ('docker', 'githubactions', 'complementary', null),
  ('nodejs', 'npm', 'related', 'Node.js標準のパッケージマネージャー'),
  ('npm', 'yarn', 'alternative', null),
  ('npm', 'pnpm', 'alternative', null),
  ('yarn', 'pnpm', 'alternative', null),
  ('go', 'nodejs', 'alternative', null),
  ('rust', 'go', 'alternative', null),
  ('c', 'cpp', 'related', null),
  ('csharp', 'unity', 'related', 'Unityの主要な開発言語'),
  ('java', 'kotlin', 'related', null),
  ('ruby', 'rails', 'related', 'Ruby on Railsのベース言語'),
  ('nodejs', 'deno', 'alternative', null),
  ('nodejs', 'bun', 'alternative', null),
  ('deno', 'bun', 'alternative', null),
  ('swift', 'objectivec', 'alternative', null),
  ('java', 'springboot', 'related', null),
  ('csharp', 'aspnetcore', 'related', null),
  ('nodejs', 'nestjs', 'related', null),
  ('typescript', 'nestjs', 'related', null),
  ('docker', 'kubernetes', 'complementary', 'コンテナを本格運用する際の定番の組み合わせ'),
  ('aws', 'kubernetes', 'complementary', null),
  ('docker', 'terraform', 'complementary', null),
  ('aws', 'terraform', 'complementary', null),
  ('nginx', 'docker', 'complementary', null),
  ('linux', 'docker', 'complementary', null),
  ('react', 'vite', 'complementary', 'Reactアプリのビルドツールとして定番'),
  ('vuejs', 'vite', 'complementary', null),
  ('typescript', 'jestvitest', 'complementary', null),
  ('php', 'wordpress', 'related', null),
  ('unity', 'godot', 'alternative', null),
  ('unrealengine', 'godot', 'alternative', null)
) as v(tech_slug, related_slug, relation_type, note)
join public.technologies t1 on t1.slug = v.tech_slug
join public.technologies t2 on t2.slug = v.related_slug
on conflict (technology_id, related_technology_id, relation_type) do nothing;

-- 再実行時に同じリソースが重複登録されないようにする(既存分にも安全に適用できる)。
create unique index if not exists learning_resources_technology_id_url_idx
  on public.learning_resources (technology_id, url);

insert into public.learning_resources (technology_id, title, url, resource_type, is_japanese, sort_order)
select t.id, v.title, v.url, v.resource_type, v.is_japanese, v.sort_order
from (values
  ('javascript', 'JavaScript公式リファレンス(MDN, 日本語)', 'https://developer.mozilla.org/ja/docs/Web/JavaScript', 'official_doc', true, 0),
  ('go', 'A Tour of Go(公式)', 'https://go.dev/tour/', 'official_doc', false, 0),
  ('rust', 'The Rust Programming Language 日本語版', 'https://doc.rust-jp.rs/book-ja/', 'official_doc', true, 0),
  ('django', 'Django公式チュートリアル(日本語)', 'https://docs.djangoproject.com/ja/stable/intro/tutorial01/', 'official_doc', true, 0),
  ('express', 'Express公式ガイド(日本語)', 'https://expressjs.com/ja/starter/installing.html', 'official_doc', true, 0),
  ('csharp', 'C#プログラミングガイド(日本語)', 'https://learn.microsoft.com/ja-jp/dotnet/csharp/programming-guide/', 'official_doc', true, 0),
  ('java', 'Java公式チュートリアル', 'https://docs.oracle.com/javase/tutorial/', 'official_doc', false, 0),
  ('github', 'GitHub Docs(日本語)', 'https://docs.github.com/ja', 'official_doc', true, 0),
  ('ruby', 'Ruby公式ドキュメント(日本語)', 'https://www.ruby-lang.org/ja/documentation/', 'official_doc', true, 0),
  ('kubernetes', 'Kubernetes公式ドキュメント(日本語)', 'https://kubernetes.io/ja/docs/home/', 'official_doc', true, 0),
  ('wordpress', 'WordPress公式サポート(日本語)', 'https://ja.wordpress.org/support/', 'official_doc', true, 0),
  ('vite', 'Vite公式ガイド', 'https://ja.vite.dev/guide/', 'official_doc', true, 0)
) as v(tech_slug, title, url, resource_type, is_japanese, sort_order)
join public.technologies t on t.slug = v.tech_slug
on conflict (technology_id, url) do nothing;
