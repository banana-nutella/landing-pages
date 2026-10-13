import Link from "next/link";
import { AdminNav } from "../Nav";
import { Card, Shell } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { q } from "@/lib/db";
import { baseUrl } from "@/lib/util";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sparks · Spark admin", robots: { index: false } };

export default async function Sparks({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const saved = (await searchParams).saved;
  const h = await headers();
  const host = h.get("host") ? `${h.get("x-forwarded-proto") || "https"}://${h.get("host")}` : baseUrl();
  const sparks = await q<any>(`select * from sparks order by active desc, id`);
  return (
    <Shell wide>
      <AdminNav active="/admin/sparks" />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Sparks</h1>
        <Link href="/admin/sparks/new" className="rounded-xl bg-orange-600 px-4 py-2 font-semibold text-white">+ New spark</Link>
      </div>
      {saved && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Saved. It&apos;s live now.</p>}
      <p className="mb-4 text-sm text-stone-600">
        Link ads and videos straight to a spark, and add <code>?src=</code> so you can tell sources apart:
        <code className="ml-1 rounded bg-white px-1.5 py-0.5">{host}/s/[link]?src=tiktok-ad1</code>.
        &ldquo;Give me a spark&rdquo; on the home page picks a random <em>active</em> spark.
      </p>
      <div className="space-y-3">
        {sparks.map((s) => (
          <Card key={s.id} className={s.active ? "" : "opacity-60"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">{s.title}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {s.type === "video" ? "🎬 Video" : "📝 Text"} · {s.theme || "no theme"} · {s.active ? "Active" : "Hidden"}
                </p>
                <p className="mt-1 break-all font-mono text-xs text-stone-600">{host}/s/{s.slug}?src=YOUR-SOURCE</p>
              </div>
              <div className="flex gap-2 text-sm">
                <a href={`/s/${s.slug}?src=admin-preview`} target="_blank" className="rounded-lg px-3 py-1.5 ring-1 ring-stone-300">View</a>
                <Link href={`/admin/sparks/${s.id}`} className="rounded-lg bg-stone-900 px-3 py-1.5 text-white">Edit</Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
