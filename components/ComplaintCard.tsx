import Link from "next/link";
import type { Complaint } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";

export function statusColor(s: Complaint["status"]) {
  if (s === "open") return "bg-red-100 text-red-700 border-red-200";
  if (s === "in_progress") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-green-100 text-green-700 border-green-200";
}

export function StatusBadge({ status }: { status: Complaint["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor(
        status
      )}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function ComplaintCard({
  c,
  voted,
  onUpvote,
}: {
  c: Complaint;
  voted: boolean;
  onUpvote: (c: Complaint) => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
              {c.category}
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
              {c.block}
            </span>
          </div>
          <Link href={`/issue/${c.id}`} className="hover:underline">
            <h3 className="truncate text-base font-bold text-zinc-900">
              {c.title}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
            {c.description}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {c.user_name} • {timeAgo(c.created_at)}
          </p>
        </div>
        <button
          onClick={() => onUpvote(c)}
          title={voted ? "Remove upvote" : "Upvote — I face this too"}
          className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-sm font-bold transition ${
            voted
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-900"
          }`}
        >
          <span className="text-base leading-none">▲</span>
          <span>{c.upvotes_count}</span>
        </button>
      </div>
    </article>
  );
}
