// The nag ladder. Every plan has an anchor time (due_at) and a "next email" (stage).
//
//   due_at + 0 days  -> "reminder"    (quotes their own plan)
//   due_at + 2 days  -> "restart"     (only if they haven't done it: no big deal, 1-minute version)
//   due_at + 5 days  -> "freshstart"  (offer to restart on next Monday / 1st of month; once per plan)
//   due_at + 8 days  -> "final"       (pause or keep going?), then stop.
//
// Doing the action resets the ladder: next reminder is the same time tomorrow.
// Never more than one email per day per plan.
// "Day" is 1440 minutes normally; test plans use a shorter day (e.g. 2 minutes).
import { q, q1 } from "./db";
import { freshStartFor, sendNag, type NagKind } from "./email";
import { logPlanEvent } from "./events";

const MIN = 60_000;
export const dayMs = (plan: { day_minutes: number }) => plan.day_minutes * MIN;

const PLAN_WITH_USER = `select p.*, u.email, u.unsubscribed from plans p join users u on u.id = p.user_id`;

export const getPlanByToken = (token: string) =>
  q1<any>(`${PLAN_WITH_USER} where p.token = $1`, [token]);

export const getPlanById = (id: number) => q1<any>(`${PLAN_WITH_USER} where p.id = $1`, [id]);

/** Next time of day after a completion: the same clock time as due_at, at least a few hours away. */
function nextDueAfter(plan: any, now: Date) {
  const day = dayMs(plan);
  let due = new Date(plan.due_at).getTime();
  if (due < now.getTime() - 400 * day) due = now.getTime(); // very old plans: don't loop forever
  while (due <= now.getTime() + day / 4) due += day;
  return new Date(due);
}

/** Work out what happens after an email of `kind` was sent. */
function afterSend(kind: NagKind, plan: any): { stage: string | null; next: Date | null; status?: string } {
  const due = new Date(plan.due_at).getTime();
  const day = dayMs(plan);
  if (kind === "reminder") return { stage: "restart", next: new Date(due + 2 * day) };
  if (kind === "restart") {
    return plan.fresh_start_used
      ? { stage: "final", next: new Date(due + 5 * day) }
      : { stage: "freshstart", next: new Date(due + 5 * day) };
  }
  if (kind === "freshstart") return { stage: "final", next: new Date(due + 8 * day) };
  return { stage: null, next: null, status: "stopped" };
}

/** Send whatever emails are due. Safe to run as often as you like. */
export async function runTick(opts: { onlyTest?: boolean } = {}) {
  const now = new Date();
  const due = await q<any>(
    `${PLAN_WITH_USER}
     where p.status = 'active' and p.next_send_at is not null and p.next_send_at <= $1
       and u.unsubscribed = false ${opts.onlyTest ? "and p.is_test = true" : ""}
     order by p.next_send_at limit 200`,
    [now.toISOString()],
  );
  const results: { plan: number; kind: string; status: string }[] = [];
  for (const plan of due) {
    // At most one email per "day" (20 hours, scaled for test plans).
    const minGap = (dayMs(plan) * 20) / 24;
    if (plan.last_sent_at && now.getTime() - new Date(plan.last_sent_at).getTime() < minGap) {
      const later = new Date(new Date(plan.last_sent_at).getTime() + minGap);
      await q(`update plans set next_send_at=$2 where id=$1`, [plan.id, later.toISOString()]);
      results.push({ plan: plan.id, kind: plan.stage, status: "postponed (1 per day)" });
      continue;
    }
    // Claim the plan first so two overlapping runs can't send the same email twice.
    const kind = plan.stage as NagKind;
    const next = afterSend(kind, plan);
    const claimed = await q(
      `update plans set stage=$3, next_send_at=$4, status=coalesce($5, status),
         last_sent_at=$6, fresh_start_used = fresh_start_used or $7
       where id=$1 and stage=$2 and next_send_at=$8 returning id`,
      [
        plan.id, plan.stage, next.stage ?? plan.stage, next.next?.toISOString() ?? null,
        next.status ?? null, now.toISOString(), kind === "freshstart", new Date(plan.next_send_at).toISOString(),
      ],
    );
    if (!claimed.length) continue;
    const res = await sendNag(kind, plan);
    results.push({ plan: plan.id, kind, status: res.status });
  }
  return { checked: due.length, results };
}

/** The person did their action (from the timer, an email button, or their plan page). */
export async function completePlan(plan: any, via: string) {
  const now = new Date();
  const since = plan.last_done_at || plan.created_at;
  const nag = await q1<{ n: number }>(
    `select count(*)::int as n from emails where plan_id=$1 and kind in ('reminder','restart','freshstart','final') and sent_at > $2`,
    [plan.id, new Date(since).toISOString()],
  );
  const afterNag = (nag?.n ?? 0) > 0;
  const rep = plan.completions + 1;
  const nextDue = nextDueAfter(plan, now);
  await q(`insert into completions (plan_id, rep, after_nag, via) values ($1,$2,$3,$4)`, [plan.id, rep, afterNag, via]);
  await q(
    `update plans set completions=$2, last_done_at=$3, due_at=$4, next_send_at=$4, stage='reminder',
       status = case when status='paused' then 'paused' else 'active' end
     where id=$1`,
    [plan.id, rep, now.toISOString(), nextDue.toISOString()],
  );
  await logPlanEvent(plan, "did_it_yes", { via, rep, after_nag: afterNag });
  return { rep, afterNag, nextDue };
}

/** Start the ladder again from a new anchor time. */
export async function restartAt(plan: any, at: Date) {
  await q(
    `update plans set due_at=$2, next_send_at=$2, stage='reminder', status='active' where id=$1`,
    [plan.id, at.toISOString()],
  );
}

export async function tomorrowSameTime(plan: any) {
  const d = nextDueAfter(plan, new Date());
  await restartAt(plan, d);
  return d;
}

export async function acceptFreshStart(plan: any) {
  const fs = freshStartFor(plan);
  await q(`update plans set fresh_start_used=true where id=$1`, [plan.id]);
  await restartAt(plan, fs.at);
  return fs;
}

export async function pausePlan(plan: any) {
  await q(`update plans set status='paused', next_send_at=null where id=$1`, [plan.id]);
}

export async function makeSmaller(plan: any, newAction: string) {
  await q(
    `update plans set original_action = coalesce(original_action, action), action=$2 where id=$1`,
    [plan.id, newAction],
  );
}

export async function unsubscribe(userId: number) {
  await q(`update users set unsubscribed=true where id=$1`, [userId]);
  await q(`update plans set status='stopped', next_send_at=null where user_id=$1`, [userId]);
}
