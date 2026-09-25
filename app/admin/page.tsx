"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge, statusButton, timeAgo } from "@/components/ComplaintCard";
import { useAuth } from "@/lib/auth";
import {
  addMember,
  bulkAddMembers,
  fetchCampusById,
  fetchComplaints,
  fetchMembers,
  parseRosterCsv,
  removeMember,
  subscribeCampusUpdates,
  updateStatus,
} from "@/lib/store";
import type { Campus, Complaint, Member, Role, Status } from "@/lib/types";
import { canManageComplaints } from "@/lib/types";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [mName, setMName] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mRole, setMRole] = useState<Role>("student");
  const [mErr, setMErr] = useState("");
  const [mBusy, setMBusy] = useState(false);
  const [csv, setCsv] = useState("");
  const [csvResult, setCsvResult] = useState("");
  const [search, setSearch] = useState("");
  const [campus, setCampus] = useState<Campus | null>(null);
  const [dbError, setDbError] = useState("");
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [c, m, camp] = await Promise.all([
        fetchComplaints(user.campus_id),
        user.role === "campus_admin" ? fetchMembers(user.campus_id) : Promise.resolve([] as Member[]),
        fetchCampusById(user.campus_id),
      ]);
      setItems(c);
      setMembers(m);
      setCampus(camp);
      setDbError("");
    } catch (e: any) {
      setDbError(e?.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user?.campus_id, user?.role]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  useEffect(() => subscribeCampusUpdates(() => load()), [load]);

  const stats = useMemo(
    () => ({
      total: items.length,
      open: items.filter((i) => i.status === "open").length,
      in_progress: items.filter((i) => i.status === "in_progress").length,
      resolved: items.filter((i) => i.status === "resolved").length,
      students: members.filter((m) => m.role === "student").length,
      wardens: members.filter((m) => m.role === "warden").length,
    }),
    [items, members]
  );

  const visibleMembers = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = s
      ? members.filter(
          (m) => m.name.toLowerCase().includes(s) || m.email.toLowerCase().includes(s)
        )
      : members;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [members, search]);

  async function setStatus(id: string, s: Status) {
    const prev = items.find((x) => x.id === id)?.status;
    if (prev === s) return;
    setActionError("");
    setItems((p) => p.map((x) => (x.id === id ? { ...x, status: s } : x)));
    try {
      await updateStatus(id, s);
    } catch (e: any) {
      if (prev) setItems((p) => p.map((x) => (x.id === id ? { ...x, status: prev } : x)));
      setActionError(e?.message || "Status update failed.");
    }
  }

  async function addSingle() {
    setMErr("");
    if (!user) return;
    setMBusy(true);
    try {
      const row = await addMember(user.campus_id, mName, mEmail, mRole);
      setMembers((p) => [row, ...p]);
      setMName("");
      setMEmail("");
    } catch (e: any) {
      setMErr(e?.message || "Could not add.");
    } finally {
      setMBusy(false);
    }
  }

  async function runBulk() {
    setCsvResult("");
    setActionError("");
    if (!user) return;
    if (!csv.trim()) {
      setCsvResult("Paste CSV rows first. Format per line: Name, Email, Role");
      return;
    }
    setMBusy(true);
    try {
      const total = parseRosterCsv(csv).length;
      setCsvResult(`Uploading 0/${total}…`);
      const r = await bulkAddMembers(user.campus_id, csv, user.id, (done, n) => {
        setCsvResult(`Uploading ${done}/${n}…`);
      });
      setCsv("");
      await load();
      setCsvResult(
        `Added ${r.added}.${r.skipped.length ? ` Skipped ${r.skipped.length}: ` + r.skipped.slice(0, 5).map((s) => `line ${s.line} (${s.reason})`).join("; ") + (r.skipped.length > 5 ? "…" : "") : ""}`
      );
    } catch (e: any) {
      setActionError(e?.message || "Bulk upload failed.");
    } finally {
      setMBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setCsv(text.slice(0, 200000));
  }

  async function removeM(id: string) {
    if (!user) return;
    const target = members.find((m) => m.id === id);
    if (target?.role === "campus_admin" && members.filter((m) => m.role === "campus_admin").length <= 1) {
      setActionError("Cannot remove the last campus admin — promote someone first.");
      return;
    }
    if (!confirm("Remove this person? They will no longer be able to login.")) return;
    setActionError("");
    try {
      await removeMember(user.campus_id, id);
      setMembers((p) => p.filter((m) => m.id !== id));
    } catch (e: any) {
      setActionError(e?.message || "Remove failed.");
    }
  }

  if (!authLoading && !user)
    return (
      <p className="rounded-2xl border bg-white p-6 text-sm">
        Please <Link href="/login" className="font-bold underline">login</Link> to open the dashboard.
      </p>
    );

  if (user && !canManageComplaints(user.role))
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm">
        <p className="font-bold">Wardens and campus admins only.</p>
        <p className="mt-1 text-zinc-600">
          You are logged in as {user.name} (student, {user.campus_name}).
        </p>
        <Link href="/" className="mt-3 inline-block font-bold underline">Go to my campus</Link>
      </div>
    );

  if (!loading && user?.role === "campus_admin" && campus && campus.status !== "approved") {
    return (
      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-3xl border bg-white p-6 text-center sm:p-8">
          <p className="text-4xl">{campus.status === "rejected" ? "⚠️" : "⏳"}</p>
          <h1 className="mt-2 text-xl font-bold">
            {campus.status === "rejected" ? "Registration declined" : "Verification in progress"}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {campus.status === "rejected"
              ? `${campus.reject_reason || "The team could not verify this registration."}`
              : "Your campus is under review. Member management unlocks on approval — the decision email arrives automatically."}
          </p>
          <Link
            href="/pending"
            className="mt-5 inline-flex min-h-[48px] items-center rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white"
          >
            Check status
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{user?.campus_name}</p>
        <h1 className="text-xl font-bold sm:text-2xl">
          {user?.role === "campus_admin" ? "Campus admin dashboard" : "Warden dashboard"}
        </h1>
        <p className="text-sm text-zinc-500">Only {user?.campus_name} issues. Updates go live instantly.</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[["Total", stats.total], ["Open", stats.open], ["In Progress", stats.in_progress], ["Resolved", stats.resolved]].map(
          ([k, v]) => (
            <div key={k as string} className="rounded-2xl border bg-white p-4 text-center">
              <p className="text-2xl font-bold">{v}</p>
              <p className="text-xs font-semibold text-zinc-500">{k}</p>
            </div>
          )
        )}
      </div>

      {actionError && (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {actionError}
        </p>
      )}

      {user?.role === "campus_admin" && (
        <section className="rounded-3xl border bg-white p-4 sm:p-5">
          <h2 className="font-bold">Members — {members.length} registered</h2>
          <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
            Add wardens + students here (single or CSV bulk). Login checks Name + Email exactly; emails are
            unique across all campuses. {stats.students} students • {stats.wardens} wardens.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_150px_auto]">
            <input
              value={mName}
              onChange={(e) => setMName(e.target.value)}
              placeholder="Full name"
              className="min-h-[46px] rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
            />
            <input
              value={mEmail}
              onChange={(e) => setMEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="min-h-[46px] rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
            />
            <select
              value={mRole}
              onChange={(e) => setMRole(e.target.value as Role)}
              className="min-h-[46px] rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
            >
              <option value="student">Student</option>
              <option value="warden">Warden</option>
              <option value="campus_admin">Admin</option>
            </select>
            <button
              onClick={addSingle}
              disabled={mBusy}
              className="flex min-h-[46px] items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {mBusy ? "Adding…" : "+ Add"}
            </button>
          </div>
          {mErr && <p className="mt-2 text-xs font-medium text-red-600">{mErr}</p>}

          <div className="mt-4 rounded-2xl bg-zinc-50 border p-3 sm:p-4">
            <p className="text-sm font-bold">Bulk upload (CSV) — best for 300+ students</p>
            <p className="mt-0.5 font-mono text-[11px] text-zinc-500">Name, Email, Role — one per line. Header row optional.</p>
            <textarea
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={4}
              placeholder={"Aarav Patel, aarav@college.edu, student\nRavi Warden, warden@college.edu, warden"}
              className="mt-2 min-h-[100px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-zinc-900"
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <label className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-100">
                Choose .csv file
                <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <button
                onClick={runBulk}
                disabled={mBusy}
                className="flex min-h-[44px] items-center justify-center rounded-xl bg-zinc-900 px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Upload members
              </button>
            </div>
            {csvResult && <p className="mt-2 text-xs font-medium text-zinc-700">{csvResult}</p>}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="mt-3 min-h-[44px] w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
          />
          <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto">
            {visibleMembers.length === 0 && <p className="text-sm text-zinc-500">No members yet.</p>}
            {visibleMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 border px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="truncate text-xs text-zinc-500">{m.email} • {m.role}</p>
                </div>
                <button
                  onClick={() => removeM(m.id)}
                  disabled={m.id === user?.id}
                  className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-bold hover:bg-white disabled:opacity-40"
                  title={m.id === user?.id ? "You cannot remove yourself" : "Remove"}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading campus issues…</p>
      ) : dbError ? (        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm">
          <p className="font-bold text-red-800">Can&apos;t reach the live database</p>
          <p className="mt-1 text-red-700">{dbError}</p>
          <p className="mt-2 text-red-700">
            Run <code>supabase/schema.sql</code> in Supabase SQL Editor, then retry.
            Status: <a href="/api/health" className="font-bold underline">/api/health</a>
          </p>
          <button
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-full bg-red-700 px-5 py-2.5 text-sm font-bold text-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {[...items]
            .sort((a, b) => b.upvotes_count - a.upvotes_count)
            .map((c) => (
              <div key={c.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-zinc-500">
                        ▲ {c.upvotes_count} • {c.category} • {c.block} • {timeAgo(c.created_at)}
                      </span>
                    </div>
                    <Link href={`/issue/${c.id}`} className="mt-1 block truncate font-bold hover:underline">
                      {c.title}
                    </Link>
                    <p className="truncate text-xs text-zinc-500">by {c.user_name}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 sm:flex">
                    {(["open", "in_progress", "resolved"] as Status[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(c.id, s)}
                        className={`flex min-h-[42px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-bold transition ${statusButton(s, c.status === s)}`}
                      >
                        {s === "open" ? "Open" : s === "in_progress" ? "In Prog." : "Resolved"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          {items.length === 0 && (
            <p className="rounded-2xl border bg-white p-6 text-center text-sm text-zinc-500">
              No issues in this campus yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
