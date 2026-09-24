"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { canManageComplaints } from "@/lib/types";

export default function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`flex min-h-[40px] items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        path === href
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-zinc-900 text-lg font-bold text-white">
            C
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-bold">CampusFix</span>
            <span className="block max-w-[180px] truncate text-[11px] text-zinc-500 sm:max-w-[260px]">
              {user ? user.campus_name : "Multi-campus issue tracker"}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {link("/", "Feed")}
          {user && link("/new", "Report")}
          {user && link("/my", "My issues")}
          {user && canManageComplaints(user.role) && link("/admin", "Dashboard")}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {!user ? (
            <Link
              href="/login"
              className="flex min-h-[42px] items-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
            >
              Login
            </Link>
          ) : (
            <>
              <span className="hidden max-w-[180px] truncate text-right text-xs leading-tight text-zinc-600 lg:block">
                <span className="block truncate font-semibold text-zinc-900">{user.name}</span>
                <span className="capitalize">
                  {user.role === "campus_admin" ? "Campus admin" : user.role}
                </span>
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
                className="flex min-h-[42px] items-center rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2 md:hidden">
        {link("/", "Feed")}
        {user && link("/new", "Report")}
        {user && link("/my", "My issues")}
        {user && canManageComplaints(user.role) && link("/admin", "Dashboard")}
      </div>
    </header>
  );
}
