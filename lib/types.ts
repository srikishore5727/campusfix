export type Role = "student" | "warden" | "campus_admin" | "super_admin";
// Back-compat: old "admin" maps to "warden"
export type LegacyRole = Role | "admin";

export type CampusStatus = "pending" | "approved" | "rejected";

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
  status: CampusStatus;
  contact_name: string;
  contact_email: string;
  reject_reason?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
}

export interface CampusNotification {
  id: string;
  campus_id: string;
  campus_name: string;
  to_email: string;
  to_name: string;
  kind: "approved" | "rejected";
  subject: string;
  body: string;
  reason?: string | null;
  created_at: string;
  sent: boolean;
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

export function normalizeCampus(n: string) {
  return n.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

// CampusFix team roster — fixed. Same strict Name+Email check as students:
// a team email alone is NOT enough, the name must match exactly (normalized).
export const TEAM_ROSTER: { name: string; email: string }[] = [
  { name: "Sri Kishore S", email: "srikishore9080676683@gmail.com" },
  { name: "Manikandan", email: "manikandan863716@gmail.com" },
];

export function getTeamEmails(): string[] {
  return TEAM_ROSTER.map((t) => t.email);
}

export function isTeamEmail(email: string) {
  return TEAM_ROSTER.some((t) => t.email === email.trim().toLowerCase());
}

export function getTeamMemberName(email: string): string | null {
  const hit = TEAM_ROSTER.find((t) => t.email === email.trim().toLowerCase());
  return hit ? hit.name : null;
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
  if (r === "super_admin") return "super_admin";
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
