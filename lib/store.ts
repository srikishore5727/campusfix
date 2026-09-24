import { getSupabaseBrowser } from "./supabaseClient";
import { seedCampuses, seedComplaints } from "./seed";
import type { Campus, Comment, Complaint, Member, Role, Status } from "./types";
import { normalizeEmail, normalizeName } from "./types";

// v2 keys (multi-tenant). Old v1 keys are migrated once.
const CAMPUS_KEY = "campusfix_campuses_v2";
const C_KEY = "campusfix_complaints_v2";
const M_KEY = "campusfix_comments_v2";
const OLD_C_KEY = "campusfix_complaints_v1";
const UPDATE_EVENT = "campusfix:update";

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

export function notifyLocal() {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new Event(UPDATE_EVENT));
    // also bump a timestamp so polling/inactive tabs can detect
    localStorage.setItem("campusfix_last_write", String(Date.now()));
  } catch {}
}

export function ensureSeed() {
  if (typeof window === "undefined") return;
  let campuses = readLocal<Campus[] | null>(CAMPUS_KEY, null);
  if (!campuses) {
    campuses = seedCampuses();
    writeLocal(CAMPUS_KEY, campuses);
  }
  let complaints = readLocal<Complaint[] | null>(C_KEY, null);
  if (!complaints) {
    // migrate old v1 data (single-tenant, no campus_id) into first campus
    const old = readLocal<any[]>(OLD_C_KEY, []);
    if (old.length > 0) {
      complaints = old.map((c) => ({
        ...c,
        campus_id: c.campus_id || campuses![0].id,
        upvoted_by: c.upvoted_by || [],
      }));
    } else {
      complaints = seedComplaints();
    }
    // seed one comment thread on second complaint
    const pick = complaints[1];
    const seedComments: Comment[] = pick
      ? [
          {
            id: uid("m"),
            complaint_id: pick.id,
            user_id: "seed_warden_1",
            user_name: "Campus Warden",
            role: "warden",
            body: "ISP ticket raised. Temporary hotspot enabled in reading hall till fix.",
            created_at: new Date(Date.now() - 60 * 60000).toISOString(),
          },
        ]
      : [];
    writeLocal(C_KEY, complaints);
    const mc = readLocal<Comment[] | null>(M_KEY, null);
    if (!mc) writeLocal(M_KEY, seedComments);
  }
  if (!readLocal<Comment[] | null>(M_KEY, null)) writeLocal(M_KEY, []);
  seedMembersIfEmpty(campuses);
}

function sb() {
  return getSupabaseBrowser();
}

export function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || `campus-${Date.now().toString(36)}`
  );
}

// ---------------- CAMPUSES ----------------

export async function fetchCampuses(): Promise<Campus[]> {
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("campuses")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) return data as Campus[];
    } catch {}
  }
  ensureSeed();
  return readLocal<Campus[]>(CAMPUS_KEY, []);
}

export async function createCampus(
  name: string,
  createdBy?: string
): Promise<Campus> {
  const clean = name.trim();
  if (clean.length < 3) throw new Error("Campus name too short.");
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("campuses")
        .insert({ name: clean, slug: `${slugify(clean)}-${Date.now().toString(36)}`, created_by: createdBy || null })
        .select()
        .single();
      if (!error && data) {
        notifyLocal();
        return data as Campus;
      }
    } catch {}
  }
  const c: Campus = {
    id: uid("campus"),
    name: clean,
    slug: `${slugify(clean)}-${Date.now().toString(36)}`,
    created_at: new Date().toISOString(),
  };
  const all = readLocal<Campus[]>(CAMPUS_KEY, []);
  all.push(c);
  writeLocal(CAMPUS_KEY, all);
  notifyLocal();
  return c;
}

// ---------------- WARDEN INVITES ----------------

export interface WardenInviteRow {
  id: string;
  campus_id: string;
  email: string;
  added_by: string;
  created_at: string;
}

const W_KEY = "campusfix_wardens_v2";

export async function fetchWardenInvites(campusId: string): Promise<WardenInviteRow[]> {
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("warden_invites")
        .select("*")
        .eq("campus_id", campusId)
        .order("created_at", { ascending: false });
      if (!error && data) return data as WardenInviteRow[];
    } catch {}
  }
  return readLocal<WardenInviteRow[]>(W_KEY, []).filter((w) => w.campus_id === campusId);
}

export async function isWardenInvited(campusId: string, email: string): Promise<boolean> {
  const list = await fetchWardenInvites(campusId);
  return list.some((w) => w.email.toLowerCase() === email.toLowerCase());
}

