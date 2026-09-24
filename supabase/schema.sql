-- ============================================================
-- CampusFix — Supabase schema (run ONCE in Supabase > SQL Editor)
-- ============================================================

-- 1) Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_name text not null default 'Student',
  title text not null,
  description text not null,
  category text not null default 'Other',
  block text not null default 'General',
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  upvotes_count int not null default 0,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  user_id uuid not null,
  user_name text not null default 'Student',
  role text not null default 'student',
  body text not null,
  created_at timestamptz default now()
);

create table if not exists public.upvotes (
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz default now(),
  primary key (complaint_id, user_id)
);

-- 2) Enable RLS
alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.comments enable row level security;
alter table public.upvotes enable row level security;

-- 3) Policies (drop first so re-runnable)
drop policy if exists "profiles readable by all" on public.profiles;
create policy "profiles readable by all" on public.profiles for select using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "complaints readable by all" on public.complaints;
create policy "complaints readable by all" on public.complaints for select using (true);

drop policy if exists "auth users can insert complaints" on public.complaints;
create policy "auth users can insert complaints" on public.complaints for insert with check (auth.role() = 'authenticated');

drop policy if exists "owners can edit own open complaints" on public.complaints;
create policy "owners can edit own open complaints" on public.complaints for update using (auth.uid() = user_id);

drop policy if exists "comments readable by all" on public.comments;
create policy "comments readable by all" on public.comments for select using (true);

drop policy if exists "auth users can comment" on public.comments;
create policy "auth users can comment" on public.comments for insert with check (auth.role() = 'authenticated');

drop policy if exists "upvotes readable by all" on public.upvotes;
create policy "upvotes readable by all" on public.upvotes for select using (true);

drop policy if exists "auth users can upvote" on public.upvotes;
create policy "auth users can upvote" on public.upvotes for insert with check (auth.role() = 'authenticated');

drop policy if exists "users can remove own upvote" on public.upvotes;
create policy "users can remove own upvote" on public.upvotes for delete using (auth.uid() = user_id);

-- 4) Auto-maintain upvotes_count
create or replace function public.sync_upvote_count()
returns trigger language plpgsql as $$
begin
  if (TG_OP = 'INSERT') then
    update public.complaints set upvotes_count = upvotes_count + 1 where id = NEW.complaint_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update public.complaints set upvotes_count = greatest(0, upvotes_count - 1) where id = OLD.complaint_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_upvotes on public.upvotes;
create trigger trg_sync_upvotes
after insert or delete on public.upvotes
for each row execute function public.sync_upvote_count();

-- 5) Storage bucket for photos (create via Dashboard > Storage > New bucket: complaint-images, Public ON)
-- If bucket exists, this insert is ignored:
insert into storage.buckets (id, name, public)
values ('complaint-images', 'complaint-images', true)
on conflict (id) do nothing;

drop policy if exists "public read images" on storage.objects;
create policy "public read images" on storage.objects for select using (bucket_id = 'complaint-images');

drop policy if exists "auth upload images" on storage.objects;
create policy "auth upload images" on storage.objects for insert with check (bucket_id = 'complaint-images' and auth.role() = 'authenticated');

-- 6) Make your admin: after signup, run (replace email):
-- update public.profiles set role='admin' where email='youremail@gmail.com';
