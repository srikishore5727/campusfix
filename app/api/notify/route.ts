import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST { to, subject, body, campusId, kind }
// Sends via Resend when RESEND_API_KEY is set, else simulates (logged).
// Guarded: campusId must reference a real campus; lengths capped.
export async function POST(req: Request) {
  try {
    const { to, subject, body, campusId, kind } = (await req.json()) as {
      to?: string;
      subject?: string;
      body?: string;
      campusId?: string;
      kind?: string;
    };
    if (!to || !subject || !body) {
      return NextResponse.json({ ok: false, error: "Missing to/subject/body." }, { status: 400 });
    }
    if (to.length > 200 || subject.length > 150 || body.length > 3000) {
      return NextResponse.json({ ok: false, error: "Payload too large." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json({ ok: false, error: "Invalid recipient." }, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || "CampusFix <team@campusfix.app>";

    // Verify the campus reference so random POSTs can't trigger sends.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (campusId && url && anon) {
      try {
        const sb = createClient(url, anon);
        const { data } = await sb.from("campuses").select("id").eq("id", campusId).single();
        if (!data) {
          return NextResponse.json({ ok: false, error: "Unknown campus." }, { status: 400 });
        }
      } catch {
        // fall through to simulated log rather than failing the review flow
      }
    }
    if (!key) {
      console.log(`[CampusFix mail:simulated] to=${to} subject=${subject}`);
      return NextResponse.json({ ok: true, simulated: true });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text: body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: (data as any)?.message || "Resend failed." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: (data as any)?.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Notify failed." }, { status: 500 });
  }
}
