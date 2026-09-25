"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { createComplaint, uploadImage } from "@/lib/store";
import { CATEGORIES, type Category } from "@/lib/types";

export default function NewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("Water");
  const [block, setBlock] = useState("Block A");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) {
      setErr("Image must be under 4MB.");
      return;
    }
    setFile(f);
    const r = new FileReader();
    r.onload = () => setPreview(r.result as string);
    r.readAsDataURL(f);
  }

  async function submit() {
    setErr("");
    if (!user) {
      router.push("/login");
      return;
    }
    if (title.trim().length < 8) {
      setErr("Title must be at least 8 characters.");
      return;
    }
    if (description.trim().length < 15) {
      setErr("Describe where + since when (min 15 characters).");
      return;
    }
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file) {
        try {
          image_url = await uploadImage(file);
        } catch (e: any) {
          setErr(e?.message || "Image upload failed — submitting without photo.");
        }
      }
      const c = await createComplaint({
        campus_id: user.campus_id,
        user_id: user.id,
        user_name: user.name,
        title: title.trim(),
        description: description.trim(),
        category,
        block: block.trim() || "General",
        image_url,
      });
      router.push(`/issue/${c.id}`);
    } catch {
      setErr("Failed to create. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "mt-1 min-h-[44px] w-full rounded-xl border border-zinc-300 px-3.5 py-2.5 text-sm font-normal outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Report an issue</h1>
        <p className="text-sm text-zinc-500">
          Posting to <b>{user?.campus_name || "your campus"}</b> — only your campus will see this.
        </p>
      </div>

      {!user && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Please <a href="/login" className="font-bold underline">login</a> with your campus account first.
        </p>
      )}

      <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6">
        <label className="block text-sm font-bold">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. No water on 3rd floor, Block B since morning" className={inputCls} maxLength={120} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={inputCls}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold">
            Block / Location
            <input value={block} onChange={(e) => setBlock(e.target.value)} placeholder="Block A / Mess / Library…" className={inputCls} />
          </label>
        </div>

        <label className="block text-sm font-bold">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Where exactly? Since when? How many rooms affected?" className={`${inputCls} min-h-[110px]`} />
        </label>

        <div>
          <p className="text-sm font-bold">Photo proof <span className="font-normal text-zinc-500">(optional)</span></p>
          <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-3 sm:flex-row sm:items-center">
            <label
              htmlFor="cf-photo"
              className="inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-700 active:scale-[0.99]"
            >
              Choose photo
            </label>
            <span className="truncate text-xs text-zinc-500">
              {file ? file.name : "No photo selected — JPG/PNG under 4MB"}
            </span>
            <input
              id="cf-photo"
              type="file"
              accept="image/*"
              onChange={(e) => onFile(e.target.files?.[0])}
              className="sr-only"
            />
          </div>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" decoding="async" className="mt-2 max-h-56 w-full rounded-2xl border border-zinc-200 bg-zinc-100 object-cover" />
          )}
        </div>

        {err && <p className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm font-medium text-red-700">{err}</p>}

        <button onClick={submit} disabled={busy || !user} className="min-h-[50px] w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-zinc-700 active:scale-[0.99] disabled:opacity-50">
          {busy ? "Submitting…" : "Submit to my campus"}
        </button>
      </div>
    </div>
  );
}
