"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatusBadge, timeAgo } from "@/components/ComplaintCard";
import { useAuth } from "@/lib/auth";
import { fetchComplaints, updateStatus } from "@/lib/store";
import type { Complaint, Status } from "@/lib/types";

export default function AdminPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints().then((d) => {
      setItems(d);
      setLoading(false);
    });
  }, []);

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
    await updateStatus(id, s);
    setItems((p) => p.map((x) => (x.id === id ? { ...x, status: s } : x)));
  }

  if (!user)
    return (
      <p className="rounded-2xl border bg-white p-6 text-sm">
        Please <Link href="/login" className="font-bold underline">login as admin</Link> to open this dashboard.
      </p>
    );

  if (user.role !== "admin")
    return (
      <div className="rounded-2xl border bg-white p-6 text-sm">
        <p className="font-bold">Admins only.</p>
        <p className="mt-1 text-zinc-600">
          You are logged in as {user.name} (student). Logout and login again as
          Warden (admin) via demo login.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Warden dashboard</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total", stats.total],
          ["Open", stats.open],
          ["In Progress", stats.in_progress],
          ["Resolved", stats.resolved],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-2xl border bg-white p-4 text-center">
            <p className="text-2xl font-bold">{v}</p>
            <p className="text-xs font-semibold text-zinc-500">{k}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div className="space-y-2">
          {[...items]
            .sort((a, b) => b.upvotes_count - a.upvotes_count)
            .map((c) => (
              <div key={c.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={c.status} />
                      <span className="text-xs text-zinc-500">
                        ▲ {c.upvotes_count} • {c.category} • {c.block} • {timeAgo(c.created_at)}
                      </span>
                    </div>
                    <Link href={`/issue/${c.id}`} className="mt-1 block truncate font-bold hover:underline">
                      {c.title}
                    </Link>
                    <p className="text-xs text-zinc-500">by {c.user_name}</p>
                  </div>
                  <div className="flex gap-1.5">
                    {(["open", "in_progress", "resolved"] as Status[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(c.id, s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold border ${
                          c.status === s
                            ? "bg-zinc-900 text-white border-zinc-900"
                            : "border-zinc-300 hover:border-zinc-900"
                        }`}
                      >
                        {s === "open" ? "Open" : s === "in_progress" ? "In Progress" : "Resolved"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
