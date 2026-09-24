"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

export default function LoginPage() {
  const router = useRouter();
  const { loginDemo, loginSupabase, signupSupabase, supabaseMode } = useAuth();
  const [mode, setMode] = useState<"demo" | "email">("demo");
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function demoLogin() {
    loginDemo(role, name, email);
    router.push(role === "admin" ? "/admin" : "/");
    router.refresh();
  }

  async function emailSubmit() {
    setErr("");
    setBusy(true);
    const e = isSignup
      ? await signupSupabase(name || email.split("@")[0], email, password)
      : await loginSupabase(email, password);
    setBusy(false);
    if (e) setErr(e);
    else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h1 className="text-xl font-bold">Login to CampusFix</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Demo works instantly with no setup. Supabase login works after you add
          env vars.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1 text-sm font-semibold">
          <button
            onClick={() => setMode("demo")}
            className={`rounded-lg px-3 py-2 ${mode === "demo" ? "bg-white shadow" : "text-zinc-500"}`}
          >
            Demo (instant)
          </button>
          <button
            onClick={() => setMode("email")}
            className={`rounded-lg px-3 py-2 ${mode === "email" ? "bg-white shadow" : "text-zinc-500"}`}
          >
            Email + Supabase
          </button>
        </div>

        {mode === "demo" ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {(["student", "admin"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    role === r
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300"
                  }`}
                >
                  {r === "student" ? "Student" : "Warden (admin)"}
                </button>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === "admin" ? "Name (e.g. Warden Admin)" : "Name (e.g. Aarav Patel)"}
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional for demo)"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
            />
            <button
              onClick={demoLogin}
              className="w-full rounded-xl bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-zinc-700"
            >
              Continue as {role}
            </button>
            <p className="text-xs text-zinc-500">
              Tip for demo/presentation: login as Student → report + upvote,
              then open incognito as Admin → mark In Progress → Resolved.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {!supabaseMode && (
              <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                Supabase env vars not found. Add NEXT_PUBLIC_SUPABASE_URL and
                NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local / Vercel, then use
                this tab. For now use Demo login.
              </p>
            )}
            {isSignup && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              type="password"
              className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
            />
            {err && <p className="text-xs font-medium text-red-600">{err}</p>}
            <button
              onClick={emailSubmit}
              disabled={busy}
              className="w-full rounded-xl bg-zinc-900 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "Please wait…" : isSignup ? "Create account" : "Login"}
            </button>
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="w-full text-center text-xs font-semibold text-zinc-600 hover:underline"
            >
              {isSignup ? "Already have an account? Login" : "New here? Create account"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
