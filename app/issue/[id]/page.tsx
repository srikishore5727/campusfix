"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge, timeAgo } from "@/components/ComplaintCard";
import { useAuth } from "@/lib/auth";
import {
  addComment,
  fetchComments,
  fetchComplaints,
  toggleUpvote,
  updateStatus,
} from "@/lib/store";
import type { Comment, Complaint, Status } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";

export default function IssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [item, setItem] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const all = await fetchComplaints();
      setItem(all.find((c) => c.id === id) || null);
      setComments(await fetchComments(id));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="py-10 text-center text-sm text-zinc-500">Loading issue…</p>;
  if (!item)
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm">
        Issue not found (it may be local-only on another browser).{" "}
        <Link href="/" className="font-bold underline">Back to feed</Link>
      </div>
    );

  const voted = Boolean(user && item.upvoted_by.includes(user.id));

  async function onUpvote() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setItem(await toggleUpvote(item!, user.id));
  }

  async function sendComment() {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    const cur = item;
    if (!cur) return;
    if (body.trim().length < 2) return;
    const c = await addComment({
      complaint_id: cur.id,
      user_id: user.id,
      user_name: user.name,
      role: user.role,
      body: body.trim(),
    });
    setComments((p) => [...p, c]);
    setBody("");
  }

  async function setStatus(s: Status) {
    await updateStatus(item!.id, s);
    setItem({ ...item!, status: s });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/" className="text-sm font-semibold text-zinc-600 hover:underline">
        ← Back to feed
      </Link>

      <article className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium">{item.category}</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium">{item.block}</span>
          <span className="text-xs text-zinc-500">{timeAgo(item.created_at)}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold">{item.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">Reported by {item.user_name}</p>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{item.description}</p>
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="proof" className="mt-3 max-h-96 rounded-xl border" />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={onUpvote}
            className={`rounded-full px-4 py-2 text-sm font-bold border ${
              voted ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-300 hover:border-zinc-900"
            }`}
          >
            {voted ? "▲ Upvoted" : "△ Upvote"} • {item.upvotes_count}
          </button>
          <span className="text-xs text-zinc-500">Upvote if you face this too — helps warden prioritize.</span>
        </div>

        {user?.role === "admin" && (
          <div className="mt-4 rounded-xl bg-zinc-50 border p-3">
            <p className="text-xs font-bold text-zinc-600">ADMIN: update status</p>
            <div className="mt-2 flex gap-2">
              {(["open", "in_progress", "resolved"] as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold border ${
                    item.status === s ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-300 bg-white"
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        )}
      </article>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-bold">Updates & comments ({comments.length})</h2>
        <div className="mt-3 space-y-2">
          {comments.length === 0 && (
            <p className="text-sm text-zinc-500">No comments yet. Ask for an update or add info.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className={`rounded-xl border p-3 text-sm ${c.role === "admin" ? "border-green-300 bg-green-50" : "border-zinc-200"}`}>
              <p className="text-xs font-bold">
                {c.user_name}{" "}
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${c.role === "admin" ? "bg-green-600 text-white" : "bg-zinc-200 text-zinc-700"}`}>
                  {c.role === "admin" ? "WARDEN" : "STUDENT"}
                </span>{" "}
                <span className="font-normal text-zinc-500">{timeAgo(c.created_at)}</span>
              </p>
              <p className="mt-1">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
            placeholder={user ? "Write an update or question…" : "Login to comment…"}
            className="flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
          />
          <button onClick={sendComment} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white">
            Send
          </button>
        </div>
      </section>
    </div>
  );
}
