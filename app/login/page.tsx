"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { fetchCampusById } from "@/lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, registerCampus } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [campusName, setCampusName] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === "super_admin") {
      router.push("/team");
      return;
    }
    if (user.role === "student" || user.role === "warden") {
      router.push("/");
      return;
    }
    // campus_admin: approved -> dashboard, else status page
    fetchCampusById(user.campus_id).then((c) => {
      router.push(c && c.status === "approved" ? "/admin" : "/pending");
    });
  }, [user, router]);

  const inputCls =
    "w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

  async function submitLogin() {
    setErr("");
    setOk("");
    setBusy(true);
    const e = await login(name, email);
    setBusy(false);
    if (e) setErr(e);
    else setOk("Verified — taking you to your campus…");
  }

  async function submitRegister() {
    setErr("");
    setOk("");
    setBusy(true);
    const e = await registerCampus({ campus_name: campusName, admin_name: name, admin_email: email });
    setBusy(false);
    if (e) setErr(e);
    else setOk("Submitted for verification — you'll get the approval email shortly. Taking you to status…");
  }

  return (
    <div className="mx-auto w-full max-w-lg px-1">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {mode === "login" ? "Login to your campus" : "Register your campus"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {mode === "login"
            ? "Enter the exact name + email your campus admin registered. You'll land in your campus automatically."
            : "For college in-charge only. Your campus goes to our team for verification — approval or decline arrives by email automatically. Each campus name can be registered only once."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-2xl bg-zinc-100 p-1.5 text-sm font-semibold">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setErr("");
                setOk("");
              }}
              className={`min-h-[44px] rounded-xl transition ${mode === m ? "bg-white shadow text-zinc-900" : "text-zinc-500"}`}
            >
              {m === "login" ? "Login" : "New campus"}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {mode === "register" && (
            <input
              value={campusName}
              onChange={(e) => setCampusName(e.target.value)}
              placeholder="College / campus name"
              className={inputCls}
              autoComplete="organization"
            />
          )}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === "register" ? "In-charge full name" : "Full name (as registered)"}
            className={inputCls}
            autoComplete="name"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (as registered)"
            type="email"
            className={inputCls}
            autoComplete="email"
          />

          {err && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">{err}</p>}
          {ok && <p className="rounded-xl bg-green-50 border border-green-200 p-3 text-xs font-medium text-green-700">{ok}</p>}

          <button
            onClick={mode === "login" ? submitLogin : submitRegister}
            disabled={busy}
            className="min-h-[48px] w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "login" ? "Login" : "Create campus + admin account"}
          </button>

          <p className="rounded-xl bg-zinc-50 border p-3 text-xs leading-relaxed text-zinc-600">
            {mode === "login"
              ? "Not registered yet? Ask your campus admin to add your Name + Email (they can bulk-upload a CSV). Emails are unique — one email works in one campus only."
              : "One registration per campus (duplicates like IIT Madras / iit-madras are blocked). After approval, add wardens + students from Admin → Members."}
          </p>
        </div>
      </div>
    </div>
  );
}
