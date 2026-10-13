import { q, q1 } from "./db";
import { logPlanEvent } from "./events";
import {
  acceptFreshStart, completePlan, getPlanById, makeSmaller, pausePlan, tomorrowSameTime, unsubscribe,
} from "./ladder";
import { publicPlan } from "./public";
import { clean } from "./util";

const ACTIONS = new Set(["did", "smaller", "pause", "unsub", "keep", "fresh", "open"]);
// Clicks that bring someone back into the app (pause/unsubscribe don't count as "returning").
const RETURNING = new Set(["did", "smaller", "keep", "fresh", "open"]);

export async function handleEmailAction(token: string, action: string, body: { action?: string } = {}) {
  if (!ACTIONS.has(action)) return { error: "Unknown link" };
  const email = await q1<any>(`select * from emails where token=$1`, [token]);
  if (!email?.plan_id) return { error: "This link has expired." };
  const plan = await getPlanById(email.plan_id);
  if (!plan) return { error: "This link has expired." };

  const newSmaller = clean(body.action, 300);
  // The second step of "make it smaller" (saving the new version) isn't a new click.
  if (!newSmaller) {
    await logPlanEvent(plan, "nag_clicked", { kind: email.kind, action });
    if (!email.clicked_at && RETURNING.has(action)) {
      await logPlanEvent(plan, "returned_after_nag", { kind: email.kind, action });
    }
    if (!email.clicked_at) await q(`update emails set clicked_at=now() where id=$1`, [email.id]);
  }

  let result: Record<string, unknown> = {};
  switch (action) {
    case "did": {
      // Email scanners or double taps shouldn't count twice.
      if (plan.last_done_at && new Date(plan.last_done_at) > new Date(email.sent_at)) {
        result = { already: true };
      } else {
        const r = await completePlan(plan, "email");
        result = { rep: r.rep };
      }
      break;
    }
    case "smaller":
      if (newSmaller) {
        await makeSmaller(plan, newSmaller);
        result = { saved: true };
      }
      break;
    case "pause":
      await pausePlan(plan);
      break;
    case "unsub":
      await unsubscribe(plan.user_id);
      break;
    case "keep":
      await tomorrowSameTime(plan);
      break;
    case "fresh": {
      const fs = await acceptFreshStart(plan);
      result = { freshLabel: fs.label };
      break;
    }
  }
  const fresh = await getPlanById(plan.id);
  return { ok: true, kind: email.kind, plan: publicPlan(fresh), ...result };
}
