"use client";
import { useActionState, useState } from "react";
import { saveSpark } from "../../actions";
import { SparkCard } from "@/components/SparkCard";
import { Button, Card, ErrorText, inputClass } from "@/components/ui";

type S = { id: string; title: string; slug: string; type: string; content: string; theme: string; active: boolean };

export function SparkForm({ spark }: { spark: S }) {
  const [state, action, pending] = useActionState(saveSpark, null);
  const [s, setS] = useState(spark);
  const set = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setS({ ...s, [k]: k === "active" ? (e.target as HTMLInputElement).checked : e.target.value });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <form action={action} className="space-y-4">
          <input type="hidden" name="id" value={s.id} />
          <label className="block">
            <span className="text-sm font-semibold">Title</span>
            <input name="title" className={`${inputClass} mt-1`} value={s.title} onChange={set("title")} required />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Link name</span>
            <span className="ml-2 text-xs text-stone-500">the part after /s/ (leave blank to make one from the title)</span>
            <input name="slug" className={`${inputClass} mt-1 font-mono`} value={s.slug} onChange={set("slug")} placeholder="just-open-it" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Type</span>
            <select name="type" className={`${inputClass} mt-1`} value={s.type} onChange={set("type")}>
              <option value="text">Text (a short story or prompt)</option>
              <option value="video">Video (YouTube, Vimeo or TikTok link)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">{s.type === "video" ? "Video link" : "Text"}</span>
            {s.type === "text" && <span className="ml-2 text-xs text-stone-500">leave an empty line between paragraphs</span>}
            {s.type === "video" ? (
              <input name="content" className={`${inputClass} mt-1`} value={s.content} onChange={set("content")} placeholder="https://www.youtube.com/shorts/..." />
            ) : (
              <textarea name="content" className={`${inputClass} mt-1 min-h-56`} value={s.content} onChange={set("content")} />
            )}
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Theme</span>
            <input name="theme" className={`${inputClass} mt-1`} value={s.theme} onChange={set("theme")} />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="active" checked={s.active} onChange={set("active")} className="h-5 w-5 accent-orange-600" />
            <span className="text-sm font-semibold">Active</span>
            <span className="text-xs text-stone-500">(included in &ldquo;Give me a spark&rdquo;)</span>
          </label>
          <ErrorText>{state?.error}</ErrorText>
          <Button disabled={pending}>{pending ? "Saving…" : "Save spark"}</Button>
        </form>
      </Card>
      <div>
        <p className="mb-2 text-sm font-semibold text-stone-500">Preview</p>
        {s.content ? <SparkCard spark={{ id: 0, slug: s.slug, title: s.title || "Your title", type: s.type, content: s.content }} /> : <p className="text-stone-400">Fill in the form to see a preview.</p>}
      </div>
    </div>
  );
}
