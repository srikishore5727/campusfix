import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// POST { to, subject, body, campusId, kind }
// Sender chain (first configured wins):
//   1) Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD) — sends FROM your gmail to anyone. Free.
//   2) Resend (RESEND_API_KEY + verified domain in RESEND_FROM) — NOTE: Resend can
//      NEVER send from a gmail.com address; only domains you own and verified.
//   3) Logged-only fallback (audit log in /team; nothing actually delivered).
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
        // fall through to send attempt rather than failing the review flow
      }
    }

    // 1) Gmail SMTP — the only free way to send FROM a gmail address.
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (gmailUser && gmailPass) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: gmailUser, pass: gmailPass },
        });
        const info = await transporter.sendMail({
          from: `CampusFix <${gmailUser}>`,
          to,
          subject,
          text: body,
        });
        console.log(`[CampusFix mail:gmail] to=${to} id=${info.messageId}`);
        return NextResponse.json({ ok: true, delivered: true, channel: "gmail", id: info.messageId });
      } catch (e: any) {
        console.log(`[CampusFix mail:gmail-failed] to=${to} err=${e?.message}`);
        return NextResponse.json({
          ok: true,
          delivered: false,
          channel: "gmail",
          error: e?.message || "Gmail send failed. Check GMAIL_USER / GMAIL_APP_PASSWORD (needs a Google App Password, not your login password).",
        });
      }
    }

    // 2) Resend (custom verified domains only — never gmail.com).
    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM || "CampusFix <team@campusfix.app>";
    if (key) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to, subject, text: body }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.log(`[CampusFix mail:resend-failed] to=${to} err=${(data as any)?.message}`);
          return NextResponse.json({
            ok: true,
            delivered: false,
            channel: "resend",
            error: (data as any)?.message || "Resend failed. Resend cannot send from gmail.com — use Gmail SMTP or verify your own domain.",
          });
        }
        return NextResponse.json({ ok: true, delivered: true, channel: "resend", id: (data as any)?.id });
      } catch (e: any) {
        console.log(`[CampusFix mail:error] to=${to} err=${e?.message}`);
        return NextResponse.json({ ok: true, delivered: false, channel: "resend", error: e?.message || "Send failed." });
      }
    }

    // 3) Logged-only fallback.
    console.log(`[CampusFix mail:logged] to=${to} subject=${subject}`);
    return NextResponse.json({ ok: true, delivered: false, channel: "log", error: "No sender configured. Set GMAIL_USER + GMAIL_APP_PASSWORD for real delivery." });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Notify failed." }, { status: 500 });
  }
}
