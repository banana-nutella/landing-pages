import { NextResponse } from "next/server";
import { completePlan, getPlanByToken, makeSmaller, pausePlan, restartAt, tomorrowSameTime } from "@/lib/ladder";
import { publicPlan } from "@/lib/public";
import { clean } from "@/lib/util";

// Actions from the person's own plan page or the in-app flow.
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const plan = await getPlanByToken(token);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  let extra: Record<string, unknown> = {};

  switch (b.op) {
    case "done": {
      const r = await completePlan(plan, clean(b.via, 20) || "app");
      extra = { rep: r.rep };
      break;
    }
    case "pause":
      await pausePlan(plan);
      break;
    case "resume":
      await tomorrowSameTime(plan);
      break;
    case "smaller": {
      const a = clean(b.action, 300);
      if (!a) return NextResponse.json({ error: "Write the smaller version first." }, { status: 400 });
      await makeSmaller(plan, a);
      break;
    }
    case "reschedule": {
      const d = new Date(b.due_at);
      if (isNaN(d.getTime())) return NextResponse.json({ error: "Pick a time." }, { status: 400 });
      await restartAt(plan, d);
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  return NextResponse.json({ plan: publicPlan(await getPlanByToken(token)), ...extra });
}
