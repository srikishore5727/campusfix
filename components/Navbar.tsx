"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const link = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        path === href
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-900 text-lg font-bold text-white">
            C
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold">CampusFix</span>
            <span className="block text-xs text-zinc-500">
              Hostel complaint tracker
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {link("/", "Feed")}
          {link("/new", "Report")}
          {user && link("/my", "My issues")}
          {user?.role === "admin" && link("/admin", "Admin")}
        </nav>

        <div className="flex items-center gap-2">
          {!user ? (
            <Link
              href="/login"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Login
            </Link>
          ) : (
            <>
              <span className="hidden max-w-[160px] truncate text-right text-xs leading-tight text-zinc-600 md:block">
                <span className="block font-semibold text-zinc-900">
                  {user.name}
                </span>
                {user.role === "admin" ? "Warden (admin)" : user.email}
              </span>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                  router.refresh();
                }}
                className="rounded-full border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
        {link("/", "Feed")}
        {link("/new", "Report")}
        {user && link("/my", "My issues")}
        {user?.role === "admin" && link("/admin", "Admin")}
      </div>
    </header>
  );
}
