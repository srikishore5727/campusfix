import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CampusFix — Multi-campus Complaint Tracker",
  description:
    "One platform, many campuses. Students report issues, wardens resolve, campus admins manage. Next.js + Supabase with live updates.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#fafafa] text-zinc-900 antialiased">
        <AuthProvider>
          <Navbar />
          <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
            {children}
          </main>
          <footer className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 text-center text-xs text-zinc-500">
            CampusFix • Multi-tenant: Next.js + Supabase (Postgres, Auth, Storage, Realtime) • Vercel
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
