import Link from "next/link";
import { AdminNav } from "./Nav";
import { clearTestData, seedDemo } from "./actions";
import { Card, Shell } from "@/components/ui";
import { requireAdmin } from "@/lib/admin";
import { usingDemoDb } from "@/lib/db";
import { getStats, type FunnelRow } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · Spark admin", robots: { index: false } };

const TARGET = 0.3;

function pct(n: number, d: number) {
  if (!d) return "–";
  return `${Math.round((n / d) * 100)}%`;
}

function Cell({ n, d, target }: { n: number; d: number; target?: number }) {
  const ratio = d ? n / d : null;
  const color = target == null || ratio == null ? "" : ratio >= target ? "text-green-700" : "text-red-600";
  return (
    <td className="px-3 py-2 text-right tabular-nums">
      <span className={`font-semibold ${color}`}>{pct(n, d)}</span>
      <span className="ml-1 text-xs text-stone-400">{n}</span>
    </td>
  );
}

function FunnelTable({ title, rows, hint }: { title: string; rows: FunnelRow[]; hint?: string }) {
  return (
    <Card className="overflow-x-auto p-0">
      <div className="px-4 pt-4">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {hint && <p className="text-sm text-stone-500">{hint}</p>}
      </div>
      <table className="mt-3 w-full min-w-[560px] text-sm">
        <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
          <tr>
            <th className="px-3 py-2"> </th>
            <th className="px-3 py-2 text-right">Saw a spark</th>
            <th className="px-3 py-2 text-right">Set a plan</th>
            <th className="px-3 py-2 text-right">Did 1st action</th>
            <th className="px-3 py-2 text-right">Did 2nd after nag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-stone-100">
              <td className="px-3 py-2 font-medium">{r.label}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.viewers}</td>
              <Cell n={r.planned} d={r.viewers} />
              <Cell n={r.first} d={r.planned} />
              <Cell n={r.second} d={r.first} target={TARGET} />
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={5} className="px-3 py-4 text-center text-stone-400">No data yet</td></tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  await requireAdmin();
  const test = (await searchParams).data === "test";
  const s = await getStats(test);
  const o = s.overall;
  const big = [
    { label: "Set a plan", sub: "of people who saw a spark", n: o.planned, d: o.viewers },
    { label: "Did the first action", sub: "of people who set a plan", n: o.first, d: o.planned },
    { label: "Did a 2nd action after a nag", sub: "of people who did the first · target 30%+", n: o.second, d: o.first, target: TARGET },
  ];

  return (
    <Shell wide>
      <AdminNav active="/admin" />
      {usingDemoDb() && (
        <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <strong>Demo database.</strong> No DATABASE_URL is set, so data lives in memory and resets often. Connect Neon to keep it (see the checklist).
        </p>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-semibold">Showing:</span>
        <Link href="/admin" className={`rounded-full px-3 py-1 ${!test ? "bg-orange-600 text-white" : "bg-white ring-1 ring-stone-300"}`}>Real data</Link>
        <Link href="/admin?data=test" className={`rounded-full px-3 py-1 ${test ? "bg-violet-600 text-white" : "bg-white ring-1 ring-stone-300"}`}>Test &amp; demo data</Link>
        {test && (
          <span className="flex gap-2">
            <form action={seedDemo}><button className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-300">+ Add demo data</button></form>
            <form action={clearTestData}><button className="rounded-full bg-white px-3 py-1 text-red-600 ring-1 ring-stone-300">Delete all test data</button></form>
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {big.map((b) => {
          const ratio = b.d ? b.n / b.d : null;
          const color = b.target == null || ratio == null ? "text-stone-900" : ratio >= b.target ? "text-green-700" : "text-red-600";
          return (
            <Card key={b.label}>
              <p className="text-sm font-semibold text-stone-500">{b.label}</p>
              <p className={`mt-1 text-4xl font-extrabold ${color}`}>{pct(b.n, b.d)}</p>
              <p className="mt-1 text-xs text-stone-500">{b.n} of {b.d} · {b.sub}</p>
            </Card>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {s.landingViews} landing page views · {o.viewers} people saw a spark. Recent sign-ups haven&apos;t had time for a second action yet, so give the last column a few days.
      </p>

      <div className="mt-6 space-y-5">
        <FunnelTable title="By entry path" rows={s.byPath} hint="A = they brought their own spark. B = we gave them one." />
        <FunnelTable
          title="By spark"
          rows={s.bySpark}
          hint="A low “Set a plan” rate points at the spark. A low last column with a decent middle points at the nagging."
        />
        <FunnelTable title="By traffic source" rows={s.bySrc} hint="From ?src=… on your links (e.g. /s/just-open-it?src=tiktok-ad1)." />

        <Card className="overflow-x-auto p-0">
          <div className="px-4 pt-4">
            <h2 className="text-lg font-extrabold">Nag emails</h2>
            <p className="text-sm text-stone-500">How each step of the ladder performs. “Clicked” = opened any link in it.</p>
          </div>
          <table className="mt-3 w-full min-w-[560px] text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2 text-right">Sent</th>
                <th className="px-3 py-2 text-right">Clicked</th>
                <th className="px-3 py-2 text-right">“I did it”</th>
                <th className="px-3 py-2 text-right">Smaller</th>
                <th className="px-3 py-2 text-right">Pause</th>
                <th className="px-3 py-2 text-right">Unsub</th>
              </tr>
            </thead>
            <tbody>
              {s.nags.map((n) => (
                <tr key={n.kind} className="border-t border-stone-100">
                  <td className="px-3 py-2 font-medium">
                    {{ reminder: "Reminder (their time)", restart: "Day 2: gentle restart", freshstart: "Day 5: fresh start", final: "Final: pause or keep going?" }[n.kind]}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{n.sent}</td>
                  <Cell n={n.clicked} d={n.sent} />
                  <Cell n={n.did} d={n.sent} />
                  <td className="px-3 py-2 text-right tabular-nums">{n.smaller}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{n.pause}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{n.unsub}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 className="text-lg font-extrabold">Raw event counts</h2>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            {s.events.map((e) => (
              <div key={e.name} className="flex justify-between border-b border-stone-100 py-1">
                <code>{e.name}</code><span className="tabular-nums">{e.n}</span>
              </div>
            ))}
            {!s.events.length && <p className="text-stone-400">No events yet.</p>}
          </div>
        </Card>
      </div>
    </Shell>
  );
}
