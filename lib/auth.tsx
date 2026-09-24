"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AppUser, Role } from "./types";
import { getSupabaseBrowser } from "./supabaseClient";

const KEY = "campusfix_user_v1";

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  loginDemo: (role: Role, name: string, email: string) => void;
  loginSupabase: (email: string, password: string) => Promise<string | null>;
  signupSupabase: (name: string, email: string, password: string) => Promise<string | null>;
  logout: () => void;
  supabaseMode: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

function makeId(role: Role) {
  return `demo_${role}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowser();
  const supabaseMode = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  function persist(u: AppUser | null) {
    setUser(u);
    try {
      if (u) localStorage.setItem(KEY, JSON.stringify(u));
      else localStorage.removeItem(KEY);
    } catch {}
  }

  function loginDemo(role: Role, name: string, email: string) {
    const cleanName = name.trim() || (role === "admin" ? "Warden Admin" : "Demo Student");
    const cleanEmail =
      email.trim() ||
      (role === "admin" ? "admin@campusfix.demo" : "student@campusfix.demo");
    persist({ id: makeId(role), name: cleanName, email: cleanEmail, role });
  }

  async function loginSupabase(email: string, password: string) {
    if (!supabase) return "Supabase is not configured. Use Demo login below.";
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return error.message;
    const sbUser = data.user;
    // Role: treat ADMIN_EMAILS as admin, else student
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "admin@campusfix.demo")
      .split(",")
      .map((s) => s.trim().toLowerCase());
    const role: Role = adminEmails.includes((sbUser.email || "").toLowerCase())
      ? "admin"
      : "student";
    persist({
      id: sbUser.id,
      name: sbUser.user_metadata?.name || sbUser.email?.split("@")[0] || "Student",
      email: sbUser.email || email,
      role,
    });
    return null;
  }

  async function signupSupabase(name: string, email: string, password: string) {
    if (!supabase) return "Supabase is not configured. Use Demo login below.";
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return error.message;
    if (data.user) {
      persist({
        id: data.user.id,
        name,
        email,
        role: "student",
      });
    }
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
      value={{
        user,
        loading,
        loginDemo,
        loginSupabase,
        signupSupabase,
        logout,
        supabaseMode,
      }}
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
