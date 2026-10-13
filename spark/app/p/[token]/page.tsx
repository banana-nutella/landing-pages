import { notFound } from "next/navigation";
import { PlanView } from "@/components/PlanView";
import { Shell } from "@/components/ui";
import { getPlanByToken } from "@/lib/ladder";
import { publicPlan } from "@/lib/public";

export const dynamic = "force-dynamic";
export const metadata = { title: "My plan · Spark", robots: { index: false } };

// The person's private plan page. The link itself is the "login" (magic link).
export default async function PlanPage({ params }: { params: Promise<{ token: string }> }) {
  const plan = await getPlanByToken((await params).token);
  if (!plan) notFound();
  return (
    <Shell>
      <PlanView plan={publicPlan(plan)} track={{ entry_path: plan.entry_path, spark_id: plan.spark_id }} />
    </Shell>
  );
}
