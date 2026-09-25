"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ComplaintCard from "@/components/ComplaintCard";
import { useAuth } from "@/lib/auth";
import { fetchComplaints, fetchUserUpvotedIds, mergeVotedState, subscribeCampusUpdates, toggleUpvote } from "@/lib/store";
import type { Complaint } from "@/lib/types";

export default function MyPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const all = await fetchComplaints(user.campus_id);
      const voted = await fetchUserUpvotedIds(user.id, all.map((c) => c.id));
      setItems(mergeVotedState(all, voted, user.id).filter((c) => c.user_id === user.id));
    } catch (e: any) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.campus_id]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  useEffect(() => subscribeCampusUpdates(() => load()), [load]);

  if (!authLoading && !user)
    return (
      <p className="rounded-2xl border bg-white p-6 text-sm">
        Please <Link href="/login" className="font-bold underline">login</Link> to see your issues.
      </p>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold sm:text-2xl">My issues ({items.length})</h1>
      <p className="text-sm text-zinc-500">Reports you filed in {user?.campus_name} — visible to your whole campus.</p>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-sm">
          Nothing yet. <Link href="/new" className="font-bold underline">Report your first issue</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((c) => (
            <ComplaintCard
              key={c.id}
              c={c}
              voted={(c.upvoted_by || []).includes(user!.id)}
              onUpvote={async (x) => {
                if (voting[x.id]) return;
                setVoting((p) => ({ ...p, [x.id]: true }));
                try {
                  const u = await toggleUpvote(x, user!.id);
                  setItems((p) => p.map((y) => (y.id === x.id ? u : y)));
                } finally {
                  setVoting((p) => ({ ...p, [x.id]: false }));
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
