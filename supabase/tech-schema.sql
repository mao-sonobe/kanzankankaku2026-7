-- Supabase Studio の SQL Editor で実行する。
-- 技術辞書(技術検索ページ)用のテーブル一式。管理者が管理する参照データのため、
-- 全テーブル「読み取りのみ全員可・書き込みはservice role/ダッシュボードのみ」のRLSにしている。

-- =========================================
-- テーブル定義
-- =========================================

create table public.purposes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platforms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.technologies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  logo_url text,
  official_url text,
  difficulty text not null default 'beginner'
    check (difficulty in ('beginner', 'intermediate', 'advanced')),
  cost text not null default 'free'
    check (cost in ('free', 'freemium', 'paid')),
  learning_period text not null default 'short'
    check (learning_period in ('short', 'medium', 'long')),
  japanese_docs text not null default 'moderate'
    check (japanese_docs in ('scarce', 'moderate', 'abundant')),
  popularity text not null default 'moderate'
    check (popularity in ('niche', 'moderate', 'popular')),
  recommendation_score smallint check (recommendation_score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.technology_purposes (
  technology_id uuid not null references public.technologies(id) on delete cascade,
  purpose_id uuid not null references public.purposes(id) on delete cascade,
  primary key (technology_id, purpose_id)
);

create table public.technology_roles (
  technology_id uuid not null references public.technologies(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (technology_id, role_id)
);

create table public.technology_platforms (
  technology_id uuid not null references public.technologies(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete cascade,
  primary key (technology_id, platform_id)
);

create table public.technology_tags (
  technology_id uuid not null references public.technologies(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (technology_id, tag_id)
);

-- 「どの技術を組み合わせればいいか」に答えるための関連技術テーブル。片方向のみ登録し、
-- アプリ側でtechnology_id/related_technology_idの両方向を検索してマージする。
create table public.technology_relations (
  id uuid primary key default gen_random_uuid(),
  technology_id uuid not null
    constraint technology_relations_technology_id_fkey
    references public.technologies(id) on delete cascade,
  related_technology_id uuid not null
    constraint technology_relations_related_technology_id_fkey
    references public.technologies(id) on delete cascade,
  relation_type text not null default 'related'
    check (relation_type in ('related', 'alternative', 'complementary')),
  note text,
  created_at timestamptz not null default now(),
  check (technology_id <> related_technology_id),
  unique (technology_id, related_technology_id, relation_type)
);

create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  technology_id uuid not null references public.technologies(id) on delete cascade,
  title text not null,
  url text not null,
  resource_type text not null default 'article'
    check (resource_type in ('official_doc', 'tutorial', 'video', 'book', 'article', 'course')),
  is_japanese boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

-- =========================================
-- インデックス
-- =========================================

create index purposes_sort_order_idx on public.purposes (sort_order);
create index roles_sort_order_idx on public.roles (sort_order);
create index platforms_sort_order_idx on public.platforms (sort_order);

create index technologies_name_idx on public.technologies (lower(name));

create index technology_purposes_purpose_id_idx on public.technology_purposes (purpose_id);
create index technology_roles_role_id_idx on public.technology_roles (role_id);
create index technology_platforms_platform_id_idx on public.technology_platforms (platform_id);
create index technology_tags_tag_id_idx on public.technology_tags (tag_id);

create index technology_relations_related_technology_id_idx
  on public.technology_relations (related_technology_id);

create index learning_resources_technology_id_idx
  on public.learning_resources (technology_id, sort_order);

-- =========================================
-- RLS(全テーブル: 誰でも読み取り可、書き込みはservice role/ダッシュボードのみ)
-- =========================================

alter table public.purposes enable row level security;
alter table public.roles enable row level security;
alter table public.platforms enable row level security;
alter table public.tags enable row level security;
alter table public.technologies enable row level security;
alter table public.technology_purposes enable row level security;
alter table public.technology_roles enable row level security;
alter table public.technology_platforms enable row level security;
alter table public.technology_tags enable row level security;
alter table public.technology_relations enable row level security;
alter table public.learning_resources enable row level security;

create policy "purposes_select_all" on public.purposes for select using (true);
create policy "roles_select_all" on public.roles for select using (true);
create policy "platforms_select_all" on public.platforms for select using (true);
create policy "tags_select_all" on public.tags for select using (true);
create policy "technologies_select_all" on public.technologies for select using (true);
create policy "technology_purposes_select_all" on public.technology_purposes for select using (true);
create policy "technology_roles_select_all" on public.technology_roles for select using (true);
create policy "technology_platforms_select_all" on public.technology_platforms for select using (true);
create policy "technology_tags_select_all" on public.technology_tags for select using (true);
create policy "technology_relations_select_all" on public.technology_relations for select using (true);
create policy "learning_resources_select_all" on public.learning_resources for select using (true);

-- =========================================
-- 初期データ
-- =========================================

insert into public.purposes (slug, name, description, icon, sort_order) values
('web', 'Webサイトを作りたい', 'ブラウザで動くWebサイト・Webアプリを作りたい人向け', 'Globe', 1),
('mobile', 'スマホアプリを作りたい', 'iOS/Android向けのモバイルアプリを作りたい人向け', 'Smartphone', 2),
('game', 'ゲームを作りたい', 'PC・スマホ・コンシューマー向けのゲームを作りたい人向け', 'Gamepad2', 3),
('data-ai', 'データ分析・AIをやりたい', 'データ分析や機械学習・AIモデルを扱いたい人向け', 'BrainCircuit', 4),
('automation', '業務効率化・自動化をしたい', '定型作業の自動化やツール開発をしたい人向け', 'Workflow', 5);

insert into public.roles (slug, name, description, icon, sort_order) values
('frontend', 'フロントエンド', 'ユーザーの目に触れる画面部分を作る技術', 'MonitorSmartphone', 1),
('backend', 'バックエンド', 'サーバー側の処理・APIを作る技術', 'Server', 2),
('database', 'データベース', 'データを保存・管理する技術', 'Database', 3),
('infra', 'インフラ・デプロイ', '動かす環境を用意し公開する技術', 'Cloud', 4),
('tools', 'ツール・その他', '開発を助けるツールやその他の技術', 'Hammer', 5);

insert into public.platforms (slug, name, sort_order) values
('web', 'Web', 1),
('ios', 'iOS', 2),
('android', 'Android', 3),
('server', 'サーバー', 4),
('desktop', 'デスクトップ', 5);

insert into public.tags (slug, name, description) values
('oss', 'OSS', 'オープンソースソフトウェア'),
('baas', 'BaaS', 'バックエンドをまとめて提供するサービス'),
('static-typed', '静的型付け', '静的型付けの言語'),
('cross-platform', 'クロスプラットフォーム', '複数の環境で動かせる技術');

insert into public.technologies
  (slug, name, description, official_url, difficulty, cost, learning_period, japanese_docs, popularity, recommendation_score)
values
('react', 'React', 'UIを構築するためのJavaScriptライブラリ。コンポーネント指向で大規模開発にも強い。', 'https://react.dev/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 5),
('nextjs', 'Next.js', 'Reactベースのフルスタックフレームワーク。SSR/SSG/APIルートを標準サポート。', 'https://nextjs.org/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 5),
('vuejs', 'Vue.js', '学習コストが低く扱いやすいJavaScriptフレームワーク。', 'https://vuejs.org/', 'beginner', 'free', 'short', 'abundant', 'moderate', 4),
('typescript', 'TypeScript', 'JavaScriptに型を追加した言語。大規模開発でのバグを減らせる。', 'https://www.typescriptlang.org/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 5),
('tailwindcss', 'Tailwind CSS', 'ユーティリティクラスでスタイリングするCSSフレームワーク。', 'https://tailwindcss.com/', 'beginner', 'free', 'short', 'moderate', 'popular', 4),
('nodejs', 'Node.js', 'JavaScriptをサーバーサイドで実行するランタイム。', 'https://nodejs.org/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 5),
('python', 'Python', '文法がシンプルで学びやすく、Web・データ分析・AIまで幅広く使える言語。', 'https://www.python.org/', 'beginner', 'free', 'short', 'abundant', 'popular', 5),
('rails', 'Ruby on Rails', '規約重視で高速に開発できるRubyのWebフレームワーク。', 'https://rubyonrails.org/', 'intermediate', 'free', 'medium', 'abundant', 'moderate', 3),
('postgresql', 'PostgreSQL', '拡張性が高いオープンソースのリレーショナルデータベース。', 'https://www.postgresql.org/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 5),
('mysql', 'MySQL', '世界で広く使われているオープンソースのリレーショナルデータベース。', 'https://www.mysql.com/', 'beginner', 'free', 'short', 'abundant', 'popular', 4),
('supabase', 'Supabase', 'PostgreSQLベースのオープンソースBaaS。認証・DB・ストレージをまとめて提供。', 'https://supabase.com/', 'beginner', 'freemium', 'short', 'moderate', 'moderate', 5),
('firebase', 'Firebase', 'Google提供のBaaS。認証・DB・ホスティングなどをまとめて提供。', 'https://firebase.google.com/', 'beginner', 'freemium', 'short', 'abundant', 'popular', 4),
('mongodb', 'MongoDB', 'ドキュメント指向のNoSQLデータベース。', 'https://www.mongodb.com/', 'intermediate', 'freemium', 'medium', 'moderate', 'moderate', 3),
('docker', 'Docker', 'アプリケーションをコンテナ化して実行環境を統一するツール。', 'https://www.docker.com/', 'intermediate', 'free', 'medium', 'abundant', 'popular', 4),
('aws', 'AWS', 'Amazonが提供するクラウドインフラサービス群。', 'https://aws.amazon.com/', 'advanced', 'paid', 'long', 'abundant', 'popular', 4),
('vercel', 'Vercel', 'フロントエンド・Next.jsアプリのデプロイに特化したホスティングサービス。', 'https://vercel.com/', 'beginner', 'freemium', 'short', 'moderate', 'popular', 4),
('git', 'Git', 'ソースコードのバージョン管理システム。', 'https://git-scm.com/', 'beginner', 'free', 'short', 'abundant', 'popular', 5),
('figma', 'Figma', 'ブラウザ上で使えるUI/UXデザインツール。', 'https://www.figma.com/', 'beginner', 'freemium', 'short', 'moderate', 'popular', 3),
('flutter', 'Flutter', 'Googleが開発するクロスプラットフォームアプリ開発フレームワーク。', 'https://flutter.dev/', 'intermediate', 'free', 'medium', 'moderate', 'moderate', 4),
('swift', 'Swift', 'Appleが開発するiOSアプリ開発向けの言語。', 'https://www.swift.org/', 'intermediate', 'free', 'medium', 'moderate', 'moderate', 3),
('unity', 'Unity', '2D/3Dゲーム開発で広く使われるゲームエンジン。', 'https://unity.com/', 'intermediate', 'freemium', 'long', 'abundant', 'popular', 4),
('unrealengine', 'Unreal Engine', '高品質な3Dグラフィックに強いゲームエンジン。', 'https://www.unrealengine.com/', 'advanced', 'freemium', 'long', 'moderate', 'moderate', 3);

insert into public.technology_purposes (technology_id, purpose_id)
select t.id, p.id
from (values
  ('react','web'), ('nextjs','web'), ('vuejs','web'),
  ('typescript','web'), ('typescript','mobile'), ('typescript','automation'),
  ('tailwindcss','web'),
  ('nodejs','web'), ('nodejs','automation'),
  ('python','data-ai'), ('python','automation'), ('python','web'),
  ('rails','web'),
  ('postgresql','web'), ('postgresql','data-ai'), ('postgresql','automation'),
  ('mysql','web'),
  ('supabase','web'), ('supabase','mobile'),
  ('firebase','web'), ('firebase','mobile'),
  ('mongodb','web'),
  ('docker','web'), ('docker','automation'),
  ('aws','web'), ('aws','data-ai'), ('aws','automation'),
  ('vercel','web'),
  ('git','web'), ('git','mobile'), ('git','game'), ('git','data-ai'), ('git','automation'),
  ('figma','web'), ('figma','mobile'),
  ('flutter','mobile'),
  ('swift','mobile'),
  ('unity','game'),
  ('unrealengine','game')
) as pairs(tech_slug, purpose_slug)
join public.technologies t on t.slug = pairs.tech_slug
join public.purposes p on p.slug = pairs.purpose_slug;

insert into public.technology_roles (technology_id, role_id)
select t.id, r.id
from (values
  ('react','frontend'),
  ('nextjs','frontend'), ('nextjs','backend'),
  ('vuejs','frontend'),
  ('typescript','frontend'), ('typescript','backend'), ('typescript','tools'),
  ('tailwindcss','frontend'),
  ('nodejs','backend'),
  ('python','backend'), ('python','tools'),
  ('rails','backend'),
  ('postgresql','database'),
  ('mysql','database'),
  ('supabase','database'), ('supabase','backend'),
  ('firebase','database'), ('firebase','backend'),
  ('mongodb','database'),
  ('docker','infra'),
  ('aws','infra'),
  ('vercel','infra'),
  ('git','tools'),
  ('figma','tools'),
  ('flutter','frontend'),
  ('swift','frontend'),
  ('unity','tools'),
  ('unrealengine','tools')
) as pairs(tech_slug, role_slug)
join public.technologies t on t.slug = pairs.tech_slug
join public.roles r on r.slug = pairs.role_slug;

insert into public.technology_platforms (technology_id, platform_id)
select t.id, pf.id
from (values
  ('react','web'),
  ('nextjs','web'), ('nextjs','server'),
  ('vuejs','web'),
  ('typescript','web'), ('typescript','server'),
  ('tailwindcss','web'),
  ('nodejs','server'),
  ('python','server'), ('python','desktop'),
  ('rails','server'),
  ('postgresql','server'),
  ('mysql','server'),
  ('supabase','web'), ('supabase','server'),
  ('firebase','web'), ('firebase','ios'), ('firebase','android'), ('firebase','server'),
  ('mongodb','server'),
  ('docker','server'), ('docker','desktop'),
  ('aws','server'),
  ('vercel','server'),
  ('git','web'), ('git','server'), ('git','desktop'),
  ('figma','web'), ('figma','desktop'),
  ('flutter','ios'), ('flutter','android'),
  ('swift','ios'),
  ('unity','desktop'), ('unity','ios'), ('unity','android'), ('unity','web'),
  ('unrealengine','desktop'), ('unrealengine','ios'), ('unrealengine','android')
) as pairs(tech_slug, platform_slug)
join public.technologies t on t.slug = pairs.tech_slug
join public.platforms pf on pf.slug = pairs.platform_slug;

insert into public.technology_tags (technology_id, tag_id)
select t.id, tg.id
from (values
  ('react','oss'), ('vuejs','oss'), ('nodejs','oss'), ('python','oss'),
  ('postgresql','oss'), ('mysql','oss'), ('docker','oss'), ('git','oss'), ('flutter','oss'),
  ('supabase','baas'), ('firebase','baas'),
  ('typescript','static-typed'), ('swift','static-typed'),
  ('flutter','cross-platform'), ('unity','cross-platform')
) as pairs(tech_slug, tag_slug)
join public.technologies t on t.slug = pairs.tech_slug
join public.tags tg on tg.slug = pairs.tag_slug;

insert into public.technology_relations (technology_id, related_technology_id, relation_type, note)
select t1.id, t2.id, v.relation_type, v.note
from (values
  ('nextjs', 'supabase', 'complementary', 'フルスタック構成の定番の組み合わせ'),
  ('react', 'nextjs', 'related', 'Reactをベースにしたフレームワーク'),
  ('vuejs', 'react', 'alternative', null),
  ('postgresql', 'mysql', 'alternative', null),
  ('postgresql', 'supabase', 'complementary', 'SupabaseはPostgreSQLをベースにしたBaaS'),
  ('docker', 'aws', 'complementary', 'コンテナをクラウドにデプロイする組み合わせ'),
  ('flutter', 'firebase', 'complementary', 'モバイルアプリのバックエンドとして定番'),
  ('flutter', 'swift', 'alternative', null),
  ('typescript', 'react', 'related', 'Reactと組み合わせて型安全に開発できる'),
  ('unity', 'unrealengine', 'alternative', null)
) as v(tech_slug, related_slug, relation_type, note)
join public.technologies t1 on t1.slug = v.tech_slug
join public.technologies t2 on t2.slug = v.related_slug;

insert into public.learning_resources (technology_id, title, url, resource_type, is_japanese, sort_order)
select t.id, v.title, v.url, v.resource_type, v.is_japanese, v.sort_order
from (values
  ('react', 'React公式ドキュメント(日本語)', 'https://ja.react.dev/', 'official_doc', true, 0),
  ('nextjs', 'Next.js公式ドキュメント', 'https://nextjs.org/docs', 'official_doc', false, 0),
  ('python', 'Python公式チュートリアル(日本語)', 'https://docs.python.org/ja/3/tutorial/', 'official_doc', true, 0),
  ('supabase', 'Supabase公式ドキュメント', 'https://supabase.com/docs', 'official_doc', false, 0),
  ('docker', 'Docker公式ドキュメント', 'https://docs.docker.com/', 'official_doc', false, 0),
  ('typescript', 'サバイバルTypeScript(日本語)', 'https://typescriptbook.jp/', 'tutorial', true, 0)
) as v(tech_slug, title, url, resource_type, is_japanese, sort_order)
join public.technologies t on t.slug = v.tech_slug;

-- =========================================
-- 追加データ(supabase/tech-schema-additions-1.sqlと同内容。新規セットアップならここまで含めて
-- 1回で流せる。既に上記までを実行済みの環境には、tech-schema-additions-1.sqlだけを実行すればよい)
-- =========================================

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
