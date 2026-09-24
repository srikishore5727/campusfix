export type Role = "student" | "warden" | "campus_admin";
// Back-compat: old "admin" maps to "warden"
export type LegacyRole = Role | "admin";

export type Status = "open" | "in_progress" | "resolved";
export type Category =
  | "Water"
  | "Electricity"
  | "Wifi"
  | "Cleaning"
  | "Mess"
  | "Other";

export interface Campus {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  campus_id: string;
  campus_name: string;
}

export interface WardenInvite {
  id: string;
  campus_id: string;
  email: string;
  added_by: string;
  created_at: string;
}

export interface Member {
  id: string;
  campus_id: string;
  campus_name?: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

export function normalizeName(n: string) {
  return n.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

export interface Complaint {
  id: string;
  campus_id: string;
  user_id: string;
  user_name: string;
  title: string;
  description: string;
  category: Category;
  block: string;
  status: Status;
  upvotes_count: number;
  upvoted_by: string[];
  image_url: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  complaint_id: string;
  user_id: string;
  user_name: string;
  role: string;
  body: string;
  created_at: string;
}

export const CATEGORIES: Category[] = [
  "Water",
  "Electricity",
  "Wifi",
  "Cleaning",
  "Mess",
  "Other",
];

export const STATUSES: Status[] = ["open", "in_progress", "resolved"];

export const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export function normalizeRole(r: string): Role {
  if (r === "admin" || r === "warden") return "warden";
  if (r === "campus_admin") return "campus_admin";
  return "student";
}

export function canManageComplaints(role: Role) {
  return role === "warden" || role === "campus_admin";
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
