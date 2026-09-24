"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge, timeAgo } from "@/components/ComplaintCard";
import { useAuth } from "@/lib/auth";
import {
  addComment,
  fetchComments,
  fetchComplaintById,
  subscribeCampusUpdates,
  toggleUpvote,
  updateStatus,
} from "@/lib/store";
import type { Comment, Complaint, Status } from "@/lib/types";
import { STATUS_LABEL, canManageComplaints } from "@/lib/types";

export default function IssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [item, setItem] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [dbError, setDbError] = useState("");

  const load = useCallback(async () => {
    try {
      const c = await fetchComplaintById(id);
      if (!c) {
        setLoading(false);
        return;
      }
      // Campus isolation: users can only view their own campus issues
      if (user && c.campus_id !== user.campus_id) {
        setDenied(true);
        setLoading(false);
        return;
      }
      setItem(c);
      setComments(await fetchComments(id));
      setDbError("");
    } catch (e: any) {
      setDbError(e?.message || "Could not load this issue.");
    } finally {
      setLoading(false);
    }
  }, [id, user?.campus_id]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  useEffect(() => {
    const unsub = subscribeCampusUpdates(() => load());
    return unsub;
  }, [load]);

  if (authLoading || loading)
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <div className="h-6 w-24 animate-pulse rounded bg-zinc-200" />
        <div className="animate-pulse rounded-3xl border bg-white p-6">
          <div className="h-5 w-2/3 rounded bg-zinc-200" />
          <div className="mt-3 h-3 w-full rounded bg-zinc-100" />
          <div className="mt-2 h-3 w-5/6 rounded bg-zinc-100" />
        </div>
      </div>
    );

  if (!user)
    return (
      <div className="mx-auto max-w-md rounded-3xl border bg-white p-8 text-center">
        <p className="font-bold">Login to view this issue</p>
        <p className="mt-1 text-sm text-zinc-500">Issues are private to each campus.</p>
        <Link href="/login" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white">
          Go to login
        </Link>
      </div>
    );

  if (denied)
    return (
      <div className="mx-auto max-w-md rounded-3xl border bg-white p-8 text-center text-sm">
        <p className="font-bold">Not in your campus.</p>
        <p className="mt-1 text-zinc-500">This issue belongs to another college. You can only view {user.campus_name} issues.</p>
        <Link href="/" className="mt-4 inline-block font-bold underline">Back to my campus feed</Link>
      </div>
    );

  if (!item)
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm">
        {dbError ? (
          <>
            <p className="font-bold text-red-700">Can&apos;t reach the live database</p>
            <p className="mt-1 text-zinc-600">{dbError}</p>
            <p className="mt-2 text-zinc-600">
              Run <code>supabase/schema.sql</code>, then retry. Status:{" "}
              <Link href="/api/health" className="font-bold underline">/api/health</Link>
            </p>
          </>
        ) : (
          <>Issue not found. <Link href="/" className="font-bold underline">Back to feed</Link></>
        )}
      </div>
    );

  const voted = item.upvoted_by.includes(user.id);
  const canManage = canManageComplaints(user.role);

  async function onUpvote() {
    setItem({
      ...item!,
      upvotes_count: voted ? item!.upvotes_count - 1 : item!.upvotes_count + 1,
      upvoted_by: voted ? item!.upvoted_by.filter((x) => x !== user!.id) : [...item!.upvoted_by, user!.id],
    });
    const updated = await toggleUpvote(item!, user!.id);
    setItem({ ...updated, upvoted_by: updated.upvoted_by.length ? updated.upvoted_by : item!.upvoted_by });
  }

  async function sendComment() {
    if (body.trim().length < 2) return;
    const cur = item!;
    const c = await addComment({
      complaint_id: cur.id,
      user_id: user!.id,
      user_name: user!.name,
      role: user!.role,
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
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Link href="/" className="inline-flex min-h-[40px] items-center text-sm font-semibold text-zinc-600 hover:underline">
        ← {user.campus_name} feed
      </Link>

      <article className="rounded-3xl border bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={item.status} />
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold">{item.category}</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold">{item.block}</span>
          <span className="text-xs text-zinc-500">{timeAgo(item.created_at)}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold leading-tight sm:text-2xl">{item.title}</h1>
        <p className="mt-1 text-sm text-zinc-500">Reported by {item.user_name}</p>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{item.description}</p>
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt="proof" className="mt-3 max-h-96 w-full rounded-2xl border object-cover" />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={onUpvote}
            className={`flex min-h-[44px] items-center rounded-full border px-5 py-2.5 text-sm font-bold transition active:scale-95 ${
              voted ? "bg-zinc-900 text-white border-zinc-900" : "border-zinc-300 hover:border-zinc-900"
            }`}
          >
            {voted ? "▲ Upvoted" : "△ Upvote"} • {item.upvotes_count}
          </button>
        </div>

        {canManage && (
          <div className="mt-4 rounded-2xl border bg-zinc-50 p-3 sm:p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-600">
              {user.role === "campus_admin" ? "Campus admin" : "Warden"}: update status
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["open", "in_progress", "resolved"] as Status[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`flex min-h-[44px] items-center justify-center rounded-xl border px-2 py-2 text-xs font-bold transition sm:text-[13px] ${
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

      <section className="rounded-3xl border bg-white p-4 sm:p-6">
        <h2 className="font-bold">Updates & comments ({comments.length})</h2>
        <div className="mt-3 space-y-2">
          {comments.length === 0 && <p className="text-sm text-zinc-500">No comments yet. Ask for an update.</p>}
          {comments.map((c) => (
            <div key={c.id} className={`rounded-2xl border p-3 text-sm ${c.role !== "student" ? "border-green-300 bg-green-50" : "border-zinc-200"}`}>
              <p className="text-xs font-bold">
                {c.user_name}{" "}
                <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${c.role !== "student" ? "bg-green-600 text-white" : "bg-zinc-200 text-zinc-700"}`}>
                  {c.role === "campus_admin" ? "CAMPUS ADMIN" : c.role === "warden" ? "WARDEN" : "STUDENT"}
                </span>{" "}
                <span className="font-normal text-zinc-500">{timeAgo(c.created_at)}</span>
              </p>
              <p className="mt-1 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
            placeholder="Write an update or question…"
            className="min-h-[46px] flex-1 rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm outline-none focus:border-zinc-900"
          />
          <button onClick={sendComment} className="flex min-h-[46px] items-center rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition active:scale-95">
            Send
          </button>
        </div>
      </section>
    </div>
  );
}
