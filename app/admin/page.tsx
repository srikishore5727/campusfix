"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge, timeAgo } from "@/components/ComplaintCard";
import { useAuth } from "@/lib/auth";
import {
  fetchComplaints,
  fetchWardenInvites,
  inviteWarden,
  removeWardenInvite,
  subscribeCampusUpdates,
  updateStatus,
  type WardenInviteRow,
} from "@/lib/store";
import type { Complaint, Status } from "@/lib/types";
import { canManageComplaints } from "@/lib/types";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [wardens, setWardens] = useState<WardenInviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [wErr, setWErr] = useState("");
  const [wBusy, setWBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const [c, w] = await Promise.all([
      fetchComplaints(user.campus_id),
      fetchWardenInvites(user.campus_id),
    ]);
    setItems(c);
    setWardens(w);
    setLoading(false);
  }, [user?.campus_id]);

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
    }),
    [items]
  );

  async function setStatus(id: string, s: Status) {
    setItems((p) => p.map((x) => (x.id === id ? { ...x, status: s } : x)));
    await updateStatus(id, s);
  }

  async function addWarden() {
    setWErr("");
    if (!user) return;
    setWBusy(true);
    try {
      const row = await inviteWarden(user.campus_id, email, user.id);
      setWardens((p) => [row, ...p]);
      setEmail("");
    } catch (e: any) {
      setWErr(e?.message || "Could not add.");
    } finally {
      setWBusy(false);
    }
  }

  async function removeW(id: string) {
    await removeWardenInvite(id);
    setWardens((p) => p.filter((w) => w.id !== id));
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
          You are logged in as {user.name} (student, {user.campus_name}). Students track progress on the feed.
        </p>
        <Link href="/" className="mt-3 inline-block font-bold underline">Go to feed</Link>
      </div>
    );

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

      {user?.role === "campus_admin" && (
        <section className="rounded-3xl border bg-white p-4 sm:p-5">
          <h2 className="font-bold">Manage wardens</h2>
          <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
            Add warden emails. Only added emails can sign up as warden for {user.campus_name}.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="warden@college.edu"
              type="email"
              className="min-h-[46px] flex-1 rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
            />
            <button
              onClick={addWarden}
              disabled={wBusy}
              className="flex min-h-[46px] items-center justify-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {wBusy ? "Adding…" : "+ Add warden"}
            </button>
          </div>
          {wErr && <p className="mt-2 text-xs font-medium text-red-600">{wErr}</p>}
          <div className="mt-3 space-y-1.5">
            {wardens.length === 0 && <p className="text-sm text-zinc-500">No wardens added yet.</p>}
            {wardens.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 border px-3 py-2.5 text-sm">
                <span className="truncate font-medium">{w.email}</span>
                <button onClick={() => removeW(w.id)} className="shrink-0 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-bold hover:bg-white">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading campus issues…</p>
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
                        className={`flex min-h-[42px] items-center justify-center rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                          c.status === s ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-300 hover:border-zinc-900"
                        }`}
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
