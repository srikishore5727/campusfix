"use client";

import Image from "next/image";
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
        <Link href={user ? "/" : "/login"} className="flex min-w-0 items-center gap-2">
          <Image
            src="/campusfix-logo.png"
            alt="CampusFix"
            width={140}
            height={32}
            priority
            className="h-7 w-auto sm:h-8"
          />
          {user && (
            <span className="hidden max-w-[200px] truncate rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 sm:block">
              {user.campus_name}
            </span>
          )}
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 md:flex">
            {user.role === "student" ? (
              <>
                {link("/", "My Campus")}
                {link("/new", "Report")}
                {link("/my", "My issues")}
              </>
            ) : (
              <>
                {link("/", "Feed")}
                {link("/admin", "Dashboard")}
                {link("/my", "My posts")}
              </>
            )}
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {!user ? (
            <>
              <Link
                href="/login"
                className="hidden min-h-[42px] items-center rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 sm:flex"
              >
                Register campus
              </Link>
              <Link
                href="/login"
                className="flex min-h-[42px] items-center rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
              >
                Login
              </Link>
            </>
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
      {user && (
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 pb-2 md:hidden">
          {user.role === "student" ? (
            <>
              {link("/", "My Campus")}
              {link("/new", "Report")}
              {link("/my", "My issues")}
            </>
          ) : (
            <>
              {link("/", "Feed")}
              {link("/admin", "Dashboard")}
              {link("/my", "My posts")}
            </>
          )}
        </div>
      )}
    </header>
  );
}
