export type Role = "student" | "admin";
export type Status = "open" | "in_progress" | "resolved";
export type Category =
  | "Water"
  | "Electricity"
  | "Wifi"
  | "Cleaning"
  | "Mess"
  | "Other";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Complaint {
  id: string;
  user_id: string;
  user_name: string;
  title: string;
  description: string;
  category: Category;
  block: string;
  status: Status;
  upvotes_count: number;
  upvoted_by: string[]; // user ids (local mode) — in Supabase mode derived from upvotes table
  image_url: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  complaint_id: string;
  user_id: string;
  user_name: string;
  role: Role;
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

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