export async function inviteWarden(
  campusId: string,
  email: string,
  addedBy: string
): Promise<WardenInviteRow> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("Invalid email.");
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("warden_invites")
        .insert({ campus_id: campusId, email: clean, added_by: addedBy })
        .select()
        .single();
      if (!error && data) {
        notifyLocal();
        return data as WardenInviteRow;
      }
    } catch {}
  }
  const all = readLocal<WardenInviteRow[]>(W_KEY, []);
  if (all.some((w) => w.campus_id === campusId && w.email === clean))
    throw new Error("This email is already added as warden.");
  const row: WardenInviteRow = {
    id: uid("w"),
    campus_id: campusId,
    email: clean,
    added_by: addedBy,
    created_at: new Date().toISOString(),
  };
  all.push(row);
  writeLocal(W_KEY, all);
  notifyLocal();
  return row;
}

export async function removeWardenInvite(id: string): Promise<void> {
  const client = sb();
  if (client) {
    try {
      await client.from("warden_invites").delete().eq("id", id);
    } catch {}
  }
  const all = readLocal<WardenInviteRow[]>(W_KEY, []);
  writeLocal(
    W_KEY,
    all.filter((w) => w.id !== id)
  );
  notifyLocal();
}

// ---------------- COMPLAINTS (campus-scoped) ----------------

export async function fetchComplaints(campusId: string): Promise<Complaint[]> {
  if (!campusId) return [];
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("complaints")
        .select("*")
        .eq("campus_id", campusId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (!error && data) {
        // merge local upvoted_by? Supabase mode uses upvotes table; keep field for UI compat
        return (data as any[]).map((d) => ({ ...d, upvoted_by: d.upvoted_by || [] })) as Complaint[];
      }
    } catch {}
  }
  ensureSeed();
  const local = readLocal<Complaint[]>(C_KEY, []);
  return local
    .filter((c) => c.campus_id === campusId)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

export async function fetchComplaintById(id: string): Promise<Complaint | null> {
  const client = sb();
  if (client) {
    try {
      const { data } = await client.from("complaints").select("*").eq("id", id).single();
      if (data) return data as Complaint;
    } catch {}
  }
  ensureSeed();
  return readLocal<Complaint[]>(C_KEY, []).find((c) => c.id === id) || null;
}

export async function createComplaint(input: {
  campus_id: string;
  user_id: string;
  user_name: string;
  title: string;
  description: string;
  category: Complaint["category"];
  block: string;
  image_url: string | null;
}): Promise<Complaint> {
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("complaints")
        .insert({ ...input, status: "open" })
        .select()
        .single();
      if (!error && data) {
        notifyLocal();
        return { ...(data as Complaint), upvoted_by: [] };
      }
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
  notifyLocal();
  return c;
}

export async function toggleUpvote(complaint: Complaint, userId: string): Promise<Complaint> {
  const client = sb();
  if (client) {
    try {
      const { data: existing } = await client
        .from("upvotes")
        .select("*")
        .eq("complaint_id", complaint.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        await client.from("upvotes").delete().eq("complaint_id", complaint.id).eq("user_id", userId);
      } else {
        await client.from("upvotes").insert({ complaint_id: complaint.id, user_id: userId });
      }
      const { data } = await client.from("complaints").select("*").eq("id", complaint.id).single();
      if (data) {
        notifyLocal();
        return { ...(data as Complaint), upvoted_by: complaint.upvoted_by };
      }
    } catch {}
  }
  const all = readLocal<Complaint[]>(C_KEY, []);
  const idx = all.findIndex((c) => c.id === complaint.id);
  if (idx === -1) return complaint;
  const cur = all[idx];
  const has = cur.upvoted_by.includes(userId);
  cur.upvoted_by = has ? cur.upvoted_by.filter((x) => x !== userId) : [...cur.upvoted_by, userId];
  cur.upvotes_count = Math.max(0, cur.upvotes_count + (has ? -1 : 1));
  all[idx] = cur;
  writeLocal(C_KEY, all);
  notifyLocal();
  return { ...cur };
}

export async function updateStatus(complaintId: string, status: Status): Promise<void> {
  const client = sb();
  if (client) {
    try {
      await client.from("complaints").update({ status }).eq("id", complaintId);
    } catch {}
  }
  const all = readLocal<Complaint[]>(C_KEY, []);
  const idx = all.findIndex((c) => c.id === complaintId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status };
    writeLocal(C_KEY, all);
  }
  notifyLocal();
}

// ---------------- COMMENTS ----------------

