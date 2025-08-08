-- Create book_versions table
create table if not exists public.book_versions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, name)
);

alter table public.book_versions enable row level security;

-- Policies (drop then create to avoid duplicates)
drop policy if exists "Public can read book_versions" on public.book_versions;
create policy "Public can read book_versions"
  on public.book_versions for select
  using (true);

drop policy if exists "Public can manage book_versions" on public.book_versions;
create policy "Public can manage book_versions"
  on public.book_versions for all
  using (true)
  with check (true);

-- Ensure timestamp trigger function exists
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = 'public';

-- Trigger for updated_at on book_versions
drop trigger if exists update_book_versions_updated_at on public.book_versions;
create trigger update_book_versions_updated_at
before update on public.book_versions
for each row execute function public.update_updated_at_column();

-- Add version_id to chapters
alter table public.chapters add column if not exists version_id uuid references public.book_versions(id) on delete cascade;
create index if not exists idx_chapters_version_id on public.chapters(version_id);

-- Comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  version_id uuid references public.book_versions(id) on delete set null,
  anchor jsonb,
  content text not null,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.comments enable row level security;

drop policy if exists "Public can read comments" on public.comments;
create policy "Public can read comments"
  on public.comments for select
  using (true);

drop policy if exists "Public can create comments" on public.comments;
create policy "Public can create comments"
  on public.comments for insert
  with check (true);

drop policy if exists "Public can manage comments" on public.comments;
create policy "Public can manage comments"
  on public.comments for all
  using (true)
  with check (true);

-- Trigger for updated_at on comments
drop trigger if exists update_comments_updated_at on public.comments;
create trigger update_comments_updated_at
before update on public.comments
for each row execute function public.update_updated_at_column();

-- Helpful index
create index if not exists idx_comments_chapter_id on public.comments(chapter_id);
