import { planSentence, tinyVersion } from "./email";
import { formatWhen } from "./time";

/** The parts of a plan that are safe to show to the person who owns its link. */
export function publicPlan(plan: any) {
  return {
    token: plan.token as string,
    action: plan.action as string,
    cue: (plan.cue as string) || "",
    sentence: planSentence(plan),
    tiny: tinyVersion(plan.action),
    status: plan.status as string,
    completions: plan.completions as number,
    nextAt: plan.next_send_at ? new Date(plan.next_send_at).toISOString() : null,
    nextLabel: plan.next_send_at ? formatWhen(new Date(plan.next_send_at), plan.tz) : null,
    test: !!plan.is_test,
    dayMinutes: plan.day_minutes as number,
  };
}
export type PublicPlan = ReturnType<typeof publicPlan>;