export async function fetchComments(complaintId: string): Promise<Comment[]> {
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("comments")
        .select("*")
        .eq("complaint_id", complaintId)
        .order("created_at", { ascending: true });
      if (!error && data) return data as Comment[];
    } catch {}
  }
  return readLocal<Comment[]>(M_KEY, [])
    .filter((c) => c.complaint_id === complaintId)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
}

export async function addComment(input: {
  complaint_id: string;
  user_id: string;
  user_name: string;
  role: string;
  body: string;
}): Promise<Comment> {
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client.from("comments").insert(input).select().single();
      if (!error && data) {
        notifyLocal();
        return data as Comment;
      }
    } catch {}
  }
  const c: Comment = { id: uid("m"), created_at: new Date().toISOString(), ...input };
  const all = readLocal<Comment[]>(M_KEY, []);
  all.push(c);
  writeLocal(M_KEY, all);
  notifyLocal();
  return c;
}

export async function uploadImage(file: File): Promise<string | null> {
  const client = sb();
  if (!client) {
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
    const { error } = await client.storage.from("complaint-images").upload(path, file, { upsert: false });
    if (error) return null;
    const { data } = client.storage.from("complaint-images").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// ---------------- ROSTER (private access — v3) ----------------
// One row per person. Email UNIQUE GLOBALLY. Login = name+email exact
// (normalized) match. Campus is auto-resolved — never picked by the user.

const MEMBERS_KEY = "campusfix_members_v3";

function seedMembersIfEmpty(campuses: Campus[]) {
  const existing = readLocal<Member[]>(MEMBERS_KEY, []);
  if (existing.length > 0) return existing;
  const a = campuses[0];
  const b = campuses[1] || campuses[0];
  const seeded: Member[] = [
    { id: uid("mbr"), campus_id: a.id, campus_name: a.name, name: "Campus Admin", email: "admin@greenfield.edu", role: "campus_admin", created_at: new Date().toISOString() },
    { id: uid("mbr"), campus_id: a.id, campus_name: a.name, name: "Ravi Warden", email: "warden@greenfield.edu", role: "warden", created_at: new Date().toISOString() },
    { id: uid("mbr"), campus_id: a.id, campus_name: a.name, name: "Aarav Patel", email: "aarav@greenfield.edu", role: "student", created_at: new Date().toISOString() },
    { id: uid("mbr"), campus_id: b.id, campus_name: b.name, name: "Lake Admin", email: "admin@lakeview.edu", role: "campus_admin", created_at: new Date().toISOString() },
  ];
  writeLocal(MEMBERS_KEY, seeded);
  return seeded;
}

export async function findMemberByEmail(email: string): Promise<(Member & { campus_name: string }) | null> {
  const em = normalizeEmail(email);
  const client = sb();
  if (client) {
    try {
      const { data } = await client.from("members").select("*, campuses(name)").eq("email", em).limit(1);
      // NOTE: postgrest lower() index; fallback to ilike if exact misses
      let row: any = (data as any[])?.[0];
      if (!row) {
        const { data: d2 } = await client.from("members").select("*").ilike("email", em).limit(1);
        row = (d2 as any[])?.[0];
      }
      if (row) {
        const campuses = await fetchCampuses().catch(() => [] as Campus[]);
        const camp = campuses.find((c) => c.id === row.campus_id);
        return { ...row, campus_name: camp?.name || row.campus_name || "My Campus" };
      }
    } catch {}
  }
  ensureSeed();
  const campuses = readLocal<Campus[]>(CAMPUS_KEY, []);
  seedMembersIfEmpty(campuses);
  const all = readLocal<Member[]>(MEMBERS_KEY, []);
  const hit = all.find((m) => normalizeEmail(m.email) === em);
  if (!hit) return null;
  const camp = campuses.find((c) => c.id === hit.campus_id);
  return { ...hit, campus_name: camp?.name || hit.campus_name || "My Campus" };
}

export async function fetchMembers(campusId: string): Promise<Member[]> {
  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("members")
        .select("*")
        .eq("campus_id", campusId)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (!error && data) return data as Member[];
    } catch {}
  }
  ensureSeed();
  return readLocal<Member[]>(MEMBERS_KEY, []).filter((m) => m.campus_id === campusId);
}

