-- プロダクト履歴テーブル。
-- Supabaseダッシュボード → SQL Editor に貼り付けて実行してください。
-- (ログイン・ゲストログインを有効にした後に実行するとスムーズです)

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '無題のプロダクト',
  plan_step smallint not null default 1,
  plan_text text not null default '',
  project_title text,
  hearing_ready boolean not null default false,
  chat_messages jsonb not null default '[]'::jsonb,
  stack_proposal jsonb,
  stack_quiz jsonb not null default '{}'::jsonb,
  stack_quiz_skipped boolean not null default false,
  generated_files jsonb not null default '[]'::jsonb,
  chunked_files jsonb not null default '{}'::jsonb,
  slot_answers jsonb not null default '{}'::jsonb,
  feature_map jsonb,
  feature_flows jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_user_id_updated_at_idx
  on public.products (user_id, updated_at desc);

alter table public.products enable row level security;

-- 自分の行だけ読み書きできる(ゲストログインもauth.users行を持つため同じ仕組みで動く)。
create policy "Users can view their own products"
  on public.products for select
  using (auth.uid() = user_id);

create policy "Users can insert their own products"
  on public.products for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own products"
  on public.products for update
  using (auth.uid() = user_id);

create policy "Users can delete their own products"
  on public.products for delete
  using (auth.uid() = user_id);

-- updated_atを自動更新する。
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();
