import { getSupabaseBrowser } from "./supabaseClient";
import { seedComplaints } from "./seed";
import type { Comment, Complaint, Status } from "./types";

const C_KEY = "campusfix_complaints_v1";
const M_KEY = "campusfix_comments_v1";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function ensureSeed() {
  if (typeof window === "undefined") return;
  const existing = readLocal<Complaint[] | null>(C_KEY, null);
  if (!existing) {
    writeLocal(C_KEY, seedComplaints());
  }
  const mc = readLocal<Comment[] | null>(M_KEY, null);
  if (!mc) writeLocal(M_KEY, seedCommentsDefault());
}

function seedCommentsDefault(): Comment[] {
  const complaints = readLocal<Complaint[]>(C_KEY, []);
  const pick = complaints[1];
  if (!pick)
    return [
      {
        id: uid("m"),
        complaint_id: "seed",
        user_id: "demo_admin_1",
        user_name: "Warden Admin",
        role: "admin",
        body: "Router will be replaced tomorrow morning. Temporary hotspot enabled in reading hall.",
        created_at: new Date().toISOString(),
      },
    ];
  return [
    {
      id: uid("m"),
      complaint_id: pick.id,
      user_id: "demo_admin_1",
      user_name: "Warden Admin",
      role: "admin",
      body: "ISP ticket raised. Temporary hotspot enabled in reading hall till fix.",
      created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    },
    {
      id: uid("m"),
      complaint_id: pick.id,
      user_id: pick.user_id,
      user_name: pick.user_name,
      role: "student",
      body: "Thanks! Exam week so this helps a lot.",
      created_at: new Date(Date.now() - 30 * 60000).toISOString(),
    },
  ];
}

function useSupabase() {
  return getSupabaseBrowser();
}

// ---------- READ ----------

export async function fetchComplaints(): Promise<Complaint[]> {
  const sb = useSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data && data.length > 0) {
        return data as unknown as Complaint[];
      }
      // fall through to local if empty (so demo still looks rich)
    } catch {
      // fall through
    }
  }
  ensureSeed();
  const local = readLocal<Complaint[]>(C_KEY, []);
  return [...local].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function fetchComments(complaintId: string): Promise<Comment[]> {
  const sb = useSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("comments")
        .select("*")
        .eq("complaint_id", complaintId)
        .order("created_at", { ascending: true });
      if (!error && data) return data as unknown as Comment[];
    } catch {}
  }
  const all = readLocal<Comment[]>(M_KEY, []);
  return all
    .filter((c) => c.complaint_id === complaintId)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
}

// ---------- WRITE ----------

export async function createComplaint(input: {
  user_id: string;
  user_name: string;
  title: string;
  description: string;
  category: Complaint["category"];
  block: string;
  image_url: string | null;
}): Promise<Complaint> {
  const sb = useSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("complaints")
        .insert({
          user_id: input.user_id,
          user_name: input.user_name,
          title: input.title,
          description: input.description,
          category: input.category,
          block: input.block,
          status: "open",
          image_url: input.image_url,
        })
        .select()
        .single();
      if (!error && data) return data as unknown as Complaint;
    } catch {}
  }
  const c: Complaint = {
    id: uid("c"),
    status: "open",
    upvotes_count: 0,
    upvoted_by: [],
    created_at: new Date().toISOString(),
    ...input,
  };
  const all = readLocal<Complaint[]>(C_KEY, []);
  all.unshift(c);
  writeLocal(C_KEY, all);
  return c;
}

export async function toggleUpvote(
  complaint: Complaint,
  userId: string
): Promise<Complaint> {
  const sb = useSupabase();
  if (sb) {
    try {
      // check existing upvote row
      const { data: existing } = await sb
        .from("upvotes")
        .select("*")
        .eq("complaint_id", complaint.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        await sb
          .from("upvotes")
          .delete()
          .eq("complaint_id", complaint.id)
          .eq("user_id", userId);
        const { data } = await sb
          .from("complaints")
          .select("*")
          .eq("id", complaint.id)
          .single();
        if (data) return data as unknown as Complaint;
      } else {
        await sb.from("upvotes").insert({ complaint_id: complaint.id, user_id: userId });
        const { data } = await sb
          .from("complaints")
          .select("*")
          .eq("id", complaint.id)
          .single();
        if (data) return data as unknown as Complaint;
      }
    } catch {}
  }
  const all = readLocal<Complaint[]>(C_KEY, []);
  const idx = all.findIndex((c) => c.id === complaint.id);
  if (idx === -1) return complaint;
  const cur = all[idx];
  const has = cur.upvoted_by.includes(userId);
  cur.upvoted_by = has
    ? cur.upvoted_by.filter((x) => x !== userId)
    : [...cur.upvoted_by, userId];
  cur.upvotes_count = Math.max(
    0,
    cur.upvotes_count + (has ? -1 : 1)
  );
  // keep a base count for seeded items + local delta is already in upvotes_count
  all[idx] = cur;
  writeLocal(C_KEY, all);
  return { ...cur };
}

export async function addComment(input: {
  complaint_id: string;
  user_id: string;
  user_name: string;
  role: "student" | "admin";
  body: string;
}): Promise<Comment> {
  const sb = useSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("comments")
        .insert(input)
        .select()
        .single();
      if (!error && data) return data as unknown as Comment;
    } catch {}
  }
  const c: Comment = {
    id: uid("m"),
    created_at: new Date().toISOString(),
    ...input,
  };
  const all = readLocal<Comment[]>(M_KEY, []);
  all.push(c);
  writeLocal(M_KEY, all);
  return c;
}

export async function updateStatus(
  complaintId: string,
  status: Status
): Promise<void> {
  const sb = useSupabase();
  if (sb) {
    try {
      await sb.from("complaints").update({ status }).eq("id", complaintId);
    } catch {}
  }
  const all = readLocal<Complaint[]>(C_KEY, []);
  const idx = all.findIndex((c) => c.id === complaintId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status };
    writeLocal(C_KEY, all);
  }
}

export async function uploadImage(file: File): Promise<string | null> {
  const sb = useSupabase();
  if (!sb) {
    // local mode: convert to data URL so image still shows in demo
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
    });
  }
  try {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage
      .from("complaint-images")
      .upload(path, file, { upsert: false });
    if (error) return null;
    const { data } = sb.storage.from("complaint-images").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}
