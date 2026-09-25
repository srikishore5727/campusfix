# CampusFix — Multi-Campus Complaint & Maintenance Tracker

> One platform, many colleges. Each campus gets an isolated space: students report issues with photo proof, upvote what affects them, and watch wardens move it Open → In Progress → Resolved. Campus registrations are verified by the app team before going live.

**Live demo:** https://campusfix-v1.vercel.app/
**Health check:** https://campusfix-v1.vercel.app/api/health

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Storage + Realtime) · Tailwind CSS 4 · Vercel

---

## Why this isn't a generic project

- **Multi-tenant by design** — every row scoped by `campus_id`; cross-campus access blocked in UI and in every query
- **Approval workflow** — new campuses register once (normalized-name dedupe), sit in `pending`, and only unlock after team verification; Approve/Decline triggers an automatic decision email
- **Private roster auth** — no public signup, no campus list to scrape; campus admins add members (single or CSV bulk for 300+ students); login checks Name + Email exactly and auto-routes you to your campus
- **Realtime + honest errors** — Supabase Realtime channels with polling fallback; when the DB is unreachable the UI says so instead of silently showing fake data (`/api/health` proves live status)

## Roles

| Role | Can do |
|---|---|
| Student | Report issues, upvote, comment, track own campus feed |
| Warden | Everything above + change issue status (added by campus admin) |
| Campus admin | Everything above + manage members (add / CSV bulk / remove, last-admin protected) |
| CampusFix team (`/team`) | Verify campuses: Approve / Decline with reason; decision-email log |

## Try it live (2 min)

1. Open https://campusfix-v1.vercel.app/ → **Register a new campus** (any test college name + your name/email) → lands on **verification in progress**
2. Team login at `/team` restores your campus after approval — for a quick self-test, register, then check status on `/pending`
3. As campus admin: **Dashboard → Members** → add a student → login as them → **Report** an issue with a photo → upvote it → watch counts update
4. As warden/admin: open the issue → set **In Progress** (amber) → comment → **Resolved** (green)

## Run locally

```bash
cd campusfix
npm install
npm run dev
# http://localhost:3000
```

Without Supabase env vars the app runs on seeded local demo data (2 colleges). With env vars it uses Supabase exclusively — see `SETUP_GUIDE.md`.

## Project map

```
app/
  page.tsx          campus feed (search / filter / sort / upvote, live sync)
  login/page.tsx    roster login + campus registration (no public signup)
  new/page.tsx      report an issue + photo proof
  issue/[id]/       detail, comments, BRAG status controls
  my/page.tsx       your own reports
  admin/page.tsx    warden/campus-admin dashboard + member management
  team/page.tsx     app-team verification queue + decision-email log
  pending/page.tsx  registration status for applicants
  api/health        live DB probe (mode: live vs local)
  api/notify        decision-email sender (Gmail SMTP → Resend → logged)
lib/
  store.ts          the ONLY data layer (campus-scoped queries + realtime)
  auth.tsx          Name+Email roster sessions (localStorage)
  types.ts          roles, campus workflow, team roster
supabase/
  schema.sql        full schema: tables, RLS, vote-count trigger, dedupe index (re-runnable)
```

## Resume bullets (copy-paste)

- Built CampusFix, a multi-tenant maintenance tracker (Next.js, Supabase Postgres/RLS/Realtime) with team-verified campus onboarding, roster auth, and live issue workflow — **Live:** https://campusfix-v1.vercel.app/
- Designed 6-table schema with RLS, trigger-maintained vote counts, and register-once dedupe; implemented CSV bulk onboarding, realtime feed, and Gmail-SMTP decision emails
