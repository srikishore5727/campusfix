"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ComplaintCard, { SkeletonCard } from "@/components/ComplaintCard";
import { useAuth } from "@/lib/auth";
import {
  ensureSeed,
  fetchComplaints,
  subscribeCampusUpdates,
  toggleUpvote,
} from "@/lib/store";
import { CATEGORIES, type Complaint, type Status } from "@/lib/types";

type Filter = "all" | Status;

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"top" | "new">("top");
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const campusId = user?.campus_id || "";

  const load = useCallback(async () => {
    if (!campusId) {
      setLoading(false);
      return;
    }
    ensureSeed();
    const data = await fetchComplaints(campusId);
    setItems(data);
    setLoading(false);
    setLastSync(new Date());
  }, [campusId]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  // Live updates: Supabase realtime + local events + focus + polling fallback
  useEffect(() => {
    if (!campusId) return;
    const unsub = subscribeCampusUpdates(() => load());
    return unsub;
  }, [campusId, load]);

  async function onUpvote(c: Complaint) {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    // optimistic update for instant feel
    setItems((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? {
              ...x,
              upvotes_count: x.upvoted_by.includes(user.id)
                ? x.upvotes_count - 1
                : x.upvotes_count + 1,
              upvoted_by: x.upvoted_by.includes(user.id)
                ? x.upvoted_by.filter((id) => id !== user.id)
                : [...x.upvoted_by, user.id],
            }
          : x
      )
    );
    const updated = await toggleUpvote(c, user.id);
    setItems((prev) => prev.map((x) => (x.id === c.id ? { ...updated, upvoted_by: updated.upvoted_by.length ? updated.upvoted_by : prev.find((p) => p.id === c.id)?.upvoted_by || [] } : x)));
    // refetch to get true server count (fixes stale vote counts)
    load();
  }

  const counts = useMemo(
    () => ({
      open: items.filter((i) => i.status === "open").length,
      in_progress: items.filter((i) => i.status === "in_progress").length,
      resolved: items.filter((i) => i.status === "resolved").length,
    }),
    [items]
  );

  const visible = useMemo(() => {
    let v = [...items];
    if (filter !== "all") v = v.filter((i) => i.status === filter);
    if (cat !== "all") v = v.filter((i) => i.category === cat);
    if (q.trim()) {
      const s = q.toLowerCase();
      v = v.filter(
        (i) =>
          i.title.toLowerCase().includes(s) ||
          i.description.toLowerCase().includes(s) ||
          i.block.toLowerCase().includes(s)
      );
    }
    v.sort((a, b) =>
      sort === "top" ? b.upvotes_count - a.upvotes_count : +new Date(b.created_at) - +new Date(a.created_at)
    );
    return v;
  }, [items, filter, cat, q, sort]);

  if (!authLoading && !user) {
    return (
      <div className="space-y-5">
        <section className="rounded-3xl bg-zinc-900 p-6 text-white sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Multi-campus maintenance platform
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-4xl">
            Fix your campus, together.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Each college gets an isolated space. Students report water, wifi, electricity or cleaning
            issues with photo proof, upvote what affects them, and watch wardens move it to Resolved.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/login"
              className="flex min-h-[48px] items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-bold text-zinc-900 transition hover:bg-zinc-200"
            >
              Login / Sign up
            </Link>
            <span className="flex min-h-[48px] items-center justify-center rounded-2xl bg-white/10 px-6 py-3 text-sm font-semibold">
              No demo accounts — real campus login
            </span>
          </div>
        </section>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["1. Pick your campus", "Students, wardens and admins all join under their college."],
            ["2. Report + upvote", "Photo proof + location. Others upvote to set priority."],
            ["3. Track to resolved", "Warden updates status live. Feed refreshes on every change."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border bg-white p-4">
              <p className="font-bold text-sm">{t}</p>
              <p className="mt-1 text-sm text-zinc-500">{d}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-3xl bg-zinc-900 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
              {user?.campus_name}
            </p>
            <h1 className="text-xl font-bold sm:text-2xl">Campus feed</h1>
          </div>
          <Link
            href="/new"
            className="flex min-h-[44px] items-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-200"
          >
            + Report
          </Link>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-white/10 px-3 py-1.5">{counts.open} Open</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">{counts.in_progress} In Progress</span>
          <span className="rounded-full bg-white/10 px-3 py-1.5">{counts.resolved} Resolved</span>
          {lastSync && (
            <span className="ml-auto text-[11px] font-normal text-zinc-400">
              Synced {lastSync.toLocaleTimeString()} • auto-updates on
            </span>
          )}
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, block, keyword…"
          className="min-h-[44px] w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
        />
        <div className="grid grid-cols-3 gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} className="min-h-[44px] rounded-xl border border-zinc-300 bg-white px-2 py-2 text-[13px] sm:text-sm">
            <option value="all">All status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="min-h-[44px] rounded-xl border border-zinc-300 bg-white px-2 py-2 text-[13px] sm:text-sm">
            <option value="all">All types</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as "top" | "new")} className="min-h-[44px] rounded-xl border border-zinc-300 bg-white px-2 py-2 text-[13px] sm:text-sm">
            <option value="top">Top voted</option>
            <option value="new">Newest</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center sm:p-10">
          <p className="font-bold">No issues here yet.</p>
          <p className="mt-1 text-sm text-zinc-500">Be the first in {user?.campus_name} to report — others will upvote.</p>
          <Link href="/new" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white">
            Report issue
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((c) => (
            <ComplaintCard key={c.id} c={c} voted={Boolean(user && c.upvoted_by.includes(user.id))} onUpvote={onUpvote} />
          ))}
        </div>
      )}
    </div>
  );
}
