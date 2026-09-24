"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { fetchCampusById, subscribeCampusUpdates } from "@/lib/store";
import type { Campus } from "@/lib/types";

export default function PendingPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [campus, setCampus] = useState<Campus | null>(null);

  useEffect(() => {
    if (!authLoading && user?.campus_id) {
      fetchCampusById(user.campus_id).then(setCampus);
      return subscribeCampusUpdates(() => fetchCampusById(user.campus_id).then(setCampus));
    }
  }, [authLoading, user?.campus_id]);

  if (!authLoading && !user) {
    return (
      <p className="mx-auto max-w-md rounded-2xl border bg-white p-6 text-sm">
        Please <Link href="/login" className="font-bold underline">login</Link> first.
      </p>
    );
  }

  const status = campus?.status || "pending";

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="rounded-3xl border bg-white p-6 text-center sm:p-8">
        {status === "approved" ? (
          <>
            <p className="text-4xl">🎉</p>
            <h1 className="mt-2 text-xl font-bold">Your campus is approved!</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {campus?.name} is verified. Your admin access is active — start adding wardens and students.
            </p>
            <Link
              href="/admin"
              className="mt-5 inline-flex min-h-[48px] items-center rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white"
            >
              Open admin dashboard
            </Link>
          </>
        ) : status === "rejected" ? (
          <>
            <p className="text-4xl">⚠️</p>
            <h1 className="mt-2 text-xl font-bold">Registration declined</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {campus?.reject_reason || "The team could not verify this registration."} A detailed email was
              sent to {campus?.contact_email}. Fix the issue and register again, or contact the team.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/login"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-bold text-white"
              >
                Register again
              </Link>
              <button
                onClick={logout}
                className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border px-6 py-2.5 text-sm font-semibold"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-4xl">⏳</p>
            <h1 className="mt-2 text-xl font-bold">Verification in progress</h1>
            <p className="mt-1 text-sm text-zinc-500">
              <b>{campus?.name || user?.campus_name}</b> is under review by the CampusFix team. You&apos;ll
              get an approval or decline email at <b>{campus?.contact_email || user?.email}</b> automatically.
              This page updates on its own once reviewed.
            </p>
            <p className="mt-3 rounded-xl bg-zinc-50 border p-3 text-xs text-zinc-500">
              Duplicate check: this name can exist only once — nobody else can register it while yours is
              pending or approved.
            </p>
            <button
              onClick={logout}
              className="mt-5 inline-flex min-h-[44px] items-center rounded-2xl border px-6 py-2.5 text-sm font-semibold"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
