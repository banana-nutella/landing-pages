import { NextResponse } from "next/server";
import { createPlan } from "@/lib/plans";
import { publicPlan } from "@/lib/public";
import { clean, isEmail } from "@/lib/util";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = clean(b.email, 200);
  const action = clean(b.action, 300);
  const due = new Date(b.due_at);
  if (!isEmail(email)) return NextResponse.json({ error: "That email doesn't look quite right." }, { status: 400 });
  if (!action) return NextResponse.json({ error: "Add your tiny action first." }, { status: 400 });
  if (isNaN(due.getTime())) return NextResponse.json({ error: "Pick a time." }, { status: 400 });

  const fast = !!b.fast; // test mode: one "day" = 2 minutes
  const plan = await createPlan({
    email,
    action,
    cue: clean(b.cue, 300),
    tz: clean(b.tz, 64) || "UTC",
    due_at: due,
    visitor_id: clean(b.visitor_id, 64) || null,
    entry_path: b.entry_path === "A" || b.entry_path === "B" ? b.entry_path : null,
    spark_id: Number.isInteger(b.spark_id) ? b.spark_id : null,
    src: clean(b.src, 100) || null,
    own_spark: clean(b.own_spark, 2000) || null,
    day_minutes: fast ? 2 : 1440,
    is_test: fast,
  });
  return NextResponse.json({ plan: publicPlan(plan) });
}
