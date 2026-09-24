"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ComplaintCard from "@/components/ComplaintCard";
import { useAuth } from "@/lib/auth";
import { fetchComplaints, toggleUpvote } from "@/lib/store";
import type { Complaint } from "@/lib/types";

export default function MyPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplaints().then((all) => {
      setItems(user ? all.filter((c) => c.user_id === user.id) : []);
      setLoading(false);
    });
  }, [user?.id]);

  if (!user)
    return (
      <p className="rounded-2xl border bg-white p-6 text-sm">
        Please <Link href="/login" className="font-bold underline">login</Link> to see your issues.
      </p>
    );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My issues ({items.length})</h1>
      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-sm">
          You have not reported anything yet.{" "}
          <Link href="/new" className="font-bold underline">Report your first issue</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((c) => (
            <ComplaintCard
              key={c.id}
              c={c}
              voted={c.upvoted_by.includes(user.id)}
              onUpvote={async (x) => {
                const u = await toggleUpvote(x, user.id);
                setItems((p) => p.map((y) => (y.id === x.id ? u : y)));
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