function assertMemberInput(name: string, email: string) {
  if (name.trim().replace(/\s+/g, " ").length < 2) throw new Error("Enter the full name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("Enter a valid email.");
}

export async function addMember(
  campusId: string,
  name: string,
  email: string,
  role: Role
): Promise<Member> {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const cleanEmail = normalizeEmail(email);
  assertMemberInput(cleanName, cleanEmail);
  if (!["student", "warden", "campus_admin"].includes(role)) throw new Error("Invalid role.");
  // global uniqueness
  const existing = await findMemberByEmail(cleanEmail);
  if (existing) throw new Error("This email is already registered (emails are unique across all campuses).");

  const client = sb();
  if (client) {
    try {
      const { data, error } = await client
        .from("members")
        .insert({ campus_id: campusId, name: cleanName, email: cleanEmail, role })
        .select()
        .single();
      if (!error && data) {
        notifyLocal();
        return data as Member;
      }
    } catch {}
  }
  const campuses = readLocal<Campus[]>(CAMPUS_KEY, []);
  seedMembersIfEmpty(campuses);
  const row: Member = { id: uid("mbr"), campus_id: campusId, name: cleanName, email: cleanEmail, role, created_at: new Date().toISOString() };
  const all = readLocal<Member[]>(MEMBERS_KEY, []);
  all.push(row);
  writeLocal(MEMBERS_KEY, all);
  notifyLocal();
  return row;
}

export interface BulkResult {
  added: number;
  skipped: { line: number; reason: string }[];
}

export function parseRosterCsv(text: string): { name: string; email: string; role: Role }[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  // drop header if present
  const first = lines[0].toLowerCase();
  const hasHeader = first.includes("name") && first.includes("email");
  const body = hasHeader ? lines.slice(1) : lines;
  return body.map((line) => {
    const parts = line.split(/[,;\t]/).map((p) => p.trim()).filter((p) => p.length > 0);
    const [name = "", email = "", roleRaw = "student"] = parts;
    const r = roleRaw.toLowerCase();
    const role: Role = r.startsWith("warden") ? "warden" : r.includes("admin") ? "campus_admin" : "student";
    return { name, email, role };
  });
}

export async function bulkAddMembers(
  campusId: string,
  csvText: string,
  addedBy: string
): Promise<BulkResult> {
  void addedBy;
  const rows = parseRosterCsv(csvText).slice(0, 1000);
  let added = 0;
  const skipped: BulkResult["skipped"] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      await addMember(campusId, r.name, r.email, r.role);
      added += 1;
    } catch (e: any) {
      skipped.push({ line: i + 1, reason: e?.message || "Skipped" });
    }
  }
  return { added, skipped };
}

export async function removeMember(campusId: string, memberId: string): Promise<void> {
  const client = sb();
  if (client) {
    try {
      await client.from("members").delete().eq("id", memberId).eq("campus_id", campusId);
    } catch {}
  }
  const all = readLocal<Member[]>(MEMBERS_KEY, []);
  writeLocal(MEMBERS_KEY, all.filter((m) => !(m.id === memberId && m.campus_id === campusId)));
  notifyLocal();
}

// ---------------- REALTIME ----------------
// Supabase realtime when configured + local event + polling fallback.
// Usage: const unsub = subscribeCampusUpdates(() => reload()); return unsub;

export function subscribeCampusUpdates(onUpdate: () => void): () => void {
  const client = sb();
  let channel: any = null;
  let polling: any = null;
  let lastSeen = Date.now();

  const handler = () => onUpdate();
  if (typeof window !== "undefined") {
    window.addEventListener(UPDATE_EVENT, handler);
    window.addEventListener("storage", handler);
    const onFocus = () => onUpdate();
    window.addEventListener("focus", onFocus);

    // Polling fallback: catches cross-device updates in local mode + missed realtime events.
    // Checks last-write timestamp every 7s; refetches if changed or every 15s regardless.
    let ticks = 0;
    polling = setInterval(() => {
      ticks += 1;
      try {
        const w = Number(localStorage.getItem("campusfix_last_write") || 0);
        if (w > lastSeen || ticks % 2 === 0) {
          lastSeen = Math.max(lastSeen, w);
          onUpdate();
        }
      } catch {
        if (ticks % 2 === 0) onUpdate();
      }
    }, 7000);

    // Realtime via Supabase when available
    try {
      if (client) {
        channel = client
          .channel("campusfix-live")
          .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => onUpdate())
          .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => onUpdate())
          .on("postgres_changes", { event: "*", schema: "public", table: "upvotes" }, () => onUpdate())
          .subscribe();
      }
    } catch {}

    return () => {
      window.removeEventListener(UPDATE_EVENT, handler);
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", onFocus);
      if (polling) clearInterval(polling);
      try {
        if (channel && client) client.removeChannel(channel);
      } catch {}
    };
  }
  return () => {};
}
