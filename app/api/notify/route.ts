import { NextResponse } from "next/server";

// POST { to, subject, body, campusId, kind }
// Sends via Resend when RESEND_API_KEY is set, else simulates (logged).
// The team dashboard + local mail log remain the source of truth either way.
export async function POST(req: Request) {
  try {
    const { to, subject, body } = (await req.json()) as {
      to?: string;
      subject?: string;
      body?: string;
      campusId?: string;
      kind?: string;
    };
    if (!to || !subject || !body) {
      return NextResponse.json({ ok: false, error: "Missing to/subject/body." }, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || "CampusFix <team@campusfix.app>";
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
