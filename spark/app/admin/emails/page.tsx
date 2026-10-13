import Link from "next/link";
import { AdminNav } from "../Nav";
import { Card, Shell } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Emails · Spark admin", robots: { index: false } };

const STATUS: Record<string, string> = {
  sent: "✅ Sent", logged: "📝 Saved only (Resend not set up)", error: "⚠️ Failed", pending: "…",
};

export default async function Emails() {
  await requireAdmin();
  const emails = await q<any>(
    `select id, kind, to_email, subject, status, error, sent_at, clicked_at from emails
     where to_email not like '%@example.com' order by id desc limit 50`);
  return (
    <Shell wide>
      <AdminNav active="/admin/emails" />
      <h1 className="text-2xl font-extrabold">Emails</h1>
      <p className="mt-1 text-stone-600">The last 50 emails the app sent (or would have sent). Click one to see it exactly as it looks.</p>
      <div className="mt-4 space-y-2">
        {emails.map((e) => (
          <Link key={e.id} href={`/admin/emails/${e.id}`} className="block">
            <Card className="py-3 hover:ring-orange-300">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold">{e.subject}</span>
                <span className="text-stone-500">{new Date(e.sent_at).toLocaleString()}</span>
              </div>
              <div className="mt-0.5 text-xs text-stone-500">
                {e.kind} · to {e.to_email} · {STATUS[e.status] ?? e.status}{e.clicked_at ? " · clicked" : ""}
                {e.error && <span className="text-red-600"> · {e.error}</span>}
              </div>
            </Card>
          </Link>
        ))}
        {!emails.length && <p className="text-stone-400">No emails yet.</p>}
      </div>
    </Shell>
  );
}
