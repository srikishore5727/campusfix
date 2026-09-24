"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { fetchCampuses } from "@/lib/store";
import type { Campus } from "@/lib/types";

type Tab = "student" | "warden" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, signupStudent, signupWarden, signupCampusAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("student");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [campusId, setCampusId] = useState("");
  const [campusName, setCampusName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchCampuses().then((c) => {
      setCampuses(c);
      if (c.length > 0 && !campusId) setCampusId(c[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      router.push(user.role === "student" ? "/" : "/admin");
    }
  }, [user, router]);

  const inputCls =
    "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

  async function submit() {
    setErr("");
    setBusy(true);
    let e: string | null = "";
    if (mode === "login") {
      e = await login(email, password);
    } else if (tab === "student") {
      e = await signupStudent({ name, email, password, campus_id: campusId });
    } else if (tab === "warden") {
      e = await signupWarden({ name, email, password, campus_id: campusId });
    } else {
      e = await signupCampusAdmin({ name, email, password, campus_name: campusName });
    }
    setBusy(false);
    if (e) setErr(e);
    else router.push(tab === "student" ? "/" : "/admin");
  }

  return (
    <div className="mx-auto w-full max-w-lg px-1">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Welcome to CampusFix</h1>
        <p className="mt-1 text-sm text-zinc-500">
          One platform, many campuses. Your campus sees only its own issues.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-zinc-100 p-1.5 text-[13px] font-semibold sm:text-sm">
          {([["student", "Student"], ["warden", "Warden"], ["admin", "Campus Setup"]] as [Tab, string][]).map(
            ([t, label]) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setErr("");
                }}
                className={`min-h-[44px] rounded-xl px-2 py-2 transition ${
                  tab === t ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {tab !== "admin" && (
          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-2xl bg-zinc-50 p-1.5 text-sm font-semibold">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`min-h-[40px] rounded-xl capitalize transition ${
                  mode === m ? "bg-zinc-900 text-white" : "text-zinc-500"
                }`}
              >
                {m === "login" ? "Login" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {mode === "signup" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={inputCls} autoComplete="name" />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className={inputCls} autoComplete="email" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            type="password"
            className={inputCls}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          {tab === "admin" ? (
            <div className="space-y-3">
              <input
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                placeholder="College / campus name (e.g. Greenfield Institute)"
                className={inputCls}
              />
              <p className="rounded-xl bg-zinc-50 border p-3 text-xs leading-relaxed text-zinc-600">
                For campus in-charge only. This creates a <b>new isolated campus</b> and makes you its admin.
                You can then add warden emails from the Admin dashboard. Students sign up by selecting this campus.
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-bold text-zinc-600">YOUR CAMPUS</label>
              <select value={campusId} onChange={(e) => setCampusId(e.target.value)} className={inputCls}>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {campuses.length === 0 && (
                <p className="mt-1 text-xs text-zinc-500">Loading campuses…</p>
              )}
              {tab === "warden" && mode === "signup" && (
                <p className="mt-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  Wardens can only sign up if the campus in-charge already added your email. Ask them to go to
                  Admin → Manage wardens → Add email.
                </p>
              )}
            </div>
          )}

          {err && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">{err}</p>}

          <button
            onClick={submit}
            disabled={busy}
            className="min-h-[48px] w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:opacity-50"
          >
            {busy
              ? "Please wait…"
              : mode === "login"
                ? `Login${tab === "warden" ? " as Warden" : ""}`
                : tab === "student"
                  ? "Create student account"
                  : tab === "warden"
                    ? "Create warden account"
                    : "Create campus + admin account"}
          </button>

          <p className="text-center text-xs text-zinc-500">
            {tab === "admin"
              ? "Already created your campus? Use Student/Warden tabs to login — admin uses the same login."
              : "Your issues, upvotes and dashboard are scoped to your campus only."}
          </p>
        </div>
      </div>
    </div>
  );
}
