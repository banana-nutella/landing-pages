import { notFound } from "next/navigation";
import { AdminNav } from "../../Nav";
import { Shell } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email · Spark admin", robots: { index: false } };

export default async function EmailView({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const e = await q1<any>(`select * from emails where id=$1`, [Number((await params).id) || 0]);
  if (!e) notFound();
  return (
    <Shell wide>
      <AdminNav active="/admin/emails" />
      <p className="text-sm text-stone-500">To: {e.to_email} · {e.kind} · {new Date(e.sent_at).toLocaleString()}</p>
      <h1 className="mt-1 text-xl font-extrabold">{e.subject}</h1>
      <p className="mt-1 text-sm text-stone-500">The buttons below are real: clicking them does the action for that test plan.</p>
      <iframe srcDoc={e.html.replace("<head>", "<head><base target=\"_blank\">").replace("<html>", "<html><head><base target=\"_blank\"></head>")} className="mt-4 h-[640px] w-full rounded-2xl bg-white ring-1 ring-stone-200" />
    </Shell>
  );
}
