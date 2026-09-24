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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusColor(status)}`}
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
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="h-4 w-2/3 rounded bg-zinc-200" />
      <div className="mt-2 h-3 w-full rounded bg-zinc-100" />
      <div className="mt-1 h-3 w-5/6 rounded bg-zinc-100" />
    </div>
  );
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
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={c.status} />
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
              {c.category}
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
              {c.block}
            </span>
          </div>
          <Link href={`/issue/${c.id}`} className="block hover:underline">
            <h3 className="text-[15px] font-bold leading-snug text-zinc-900 sm:text-base">
              {c.title}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600">
            {c.description}
          </p>
          {c.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.image_url}
              alt=""
              loading="lazy"
              className="mt-2 h-24 w-full rounded-xl border object-cover sm:h-32"
            />
          )}
          <p className="mt-2 truncate text-xs text-zinc-500">
            {c.user_name} • {timeAgo(c.created_at)}
          </p>
        </div>
        <button
          onClick={() => onUpvote(c)}
          title={voted ? "Remove upvote" : "Upvote — I face this too"}
          className={`flex min-h-[64px] min-w-[56px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border px-3 py-2 text-sm font-bold transition active:scale-95 ${
            voted
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-900"
          }`}
        >
          <span className="text-sm leading-none">▲</span>
          <span className="text-base">{c.upvotes_count}</span>
        </button>
      </div>
    </article>
  );
}
