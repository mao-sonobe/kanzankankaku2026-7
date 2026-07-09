-- Supabase Studio の SQL Editor で実行する。
-- ヒアリング(企画チャット〜生成コードまでの成果物一式)をユーザーごとに保存するテーブル。

create table public.hearings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  plan_step smallint not null default 1,
  last_screen text not null default 'plan' check (last_screen in ('plan', 'build', 'learn')),
  plan_text text not null default '',
  hearing_ready boolean not null default false,
  chat_messages jsonb not null default '[]',
  stack_proposal jsonb,
  stack_quiz jsonb not null default '{}',
  stack_quiz_skipped boolean not null default false,
  generated_files jsonb not null default '[]',
  chunked_files jsonb not null default '{}',
  slot_answers jsonb not null default '{}',
  data_flow jsonb,
  feature_flows jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hearings enable row level security;

create policy "hearings_select_own" on public.hearings
  for select using (auth.uid() = user_id);
create policy "hearings_insert_own" on public.hearings
  for insert with check (auth.uid() = user_id);
create policy "hearings_update_own" on public.hearings
  for update using (auth.uid() = user_id);
create policy "hearings_delete_own" on public.hearings
  for delete using (auth.uid() = user_id);

create index hearings_user_id_updated_at_idx on public.hearings (user_id, updated_at desc);

-- 既に上記でテーブルを作成済みの場合、last_screen列を追加するには以下だけを実行する:
-- alter table public.hearings
--   add column last_screen text not null default 'plan' check (last_screen in ('plan', 'build', 'learn'));
