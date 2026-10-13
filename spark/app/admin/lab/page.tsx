import Link from "next/link";
import { AdminNav } from "../Nav";
import { sendNextNow } from "../actions";
import { AutoTick } from "./AutoTick";
import { TestPlanForm } from "./TestPlanForm";
import { Card, Shell } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Test lab · Spark admin", robots: { index: false } };

const STAGE: Record<string, string> = {
  reminder: "Reminder", restart: "Day 2: gentle restart", freshstart: "Day 5: fresh start", final: "Final: pause or keep going?",
};

function rel(d: Date | null) {
  if (!d) return "–";
  const s = Math.round((new Date(d).getTime() - Date.now()) / 1000);
  if (Math.abs(s) < 60) return s >= 0 ? `in ${s}s` : "due now";
  const m = Math.round(s / 60);
  return m >= 0 ? `in ${m} min` : `${-m} min overdue`;
}

export default async function Lab() {
  await requireAdmin();
  const plans = await q<any>(
    `select p.*, u.email, (select count(*)::int from emails e where e.plan_id=p.id) as sent
     from plans p join users u on u.id=p.user_id
     where p.is_test and u.email not like '%@example.com' order by p.id desc limit 15`);
  return (
    <Shell wide>
      <AdminNav active="/admin/lab" />
      <h1 className="text-2xl font-extrabold">Test lab</h1>
      <p className="mt-1 max-w-2xl text-stone-600">
        Try the whole nag ladder in about 20 minutes. Test plans use a short &ldquo;day&rdquo; (2 minutes by default), so the
        day-2 and day-5 emails arrive within minutes. Test plans are kept out of your real stats.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-extrabold">1. Create a test plan</h2>
          <TestPlanForm />
          <p className="mt-4 text-sm text-stone-500">
            Or walk through the real app in test mode: open <a className="underline" href="/?fast=1" target="_blank">/?fast=1</a>{" "}
            (the timer becomes 10 seconds and a day becomes 2 minutes). <a className="underline" href="/?fast=0" target="_blank">/?fast=0</a> turns it off.
          </p>
        </Card>
        <Card>
          <h2 className="text-lg font-extrabold">2. Keep the email checker running</h2>
          <p className="mt-1 text-sm text-stone-600">
            On the free Vercel plan the real checker runs once an hour. While this page is open, it runs every 20 seconds for test plans.
          </p>
          <AutoTick />
        </Card>
      </div>

      <Card className="mt-5 overflow-x-auto p-0">
        <div className="px-4 pt-4">
          <h2 className="text-lg font-extrabold">3. Watch it go</h2>
          <p className="text-sm text-stone-500">
            Refresh to update. Each email also shows up in <Link className="underline" href="/admin/emails">Emails</Link>, even without Resend set up.
            Click the buttons inside the emails to try &ldquo;I did it&rdquo;, &ldquo;Make it smaller&rdquo;, &ldquo;Pause&rdquo; and unsubscribe.
          </p>
        </div>
        <table className="mt-3 w-full min-w-[720px] text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2">Plan</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Next email</th>
              <th className="px-3 py-2">When</th><th className="px-3 py-2 text-right">Sent</th><th className="px-3 py-2 text-right">Done</th><th />
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="px-3 py-2">
                  <a className="font-medium underline" href={`/p/${p.token}`} target="_blank">{p.action}</a>
                  <div className="text-xs text-stone-500">{p.email} · day = {p.day_minutes} min</div>
                </td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">{p.status === "active" ? STAGE[p.stage] ?? p.stage : "–"}</td>
                <td className="px-3 py-2">{p.status === "active" ? rel(p.next_send_at) : "–"}</td>
                <td className="px-3 py-2 text-right">{p.sent}</td>
                <td className="px-3 py-2 text-right">{p.completions}</td>
                <td className="px-3 py-2 text-right">
                  {p.status === "active" && (
                    <form action={sendNextNow}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="rounded-lg px-2 py-1 text-xs ring-1 ring-stone-300">Send next now</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!plans.length && <tr><td colSpan={7} className="px-3 py-4 text-center text-stone-400">No test plans yet</td></tr>}
          </tbody>
        </table>
      </Card>
    </Shell>
  );
}
