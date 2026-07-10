-- サイドバーでプロダクト名を手動リネームできるようにするための追加カラム。
-- Supabaseダッシュボード → SQL Editor に貼り付けて実行してください。
-- (true の間は自動保存時にtitleを上書きしない = リネームした名前を保持する)

alter table public.products
  add column if not exists title_is_custom boolean not null default false;
