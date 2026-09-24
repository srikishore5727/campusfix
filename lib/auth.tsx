"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { AppUser } from "./types";
import { normalizeEmail, normalizeName } from "./types";
import { createCampus, findMemberByEmail } from "./store";
import { getSupabaseBrowser } from "./supabaseClient";

const SESSION_KEY = "campusfix_session_v3";
// drop all legacy sessions (demo + password eras)
const OLD_KEYS = ["campusfix_user_v1", "campusfix_session_v2"];

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  login: (name: string, email: string) => Promise<string | null>;
  registerCampus: (a: { campus_name: string; admin_name: string; admin_email: string }) => Promise<string | null>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    try {
      OLD_KEYS.forEach((k) => localStorage.removeItem(k));
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const u = JSON.parse(raw) as AppUser;
        if (u && u.campus_id && u.email && u.name && u.role) setUser(u);
        else localStorage.removeItem(SESSION_KEY);
      }
    } catch {}
    setLoading(false);
  }, []);

  function persist(u: AppUser | null) {
    setUser(u);
    try {
      if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  // Roster login: email globally unique -> auto-resolves campus.
  // Name must match roster (normalized exact).
  async function login(name: string, email: string): Promise<string | null> {
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanEmail = normalizeEmail(email);
    if (cleanName.length < 2) return "Enter your full name as given to your campus admin.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return "Enter a valid email.";
    const hit = await findMemberByEmail(cleanEmail);
    if (!hit) return "This email is not registered. Ask your campus admin to add you (Name + Email).";
    if (normalizeName(hit.name) !== normalizeName(cleanName))
      return `Name doesn't match our records for this email. Registered as "${hit.name}" — enter it exactly.`;
    persist({
      id: hit.id,
      name: hit.name,
      email: cleanEmail,
      role: hit.role,
      campus_id: hit.campus_id,
      campus_name: hit.campus_name,
    });
    return null;
  }

  async function registerCampus(a: { campus_name: string; admin_name: string; admin_email: string }): Promise<string | null> {
    const campusName = a.campus_name.trim().replace(/\s+/g, " ");
    const adminName = a.admin_name.trim().replace(/\s+/g, " ");
    const adminEmail = normalizeEmail(a.admin_email);
    if (campusName.length < 3) return "Enter your college / campus name.";
    if (adminName.length < 2) return "Enter the in-charge full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return "Enter a valid admin email.";
    const dupe = await findMemberByEmail(adminEmail);
    if (dupe) return "This email is already registered in another campus. Use a different email (emails are unique).";
    const camp = await createCampus(campusName);
    // add admin to roster (Supabase createCampus already made campus row; members insert next)
    const { addMember } = await import("./store");
    try {
      const m = await addMember(camp.id, adminName, adminEmail, "campus_admin");
      persist({
        id: m.id,
        name: m.name,
        email: normalizeEmail(m.email),
        role: "campus_admin",
        campus_id: camp.id,
        campus_name: camp.name,
      });
      return null;
    } catch (e: any) {
      return e?.message || "Could not create admin. Try again.";
    }
  }

  async function logout() {
    try {
      await supabase?.auth.signOut();
    } catch {}
    persist(null);
  }

  return <Ctx.Provider value={{ user, loading, login, registerCampus, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}
