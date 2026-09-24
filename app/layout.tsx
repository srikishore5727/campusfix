import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CampusFix — Hostel Complaint Tracker",
  description:
    "Report hostel/PG maintenance issues, upvote what affects you, and track fixes transparently. Next.js + Supabase fullstack project.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
          <footer className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 text-center text-xs text-zinc-500">
            CampusFix • Fullstack demo: Next.js + Supabase (Postgres, Auth,
            Storage) • Deployed on Vercel
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
