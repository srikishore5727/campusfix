# CampusFix — COMPLETE SHIP GUIDE (setup → GitHub → deploy → resume)

Follow top to bottom. Total ~30 min + coding already done.

---

## A. What you need (accounts, free, 5 min)

1. **Node 18+** — you have v22.16.0, OK.
2. **GitHub account** → github.com → Sign up.
3. **Vercel account** → vercel.com → Sign up with GitHub (1 click).
4. **Supabase account** → supabase.com → Sign up with GitHub.
5. **Git installed** — check with `git --version`. If missing: https://git-scm.com/download/win

No credit card anywhere.

---

## B. Run it right now (proves it's functional before deploy)

```powershell
cd C:\Users\sriki\campusfix
npm install
npm run dev
```

Open http://localhost:3000
- Click Login → Demo tab → Continue as Student → Report an issue → submit.
- Feed → upvote it. Open incognito window → Login as Warden (admin) → /admin → mark it In Progress → open issue → comment "Technician assigned" → Resolved.
- Backend proof: open http://localhost:3000/api/health → should return {"ok":true,...}.

If this works, frontend + backend + database (localStorage mode) are functional. Supabase makes the database real/cloud.

---

## C. Supabase setup (makes DB real, 10 min)

1. supabase.com → **New project** → name `campusfix`, set DB password (save it), region closest (Mumbai/Singapore), Create.
2. Wait ~2 min. Then **Project Settings (gear) → Data API →** copy:
   - `Project URL` → `https://xyzcompany.supabase.co`
   - `anon public` key → long `eyJ...` string
3. Left menu **SQL Editor → New query** → open local file `supabase\schema.sql` → copy ALL → paste → **Run**. Must show Success. This creates tables + RLS + trigger + storage policies.
   - If error "already exists", it's safe to re-run (script drops policies first).
4. (Optional) Same way, run `supabase\seed.sql` to get 5 starter rows in cloud.
5. Left menu **Storage → New bucket** → name exactly `complaint-images` → **Public bucket ON** → Create.
6. Left menu **Authentication → Providers → Email → Enable.** For tomorrow's demo, turn OFF "Confirm email" so signup is instant.
7. **Table Editor → complaints** → confirm table exists.
8. Locally, create `.env.local`:
```powershell
Copy-Item .env.example .env.local
# then edit .env.local with your real URL + anon key + your email as admin
```
Example `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://abcxyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_ADMIN_EMAILS=youremail@gmail.com
```
9. Restart dev: stop (Ctrl+C) → `npm run dev`. Report a new issue → check Supabase Table Editor → new row appears = cloud DB connected.
10. Interconnection map (where to debug if stuck):
   - Env missing? → app uses localStorage demo (banner on /login). `lib/supabaseClient.ts` returns null.
   - Env present? → `lib/store.ts` uses Supabase for every read/write.
   - Auth: `lib/auth.tsx` → demo = localStorage session; email tab = `supabase.auth.signInWithPassword`. Admin role = email listed in `NEXT_PUBLIC_ADMIN_EMAILS`.
   - Photos: `store.uploadImage()` → bucket `complaint-images`. If "bucket not found", you skipped step 5. If "row violates RLS", you skipped running schema.sql.

---

## D. GitHub repo (exact commands, push to main directly)

For a solo 24-hr project, **push directly to `main`** — no feature branches needed. One clean branch = less confusion in interview.

```powershell
cd C:\Users\sriki\campusfix

# 1) check git
git --version
git status

# 2) if 'campusfix' has no remote yet (fresh create-next-app inits git with no remote), do:
git branch -M main
git add .
git commit -m "feat: CampusFix MVP — auth, complaints, upvotes, comments, admin dashboard (Next.js + Supabase)"

# 3) create repo on github.com → New repository → name `campusfix` → Public → DON'T tick "Add README" (you already have one) → Create
# 4) link + push (replace YOUR-USER):
git remote add origin https://github.com/YOUR-USER/campusfix.git
git push -u origin main
```

Commit message convention for later fixes (keep 2-3 commits max before deadline):
- `fix: admin status update refresh + RLS note`
- `chore: add Vercel env + live link in README`
- `docs: add demo credentials + screenshots`

Verify: github.com/YOUR-USER/campusfix shows code + README with features.

---

## E. Deploy to Vercel (live link for resume, 5 min)

1. vercel.com → **Add New → Project → Import** your `campusfix` repo → Framework auto = Next.js.
2. **Environment Variables** → add all 3 (copy from `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_EMAILS`
3. **Deploy** → wait ~2 min → you get `https://campusfix-xxx.vercel.app`.
4. Open `/api/health` on that URL — must return `{"ok":true,"supabaseConfigured":true}`. If false, you forgot env vars → Project Settings → Environment Variables → add → Redeploy.
5. Test live: login demo → report → admin resolve, all on the live URL.
6. (Optional) **Settings → Domains** → rename to `campusfix.vercel.app` if free.
7. Paste live URL + GitHub URL into `README.md` top, then:
```powershell
git add README.md
git commit -m "docs: add live Vercel link + demo logins"
git push origin main
# Vercel auto-redeploys on every push to main — no manual step.
```

---

## F. Resume + submission checklist (don't miss)

- [ ] GitHub repo public with README, schema.sql, seed.sql, .env.example (no secrets committed — `.env.local` stays local, `.gitignore` already ignores `.env*`)
- [ ] Live Vercel link opens without login; demo login works in 5 sec
- [ ] 8 seeded issues visible; search/filter/sort/upvote all work
- [ ] Admin login → /admin → status change persists after refresh (proves DB, not just UI state)
- [ ] `/api/health` returns ok:true
- [ ] Resume line: `CampusFix — Hostel complaint tracker | Next.js, Supabase (Postgres, RLS, Storage), Vercel | Live: <link> | GitHub: <link>`
- [ ] 3-line description: role workflow, upvote prioritization, image proof + dashboard
- [ ] If asked "where's backend?": show `app/api/health/route.ts` + Supabase Table Editor + Storage bucket + RLS policies screenshot

## G. If something breaks tomorrow morning (fast fixes)

| Symptom | Fix (1 min) |
|---|---|
| Vercel shows Supabase not configured | Add env vars in Vercel → Redeploy (not just Save) |
| Signup says "Email confirmation required" | Supabase Auth → disable Confirm email, or use Demo login for presentation |
| Image upload fails | Bucket name must be exactly `complaint-images` + Public ON; re-run storage part of schema.sql |
| Admin page says "Admins only" | You logged in as student — Logout → Demo → Warden; for email mode add your email to NEXT_PUBLIC_ADMIN_EMAILS in both .env.local and Vercel |
| Empty feed on live but works local | You haven't run seed.sql in cloud + localStorage doesn't transfer — run seed.sql in Supabase SQL Editor |
| Build fails on Vercel | Run `npm run build` locally, fix TS error shown, push again |

Good luck — you have a complete, functional, deployable fullstack story. Ship it.
