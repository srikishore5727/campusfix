import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/health — tells you in one glance whether the app is LIVE (cloud DB)
// or silently running on local demo data. If db.ok is false, read db.error:
// it names the exact problem (e.g. tables not created yet).
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = Boolean(url && anon);

  if (!configured) {
    return NextResponse.json({
      ok: true,
      app: "campusfix",
      time: new Date().toISOString(),
      mode: "local",
      supabaseConfigured: false,
      db: { ok: false, error: "Env vars missing — app runs on browser-local demo data." },
    });
  }

  try {
    const sb = createClient(url!, anon!);
    const { count, error } = await sb
      .from("campuses")
      .select("id", { count: "exact", head: true });
    if (error) {
      return NextResponse.json({
        ok: true,
        app: "campusfix",
        time: new Date().toISOString(),
        mode: "local-fallback",
        supabaseConfigured: true,
        db: {
          ok: false,
          error: error.message,
          hint: error.message.includes("does not exist")
            ? "Tables not created. Run supabase/schema.sql in Supabase SQL Editor."
            : "Check Supabase project status, RLS policies, and anon key.",
        },
      });
    }
    return NextResponse.json({
      ok: true,
      app: "campusfix",
      time: new Date().toISOString(),
      mode: "live",
      supabaseConfigured: true,
      db: { ok: true, campusCount: count },
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: true,
      app: "campusfix",
      time: new Date().toISOString(),
      mode: "local-fallback",
      supabaseConfigured: true,
      db: { ok: false, error: e?.message || "Probe failed." },
    });
  }
}
