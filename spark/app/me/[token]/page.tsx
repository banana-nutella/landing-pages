import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Shell } from "@/components/ui";
import { q, q1 } from "@/lib/db";
import { publicPlan } from "@/lib/public";

export const dynamic = "force-dynamic";
export const metadata = { title: "My plans · Spark", robots: { index: false } };

const STATUS: Record<string, string> = { active: "Active", paused: "Paused", stopped: "Stopped" };

export default async function MyPlans({ params }: { params: Promise<{ token: string }> }) {
  const user = await q1<any>(`select * from users where token=$1`, [(await params).token]);
  if (!user) notFound();
  const plans = await q<any>(`select * from plans where user_id=$1 order by created_at desc limit 50`, [user.id]);
  return (
    <Shell>
      <h1 className="text-2xl font-extrabold">Your plans</h1>
      <p className="mt-1 text-sm text-stone-500">{user.email}</p>
      <div className="mt-5 space-y-3">
        {plans.map((p) => {
          const pp = publicPlan(p);
          return (
            <Link key={p.id} href={`/p/${p.token}`} className="block">
              <Card className="hover:ring-orange-300">
                <p className="font-semibold">{pp.sentence}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {STATUS[pp.status] ?? pp.status}
                  {pp.status === "active" && pp.nextLabel ? ` · next check-in ${pp.nextLabel}` : ""}
                </p>
              </Card>
            </Link>
          );
        })}
        {!plans.length && <p className="text-stone-600">No plans yet. <Link className="underline" href="/">Start one</Link>.</p>}
      </div>
    </Shell>
  );
}
