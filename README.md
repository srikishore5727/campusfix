# CampusFix — Hostel / PG Complaint & Maintenance Tracker

> Real-world fullstack project: students report maintenance issues with photo proof, upvote what affects them, and track `Open → In Progress → Resolved` transparently. Warden gets a priority dashboard.

**Stack:** Next.js 14 App Router (frontend + backend) · Supabase (Postgres + Auth + Storage) · Tailwind · Vercel deploy

**Live demo:** _(paste your Vercel URL here after deploy)_ `https://campusfix.vercel.app`
**Demo logins (no signup needed):** Login page → Demo tab → `Student` / `Warden (admin)`

---

## Why this is resume-worthy (not a generic todo)

- Real workflow: role-based access (student vs warden), status state-machine, upvotes for prioritization, comments thread, image evidence
- Real backend: Postgres with Row Level Security, `upvotes` join table + trigger maintaining `upvotes_count`, Storage bucket with public-read/auth-write policies
- Balanced FE/BE: 6 pages + 1 health API + Supabase schema + seed + RLS

## Features (all working)

1. **Auth** — instant Demo login (student/admin) + real Supabase email/password when env vars are set
2. **Report issue** — title, category, block, description, photo upload
3. **Feed** — search + filter by status/category + sort by Top/New + upvote
4. **Issue detail** — status timeline, photo, comments (warden badge), admin can change status inline
5. **My issues** — logged-in student's own reports
6. **Admin dashboard** — counts, sorted by votes, one-click Open/In Progress/Resolved

Works **without any Supabase setup** (localStorage demo mode with 8 seeded issues) and **automatically switches to Supabase** once env vars are present.

## Run locally (2 min, no Supabase needed)

```bash
cd campusfix
npm install
npm run dev
# open http://localhost:3000
```

Login → Demo → Student → Report an issue → upvote → open incognito → login as Admin → resolve it.

## Connect Supabase (10 min, makes it real fullstack)

1. Go to supabase.com → New project → copy Project URL + `anon public` key.
2. **SQL Editor → New query → paste `supabase/schema.sql` → Run.** Then optionally run `supabase/seed.sql`.
3. **Storage → New bucket →** name `complaint-images`, Public ON.
4. **Authentication → Providers → Email → ON.** Disable "Confirm email" for fast demo (or keep ON for realism).
5. Create `.env.local` from `.env.example`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_ADMIN_EMAILS=youremail@gmail.com
```
6. Restart `npm run dev`. Now creates/reads/writes hit Postgres. Check Supabase → Table Editor to see rows appear live.

Where things interconnect:
- `lib/supabaseClient.ts` reads the 2 env vars. If missing → localStorage mode.
- `lib/store.ts` is the ONLY data layer: every page calls it; it tries Supabase first, falls back to local.
- `lib/auth.tsx` handles demo session (localStorage) + Supabase `signInWithPassword`/`signUp`; admin role = email in `NEXT_PUBLIC_ADMIN_EMAILS`.
- Image upload: `store.uploadImage()` → `storage.from('complaint-images')` when configured, else data-URL preview.
- Health check proving backend deploy: `/api/health`.

## Deploy (live link for resume)

Vercel + Supabase free tiers, no card needed:

```bash
# 1) push to GitHub (see SETUP_GUIDE.md for exact commands)
# 2) vercel.com → Add New Project → Import campusfix repo
# 3) Environment Variables → add the 3 NEXT_PUBLIC_* vars → Deploy
```

You get `https://campusfix-xxx.vercel.app`. Put that + GitHub link in resume.

## Resume bullets (copy-paste)

- Built CampusFix, a hostel maintenance tracker (Next.js, Supabase Postgres/RLS/Storage) with role-based Open→Resolved workflow, upvoting, and image proof; deployed on Vercel — [live link]
- Designed 4-table schema (profiles, complaints, comments, upvotes) with RLS policies and trigger-maintained vote counts; implemented filter/search/sort feed and warden dashboard

## Interview demo script (60 sec)

1. Feed: "8 real issues, sorted by votes — warden sees priority instantly."
2. Report: create "Lift not working, Block C" with photo.
3. Login as admin (incognito): dashboard → mark In Progress → add comment "Technician assigned" → Resolved.
4. Point to Supabase Table Editor row + `/api/health` JSON as backend proof.
