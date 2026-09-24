-- ============================================================
-- CampusFix v2 — MULTI-TENANT schema (run in Supabase SQL Editor)
-- Each college = one campus. Students see ONLY their campus.
-- Safe to re-run: uses IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.
-- ============================================================

-- 1) Campuses (one row per college)
create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid,
  created_at timestamptz default now()
);

-- 2) Profiles (now campus-scoped, 3 roles)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  role text not null default 'student' check (role in ('student','warden','campus_admin')),
  created_at timestamptz default now()
);
alter table public.profiles add column if not exists campus_id uuid references public.campuses(id) on delete set null;
alter table public.profiles add column if not exists campus_name text;

-- migrate old 'admin' role to 'warden'
update public.profiles set role='warden' where role='admin';

-- 3) Warden invites: campus_admin adds warden emails; only those emails may sign up as warden
create table if not exists public.warden_invites (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  email text not null,
  added_by uuid,
  created_at timestamptz default now(),
  unique (campus_id, email)
);

-- 4) Complaints (now campus-scoped)
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
alter table public.complaints add column if not exists campus_id uuid references public.campuses(id) on delete cascade;

-- 5) Comments + upvotes (unchanged)
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

-- 6) RLS
alter table public.campuses enable row level security;
alter table public.profiles enable row level security;
alter table public.complaints enable row level security;
alter table public.comments enable row level security;
alter table public.upvotes enable row level security;
alter table public.warden_invites enable row level security;

-- Campuses: readable by all (needed for signup dropdown), writable by authed users
drop policy if exists "campuses readable by all" on public.campuses;
create policy "campuses readable by all" on public.campuses for select using (true);
drop policy if exists "authed can create campus" on public.campuses;
create policy "authed can create campus" on public.campuses for insert with check (auth.role() = 'authenticated');

-- Profiles
drop policy if exists "profiles readable by all" on public.profiles;
create policy "profiles readable by all" on public.profiles for select using (true);
drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update using (auth.uid() = id);

-- Complaints: app enforces campus isolation (campus_id filter on every query).
-- Permissive read keeps demo simple; tighten later with user_campus() function if needed.
drop policy if exists "complaints readable by all" on public.complaints;
create policy "complaints readable by all" on public.complaints for select using (true);
drop policy if exists "auth users can insert complaints" on public.complaints;
create policy "auth users can insert complaints" on public.complaints for insert with check (auth.role() = 'authenticated');
drop policy if exists "owners can edit own open complaints" on public.complaints;
create policy "owners can edit own open complaints" on public.complaints for update using (auth.uid() = user_id);
drop policy if exists "any authed can update status" on public.complaints;
create policy "any authed can update status" on public.complaints for update using (auth.role() = 'authenticated');

-- Comments
drop policy if exists "comments readable by all" on public.comments;
create policy "comments readable by all" on public.comments for select using (true);
drop policy if exists "auth users can comment" on public.comments;
create policy "auth users can comment" on public.comments for insert with check (auth.role() = 'authenticated');

-- Upvotes
drop policy if exists "upvotes readable by all" on public.upvotes;
create policy "upvotes readable by all" on public.upvotes for select using (true);
drop policy if exists "auth users can upvote" on public.upvotes;
create policy "auth users can upvote" on public.upvotes for insert with check (auth.role() = 'authenticated');
drop policy if exists "users can remove own upvote" on public.upvotes;
create policy "users can remove own upvote" on public.upvotes for delete using (auth.uid() = user_id);

-- Warden invites: readable by all (needed to validate warden signup), writable by authed
drop policy if exists "invites readable by all" on public.warden_invites;
create policy "invites readable by all" on public.warden_invites for select using (true);
drop policy if exists "authed manage invites" on public.warden_invites;
create policy "authed manage invites" on public.warden_invites for insert with check (auth.role() = 'authenticated');
drop policy if exists "authed delete invites" on public.warden_invites;
create policy "authed delete invites" on public.warden_invites for delete using (auth.role() = 'authenticated');

-- 7) Upvote counter trigger
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

-- 8) Storage
insert into storage.buckets (id, name, public)
values ('complaint-images', 'complaint-images', true)
on conflict (id) do nothing;

drop policy if exists "public read images" on storage.objects;
create policy "public read images" on storage.objects for select using (bucket_id = 'complaint-images');
drop policy if exists "auth upload images" on storage.objects;
create policy "auth upload images" on storage.objects for insert with check (bucket_id = 'complaint-images' and auth.role() = 'authenticated');

-- 9) ROSTER (private multi-tenant access — v3)
-- Single source of truth: one row per person, email UNIQUE GLOBALLY (one email = one campus).
-- Login checks name+email against this table; no public signup, no campus picker.
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'student' check (role in ('student','warden','campus_admin')),
  created_at timestamptz default now()
);
-- global email uniqueness (case-insensitive)
create unique index if not exists members_email_unique on public.members (lower(email));

alter table public.members enable row level security;
drop policy if exists "members readable by all" on public.members;
create policy "members readable by all" on public.members for select using (true);
drop policy if exists "authed manage members" on public.members;
create policy "authed manage members" on public.members for insert with check (true);
drop policy if exists "authed delete members" on public.members;
create policy "authed delete members" on public.members for delete using (true);

-- 9b) CAMPUS APPROVAL WORKFLOW (v4) — run in the same SQL Editor
-- New campuses start as 'pending'. App team approves/declines from /team.
-- Only 'approved' campuses can be used. Name registered only once.
alter table public.campuses add column if not exists status text not null default 'pending'
  check (status in ('pending','approved','rejected'));
alter table public.campuses add column if not exists contact_name text;
alter table public.campuses add column if not exists contact_email text;
alter table public.campuses add column if not exists reject_reason text;
alter table public.campuses add column if not exists reviewed_at timestamptz;
alter table public.campuses add column if not exists reviewed_by text;

-- existing campuses (seeded before approval existed) become approved
update public.campuses set status='approved' where status='pending' and reviewed_at is null
  and id in (select campus_id from public.members where role='campus_admin');

-- register-once guard: same normalized name can't exist twice (IIT Madras = iit-madras = IIT  Madras)
create unique index if not exists campuses_name_unique
  on public.campuses (lower(regexp_replace(name, '[^a-z0-9]', '', 'g')));

-- outbound decision mails (audit log; real sending via /api/notify + RESEND_API_KEY)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid references public.campuses(id) on delete cascade,
  campus_name text not null default '',
  to_email text not null,
  to_name text not null default '',
  kind text not null check (kind in ('approved','rejected')),
  subject text not null,
  body text not null,
  reason text,
  sent boolean not null default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
drop policy if exists "notifications readable by all" on public.notifications;
create policy "notifications readable by all" on public.notifications for select using (true);
drop policy if exists "anyone can log notifications" on public.notifications;
create policy "anyone can log notifications" on public.notifications for insert with check (true);
-- 10) Realtime: enable publication so UI updates live (run once; ignore error if already added)
-- alter publication supabase_realtime add table public.complaints;
-- alter publication supabase_realtime add table public.comments;
