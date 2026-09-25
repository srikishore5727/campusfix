"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  fetchAllCampuses,
  fetchMailLog,
  reviewCampus,
  subscribeCampusUpdates,
} from "@/lib/store";
import type { Campus, CampusNotification, CampusStatus } from "@/lib/types";

type Tab = "pending" | "approved" | "rejected";

export default function TeamPage() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [mails, setMails] = useState<CampusNotification[]>([]);
  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [tName, setTName] = useState("");
  const [tEmail, setTEmail] = useState("");
  const [tErr, setTErr] = useState("");

  const isTeam = user?.role === "super_admin";

  const load = useCallback(async () => {
    try {
      const [c, m] = await Promise.all([fetchAllCampuses(), fetchMailLog()]);
      setCampuses(c);
      setMails(m);
      setMsg("");
    } catch (e: any) {
      setMsg(e?.message || "Could not load. Is supabase/schema.sql run? Check /api/health.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isTeam) load();
    else if (!authLoading) setLoading(false);
  }, [authLoading, isTeam, load]);

  useEffect(() => {
    if (isTeam) return subscribeCampusUpdates(() => load());
  }, [isTeam, load]);

  async function teamLogin() {
    setTErr("");
    const e = await login(tName, tEmail);
    if (e) setTErr(e);
  }

  async function decide(id: string, decision: "approved" | "rejected") {
    if (!user) return;
    if (decision === "rejected" && !confirm("Decline this campus? A decline email with your reason will be sent.")) return;
    setBusy(id);
    setMsg("");
    try {
      const note = await reviewCampus(id, decision, reason[id] || "", user.email);
      setReason((p) => ({ ...p, [id]: "" }));
      await load();
      setMsg(
        decision === "approved"
          ? note.sent
            ? "Approved — notification email delivered."
            : "Approved — logged, but email NOT delivered (check Resend domain/key; see Decision emails)."
          : note.sent
            ? "Declined — notification email delivered."
            : "Declined — logged, but email NOT delivered (check Resend domain/key; see Decision emails)."
      );
    } catch (e: any) {
      setMsg(e?.message || "Action failed.");
    } finally {
      setBusy("");
    }
  }

  if (!authLoading && !isTeam) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-3xl border bg-white p-5 sm:p-7">
          <h1 className="text-xl font-bold">CampusFix team login</h1>
          <p className="mt-1 text-sm text-zinc-500">
            For the app team only (you + your friend). Campus users login on the main login page.
          </p>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              teamLogin();
            }}
          >
            <input
              value={tName}
              onChange={(e) => setTName(e.target.value)}
              placeholder="Your name"
              className="min-h-[46px] w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
            />
            <input
              value={tEmail}
              onChange={(e) => setTEmail(e.target.value)}
              placeholder="Team email"
              type="email"
              className="min-h-[46px] w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
            />
            {tErr && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">{tErr}</p>}
            <button
              type="submit"
              className="min-h-[48px] w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-700"
            >
              Login as team
            </button>
          </form>
        </div>
      </div>
    );
  }

  const counts = (s: CampusStatus) => campuses.filter((c) => (c.status || "pending") === s).length;
  const visible = campuses.filter((c) => (c.status || "pending") === tab);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">CampusFix team</p>
          <h1 className="text-xl font-bold sm:text-2xl">Campus verification</h1>
          <p className="text-sm text-zinc-500">Verify registrations, approve or decline. Decision emails go automatically.</p>
        </div>
        <button
          onClick={logout}
          className="flex min-h-[42px] items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-100"
        >
          Logout
        </button>
      </div>

      {msg && <p className="rounded-2xl border bg-white p-3 text-sm font-medium">{msg}</p>}

      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-white border p-1.5 text-sm font-semibold">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`min-h-[44px] rounded-xl capitalize transition ${tab === t ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-900"}`}
          >
            {t} ({counts(t)})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading registrations…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border bg-white p-8 text-center text-sm text-zinc-500">No {tab} campuses.</p>
      ) : (
        <div className="grid gap-3">
          {visible.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-bold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Contact: {c.contact_name || "—"} • {c.contact_email || "—"} •{" "}
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                  {c.status === "rejected" && c.reject_reason && (
                    <p className="mt-1 text-xs text-red-600">Decline reason: {c.reject_reason}</p>
                  )}
                  {c.reviewed_at && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Reviewed {new Date(c.reviewed_at).toLocaleString()} by {c.reviewed_by}
                    </p>
                  )}
                </div>
                {tab === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(c.id, "approved")}
                      disabled={busy === c.id}
                      className="flex min-h-[44px] items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {busy === c.id ? "…" : "Approve"}
                    </button>
                    <button
                      onClick={() => decide(c.id, "rejected")}
                      disabled={busy === c.id}
                      className="flex min-h-[44px] items-center rounded-xl border border-red-300 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
              {tab === "pending" && (
                <input
                  value={reason[c.id] || ""}
                  onChange={(e) => setReason((p) => ({ ...p, [c.id]: e.target.value }))}
                  placeholder="Decline reason (required only if declining — goes in the email)"
                  className="mt-3 min-h-[44px] w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
                />
              )}
            </div>
          ))}
        </div>
      )}

      <section className="rounded-3xl border bg-white p-4 sm:p-5">
        <h2 className="font-bold">Decision emails ({mails.length})</h2>
        <p className="text-xs text-zinc-500">
          Auto-sent on approve/decline from your Gmail (set GMAIL_USER + GMAIL_APP_PASSWORD). Without it,
          mails are only logged here.
        </p>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {mails.length === 0 && <p className="text-sm text-zinc-500">No emails yet.</p>}
          {mails.map((m) => (
            <div key={m.id} className="rounded-xl border bg-zinc-50 p-3 text-sm">
              <p className="text-xs font-bold">
                [{m.kind.toUpperCase()}] {m.subject}{" "}
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${m.sent ? "bg-green-600 text-white" : "bg-amber-200 text-amber-900"}`}>
                  {m.sent ? "DELIVERED" : "LOGGED ONLY"}
                </span>
              </p>
              <p className="text-xs text-zinc-500">to {m.to_name} &lt;{m.to_email}&gt; • {new Date(m.created_at).toLocaleString()}</p>
              <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">{m.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
