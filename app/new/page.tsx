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

  if (typeof window !== "undefined" && !user) {
    // soft guard (layout still renders); redirect on submit too
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
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
      setErr("Description must be at least 15 characters — explain where + since when.");
      return;
    }
    setBusy(true);
    try {
      const image_url = file ? await uploadImage(file) : null;
      const c = await createComplaint({
        user_id: user.id,
        user_name: user.name,
        title: title.trim(),
        description: description.trim(),
        category,
        block: block.trim() || "General",
        image_url,
      });
      router.push(`/issue/${c.id}`);
    } catch (e) {
      setErr("Failed to create. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Report an issue</h1>
        <p className="text-sm text-zinc-500">
          Good reports get fixed faster: exact location + photo + since when.
        </p>
      </div>

      {!user && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          You are not logged in. <a href="/login" className="font-bold underline">Login first</a> — it takes 5 seconds with demo login.
        </p>
      )}

      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-semibold">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. No water on 3rd floor, Block B since morning"
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-normal outline-none focus:border-zinc-900"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-normal"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Block / Location
            <input
              value={block}
              onChange={(e) => setBlock(e.target.value)}
              placeholder="Block A / Mess / Library…"
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-normal outline-none focus:border-zinc-900"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold">
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Where exactly? Since when? How many rooms affected? Any prior complaint?"
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-normal outline-none focus:border-zinc-900"
          />
        </label>

        <div>
          <p className="text-sm font-semibold">Photo proof (optional)</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="mt-1 w-full text-sm"
          />
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="preview" className="mt-2 max-h-56 rounded-xl border" />
          )}
          <p className="mt-1 text-xs text-zinc-500">
            Stored in Supabase Storage bucket <code>complaint-images</code> when configured; otherwise preview-only demo.
          </p>
        </div>

        {err && <p className="text-sm font-medium text-red-600">{err}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-zinc-700"
        >
          {busy ? "Submitting…" : "Submit complaint"}
        </button>
      </div>
    </div>
  );
}
