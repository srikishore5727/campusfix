# CampusFix — Multi-campus Complaint & Maintenance Tracker

> One platform, many colleges. Each campus gets an isolated space: students see ONLY their campus issues, wardens resolve them, campus in-charge manages wardens. Live updates everywhere.

**Stack:** Next.js App Router · Supabase (Postgres + Auth + Storage + Realtime) · Tailwind · Vercel

**Live:** _(paste Vercel URL)_ `https://campusfix.vercel.app`

**Campus registration (verified by the app team):**
- New college registers → status **pending** (register-once: normalized name dedupe blocks `IIT Madras`/`iit-madras` duplicates while pending or approved)
- Team opens `/team` (emails in `NEXT_PUBLIC_TEAM_EMAILS`) → Approve or Decline with reason → decision email goes automatically (`/api/notify` + Resend when `RESEND_API_KEY` set, else logged in Team → Decision emails)
- Pending campuses see "verification in progress" gates; approved unlocks feed + member management; declined shows the reason

**Login (private roster — no public signup, no campus list):**
- Campus admin adds you (Name + Email, single or CSV bulk) → you login with exact Name + Email → auto-lands in your campus
- New college? Register campus → you become its admin → add members from Admin → Members
- Test accounts (seeded locally, never shown in UI): `Campus Admin / admin@greenfield.edu`, `Ravi Warden / warden@greenfield.edu`, `Aarav Patel / aarav@greenfield.edu`

---

## Why resume-worthy

- Multi-tenant: `campuses` table, every profile/complaint scoped by `campus_id`, cross-campus access blocked in UI + query filter
- 3 roles: `student` (report/upvote), `warden` (status updates, needs invite), `campus_admin` (dashboard + add/remove wardens)
- Realtime: Supabase `postgres_changes` channels for complaints/comments/upvotes + local-event + 7s polling + refetch on focus — feed/detail/dashboard refresh without manual reload
- Responsive mobile-first UX: 44px+ touch targets, skeletons, optimistic upvotes, empty states, campus badge in nav

## Features

1. **Real auth** — email/password signup/login per role; campus picker on signup; warden invite-gated
2. **Campuses** — create campus on signup; 2 seeded colleges locally; isolated feeds
3. **Report** — title/category/block/description/photo (4MB limit, preview)
4. **Feed** — campus-only, search/filter/sort, optimistic upvote, live sync badge
5. **Issue detail** — campus-guarded, comments with role badges, warden/admin status buttons
6. **My issues** — own reports, live-updating
7. **Dashboard** — per-campus stats + priority list + (admin only) Manage wardens: add/remove emails

Works without Supabase (localStorage, per-browser) and switches to Supabase cloud when env vars exist. Re-run `supabase/schema.sql` in SQL Editor to upgrade old installs to multi-tenant.

## Run locally

```bash
cd campusfix
npm install
npm run dev
# http://localhost:3000
```

Test multi-tenancy in 2 min:
1. Campus Setup → create `Test College` as admin A → Admin dashboard → add `warden@test.edu`
2. Logout → Warden tab → sign up `warden@test.edu` + Test College → login OK
3. Try warden signup with random email → blocked (not invited) ✓
4. Student signup in Greenfield → sees only Greenfield feed; create issue → appears instantly in second tab (realtime) ✓
5. Open that issue ID while logged into Lakeview → "Not in your campus" ✓

## Supabase connect

1. supabase.com → New project → copy URL + anon key
2. SQL Editor → run `supabase/schema.sql` (v2, re-runnable) → Storage → bucket `complaint-images` Public ON → Auth → Email ON, Confirm email OFF for demo
3. `.env.local` from `.env.example` (only 2 vars now)
4. Restart dev. Cross-device realtime needs: SQL Editor → run the two `alter publication supabase_realtime add table ...` lines at bottom of schema.sql (uncomment first).

Wiring: `lib/store.ts` = only data layer (campus filter on every query) + `subscribeCampusUpdates()`; `lib/auth.tsx` = session + role/campus; `app/admin` = warden invites; image upload → Storage bucket.

## Deploy

Vercel → Import repo → add `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Deploy. Check `/api/health` → `supabaseConfigured:true`.

Resume: `CampusFix — multi-tenant hostel tracker (Next.js, Supabase Postgres/RLS/Realtime) with campus isolation, invite-gated wardens, live feed — [live] [github]`
