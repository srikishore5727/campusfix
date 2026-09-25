"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { AppUser } from "./types";
import { getTeamMemberName, isTeamEmail, normalizeEmail, normalizeName } from "./types";
import { createCampus, fetchCampusById, findMemberByEmail } from "./store";
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
        // team sessions must match the fixed roster (name + email), like everyone else
        const rosterName = u.role === "super_admin" ? getTeamMemberName(u.email) : null;
        const teamOk =
          u.role === "super_admin" &&
          rosterName !== null &&
          normalizeName(u.name) === normalizeName(rosterName);
        const memberOk = u.role !== "super_admin" && u.campus_id && u.email && u.name && u.role;
        if (teamOk || memberOk) {
          // canonicalize team display name from roster
          if (teamOk && rosterName) u.name = rosterName;
          setUser(u);
        } else localStorage.removeItem(SESSION_KEY);
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

  // Unified login:
  // 1) team emails -> super_admin (no campus), straight to /team
  // 2) roster members -> campus auto-resolved; pending campuses login OK
  //    but feed/dashboard show "under review" until approved.
  async function login(name: string, email: string): Promise<string | null> {
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanEmail = normalizeEmail(email);
    if (cleanName.length < 2) return "Enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return "Enter a valid email.";

    if (isTeamEmail(cleanEmail)) {
      const rosterName = getTeamMemberName(cleanEmail)!;
      if (normalizeName(cleanName) !== normalizeName(rosterName))
        return `Name doesn't match our team records for this email. Registered as "${rosterName}" — enter it exactly.`;
      persist({
        id: `team_${cleanEmail}`,
        name: rosterName,
        email: cleanEmail,
        role: "super_admin",
        campus_id: "",
        campus_name: "CampusFix team",
      });
      return null;
    }

    const hit = await findMemberByEmail(cleanEmail);
    if (!hit) return "This email is not registered. Ask your campus admin to add you (Name + Email).";
    if (normalizeName(hit.name) !== normalizeName(cleanName))
      return `Name doesn't match our records for this email. Registered as "${hit.name}" — enter it exactly.`;

    const camp = await fetchCampusById(hit.campus_id);
    if (camp && camp.status === "rejected")
      return `This campus registration was declined${camp.reject_reason ? `: ${camp.reject_reason}` : "."} Contact the CampusFix team for help.`;

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

  // New campus -> PENDING verification. Session is kept so the applicant
  // sees the "under review" status page; admin access unlocks on approval.
  async function registerCampus(a: { campus_name: string; admin_name: string; admin_email: string }): Promise<string | null> {
    const campusName = a.campus_name.trim().replace(/\s+/g, " ");
    const adminName = a.admin_name.trim().replace(/\s+/g, " ");
    const adminEmail = normalizeEmail(a.admin_email);
    if (campusName.length < 3) return "Enter your college / campus name.";
    if (adminName.length < 2) return "Enter the in-charge full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return "Enter a valid admin email.";
    if (isTeamEmail(adminEmail)) return "This email belongs to the CampusFix team. Use your college email.";
    const dupe = await findMemberByEmail(adminEmail);
    if (dupe) return "This email is already registered in another campus. Use a different email (emails are unique).";
    let camp;
    try {
      camp = await createCampus(campusName, undefined, { name: adminName, email: adminEmail });
    } catch (e: any) {
      return e?.message || "Could not register campus. Try again.";
    }
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
