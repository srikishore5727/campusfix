"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ComplaintCard from "@/components/ComplaintCard";
import { useAuth } from "@/lib/auth";
import { ensureSeed, fetchComplaints, toggleUpvote } from "@/lib/store";
import { CATEGORIES, type Complaint, type Status } from "@/lib/types";

type Filter = "all" | Status;

export default function Home() {
  const { user } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"top" | "new">("top");

  async function load() {
    setLoading(true);
    ensureSeed();
    const data = await fetchComplaints();
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onUpvote(c: Complaint) {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const updated = await toggleUpvote(c, user.id);
    setItems((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
  }

  const counts = useMemo(() => {
    return {
      open: items.filter((i) => i.status === "open").length,
      in_progress: items.filter((i) => i.status === "in_progress").length,
      resolved: items.filter((i) => i.status === "resolved").length,
    };
  }, [items]);

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
      sort === "top"
        ? b.upvotes_count - a.upvotes_count
        : +new Date(b.created_at) - +new Date(a.created_at)
    );
    return v;
  }, [items, filter, cat, q, sort]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-zinc-900 p-6 text-white">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Fix your hostel, together.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-300">
          No more lost WhatsApp complaints. Report water, wifi, electricity or
          cleaning issues with a photo, let others upvote, and watch the warden
          move it to Resolved.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/new"
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-zinc-200"
          >
            + Report an issue
          </Link>
          <div className="flex gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/10 px-3 py-2">
              {counts.open} Open
            </span>
            <span className="rounded-full bg-white/10 px-3 py-2">
              {counts.in_progress} In Progress
            </span>
            <span className="rounded-full bg-white/10 px-3 py-2">
              {counts.resolved} Resolved
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 lg:flex-row lg:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, block, keyword… (e.g. water, Block B)"
          className="w-full flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="all">All status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "top" | "new")}
            className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="top">Most upvoted</option>
            <option value="new">Newest</option>
          </select>
        </div>
      </section>

      {loading ? (
        <p className="py-10 text-center text-sm text-zinc-500">Loading issues…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="font-semibold">No issues match your filters.</p>
          <p className="mt-1 text-sm text-zinc-500">
            Be the first to report it so others can upvote.
          </p>
          <Link
            href="/new"
            className="mt-4 inline-block rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Report issue
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {visible.map((c) => (
            <ComplaintCard
              key={c.id}
              c={c}
              voted={Boolean(user && c.upvoted_by.includes(user.id))}
              onUpvote={onUpvote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
