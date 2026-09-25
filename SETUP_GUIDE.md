# CampusFix — Setup, Run & Ship Guide

**Live:** https://campusfix-8tiz.vercel.app/ · **Repo:** https://github.com/srikishore5727/campusfix

---

## A. Run locally (2 min)

```powershell
cd C:\Users\sriki\campusfix
npm install
npm run dev
# http://localhost:3000
```

- No env vars → seeded local demo (2 colleges, works offline in your browser only)
- With env vars → Supabase cloud exclusively (no local mixing)
- Navbar badge shows **Live** (green) or **Local** (amber); `/api/health` reports the exact DB state

## B. Supabase setup (one time, 10 min)

1. supabase.com → New project `campusfix` → **Settings → Data API** → copy Project URL + `anon public` key
2. **SQL Editor → New query** → paste the entire `supabase/schema.sql` → **Run** (re-runnable; creates tables, RLS, vote trigger, dedupe index, storage policies)
3. **Storage → New bucket** → `complaint-images`, **Public ON**
4. Copy `.env.example` → `.env.local`, fill in URL + anon key
5. Restart dev. Register a campus in the app → row appears in **Table Editor → campuses** = live

Optional realtime boost: uncomment + run the two `alter publication supabase_realtime ...` lines at the bottom of schema.sql.

## C. Email delivery (decision mails)

Resend **cannot** send from gmail addresses. The app sends via **Gmail SMTP**:

1. Google Account → Security → **2-Step Verification ON**
2. Security → **App passwords** → new one for Mail → copy the 16-letter code (not your login password)
3. `.env.local` (+ same in Vercel):
```
GMAIL_USER=srikishore9080676683@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```
Without these, mails are logged in `/team` → Decision emails (nothing delivered, nothing breaks).

## D. Team access

`/team` is locked to a fixed roster in `lib/types.ts` (`TEAM_ROSTER`): name **and** email must both match. Campus users can never reach it.

## E. Vercel env vars (must match local)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GMAIL_USER` + `GMAIL_APP_PASSWORD` (for real decision emails)

After changing env vars: **Redeploy** (Save alone isn't enough). Verify on the live link: `/api/health` → `"mode":"live"`.

## F. Git workflow used here

- `main` = production (Vercel auto-deploys every push)
- Feature/fix branches → PR → merge into `main`
- Example: `release/live-v1` → PR #1 → merged

```powershell
git checkout -b <type/short-name>   # feat/…, fix/…, docs/…
git add -A; git commit -m "<type>: <what>"
git push -u origin <branch>
# open PR: https://github.com/srikishore5727/campusfix/pull/new/<branch>
# merge on GitHub → delete branch → git checkout main; git pull
```

## G. Fast fixes

| Symptom | Fix |
|---|---|
| Red "Can't reach the live database" | Run `supabase/schema.sql` in SQL Editor, retry |
| `/api/health` mode is `local` | Env vars missing where the app runs (local `.env.local` or Vercel settings) |
| Image upload fails | Bucket must be exactly `complaint-images`, Public ON |
| Decision email LOGGED ONLY | Set Gmail vars (above); Resend can't use gmail senders |
| Login "not registered" on empty DB | Expected — register a campus, approve in `/team`, add members |
| Merge conflict on PR | `git pull origin main` on your branch, resolve, push again |
