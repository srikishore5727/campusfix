"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { AppUser, Role } from "./types";
import { normalizeRole } from "./types";
import { getSupabaseBrowser } from "./supabaseClient";
import { fetchCampuses, fetchWardenInvites } from "./store";

const USERS_KEY = "campusfix_users_v2";
const SESSION_KEY = "campusfix_session_v2";
const OLD_SESSION = "campusfix_user_v1";

interface StoredUser extends AppUser {
  password: string;
}

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  supabaseMode: boolean;
  signupStudent: (a: { name: string; email: string; password: string; campus_id: string }) => Promise<string | null>;
  signupWarden: (a: { name: string; email: string; password: string; campus_id: string }) => Promise<string | null>;
  signupCampusAdmin: (a: { name: string; email: string; password: string; campus_name: string }) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeUsers(u: StoredUser[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(u));
  } catch {}
}
function validEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowser();
  const supabaseMode = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    (async () => {
      try {
        // Drop legacy demo sessions (no campus) — force clean re-login
        const old = localStorage.getItem(OLD_SESSION);
        if (old) localStorage.removeItem(OLD_SESSION);
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) {
          const u = JSON.parse(raw) as AppUser;
          if (u && u.campus_id && u.email && u.role) setUser(u);
          else localStorage.removeItem(SESSION_KEY);
        } else if (supabase) {
          // restore Supabase session -> profile
          const { data } = await supabase.auth.getSession();
          const sbUser = data.session?.user;
          if (sbUser) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", sbUser.id)
              .single();
            if (prof) {
              setUser({
                id: sbUser.id,
                name: prof.name || sbUser.email?.split("@")[0] || "User",
                email: sbUser.email || prof.email,
                role: normalizeRole(prof.role),
                campus_id: prof.campus_id,
                campus_name: prof.campus_name || "My Campus",
              });
            }
          }
        }
      } catch {}
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(u: AppUser | null) {
    setUser(u);
    try {
      if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  }

  function toPublic(s: StoredUser): AppUser {
    const { password: _p, ...rest } = s;
    return rest;
  }

  async function signupStudent(a: { name: string; email: string; password: string; campus_id: string }) {
    const name = a.name.trim();
    const email = a.email.trim().toLowerCase();
    if (name.length < 2) return "Enter your full name.";
    if (!validEmail(email)) return "Enter a valid email.";
    if (a.password.length < 6) return "Password must be at least 6 characters.";
    if (!a.campus_id) return "Select your campus.";

    if (supabase) {
      const campuses = await fetchCampuses();
      const camp = campuses.find((c) => c.id === a.campus_id);
      if (!camp) return "Selected campus not found.";
      const { data, error } = await supabase.auth.signUp({
        email,
        password: a.password,
        options: { data: { name } },
      });
      if (error) return error.message;
      const sbUser = data.user;
      if (!sbUser) return "Signup created. Please login.";
      const { error: pErr } = await supabase.from("profiles").insert({
        id: sbUser.id,
        email,
        name,
        role: "student",
        campus_id: camp.id,
        campus_name: camp.name,
      });
      if (pErr) return pErr.message;
      persist({ id: sbUser.id, name, email, role: "student", campus_id: camp.id, campus_name: camp.name });
      return null;
    }

    const users = readUsers();
    if (users.some((u) => u.email === email)) return "Account already exists. Please login.";
    const campuses = await fetchCampuses();
    const camp = campuses.find((c) => c.id === a.campus_id);
    if (!camp) return "Selected campus not found.";
    const nu: StoredUser = {
      id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      password: a.password,
      role: "student",
      campus_id: camp.id,
      campus_name: camp.name,
    };
    users.push(nu);
    writeUsers(users);
    persist(toPublic(nu));
    return null;
  }

  async function signupWarden(a: { name: string; email: string; password: string; campus_id: string }) {
    const name = a.name.trim();
    const email = a.email.trim().toLowerCase();
    if (name.length < 2) return "Enter your full name.";
    if (!validEmail(email)) return "Enter a valid email.";
    if (a.password.length < 6) return "Password must be at least 6 characters.";
    if (!a.campus_id) return "Select your campus.";
    const invited = await fetchWardenInvites(a.campus_id);
    if (!invited.some((w) => w.email.toLowerCase() === email))
      return "This email is not added as warden for that campus. Ask your campus in-charge to add you first.";

    if (supabase) {
      const campuses = await fetchCampuses();
      const camp = campuses.find((c) => c.id === a.campus_id);
      if (!camp) return "Campus not found.";
      const { data, error } = await supabase.auth.signUp({
        email,
        password: a.password,
        options: { data: { name } },
      });
      if (error) return error.message;
      const sbUser = data.user;
      if (!sbUser) return "Signup created. Please login.";
      const { error: pErr } = await supabase.from("profiles").insert({
        id: sbUser.id,
        email,
        name,
        role: "warden",
        campus_id: camp.id,
        campus_name: camp.name,
      });
      if (pErr) return pErr.message;
      persist({ id: sbUser.id, name, email, role: "warden", campus_id: camp.id, campus_name: camp.name });
      return null;
    }

    const users = readUsers();
    if (users.some((u) => u.email === email)) return "Account already exists. Please login.";
    const campuses = await fetchCampuses();
    const camp = campuses.find((c) => c.id === a.campus_id);
    if (!camp) return "Campus not found.";
    const nu: StoredUser = {
      id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      password: a.password,
      role: "warden",
      campus_id: camp.id,
      campus_name: camp.name,
    };
    users.push(nu);
    writeUsers(users);
    persist(toPublic(nu));
    return null;
  }

  async function signupCampusAdmin(a: { name: string; email: string; password: string; campus_name: string }) {
    const name = a.name.trim();
    const email = a.email.trim().toLowerCase();
    const campusName = a.campus_name.trim();
    if (name.length < 2) return "Enter your full name.";
    if (!validEmail(email)) return "Enter a valid email.";
    if (a.password.length < 6) return "Password must be at least 6 characters.";
    if (campusName.length < 3) return "Enter your college/campus name.";

    if (supabase) {
      // create campus first
      const { data: camp, error: cErr } = await supabase
        .from("campuses")
        .insert({ name: campusName, slug: `${campusName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}-${Date.now().toString(36)}` })
        .select()
        .single();
      if (cErr || !camp) return cErr?.message || "Could not create campus.";
      const { data, error } = await supabase.auth.signUp({
        email,
        password: a.password,
        options: { data: { name } },
      });
      if (error) return error.message;
      const sbUser = data.user;
      if (!sbUser) return "Campus created. Please login.";
      await supabase.from("profiles").insert({
        id: sbUser.id,
        email,
        name,
        role: "campus_admin",
        campus_id: camp.id,
        campus_name: camp.name,
      });
      persist({ id: sbUser.id, name, email, role: "campus_admin", campus_id: camp.id, campus_name: camp.name });
      return null;
    }

    const users = readUsers();
    if (users.some((u) => u.email === email)) return "Account already exists. Please login.";
    // local: create campus + admin
    const { createCampus } = await import("./store");
    const camp = await createCampus(campusName);
    const nu: StoredUser = {
      id: `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      password: a.password,
      role: "campus_admin",
      campus_id: camp.id,
      campus_name: camp.name,
    };
    users.push(nu);
    writeUsers(users);
    persist(toPublic(nu));
    return null;
  }

  async function login(email: string, password: string) {
    const em = email.trim().toLowerCase();
    if (!validEmail(em)) return "Enter a valid email.";
    if (!password) return "Enter your password.";

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: em, password });
      if (error) return error.message;
      const sbUser = data.user;
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sbUser.id)
        .single();
      if (pErr || !prof) return "Profile not found. Please sign up with your campus first.";
      if (!prof.campus_id) return "Your account has no campus. Please sign up again with campus.";
      persist({
        id: sbUser.id,
        name: prof.name || em.split("@")[0],
        email: em,
        role: normalizeRole(prof.role),
        campus_id: prof.campus_id,
        campus_name: prof.campus_name || "My Campus",
      });
      return null;
    }

    const users = readUsers();
    const found = users.find((u) => u.email === em && u.password === password);
    if (!found) return "No account found with this email/password. Please sign up first.";
    persist(toPublic(found));
    return null;
  }

  async function logout() {
    try {
      await supabase?.auth.signOut();
    } catch {}
    persist(null);
  }

  return (
    <Ctx.Provider
      value={{ user, loading, supabaseMode, signupStudent, signupWarden, signupCampusAdmin, login, logout }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

export type { Role };
