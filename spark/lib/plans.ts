import { q, q1 } from "./db";
import { logPlanEvent } from "./events";
import { newToken } from "./util";

export async function upsertUser(email: string) {
  const e = email.trim().toLowerCase();
  return (await q1<any>(
    `insert into users (email, token) values ($1,$2)
     on conflict (email) do update set email = excluded.email returning *`,
    [e, newToken()],
  ))!;
}

export async function createPlan(input: {
  email: string;
  visitor_id: string | null;
  entry_path: string | null;
  spark_id: number | null;
  src: string | null;
  own_spark: string | null;
  action: string;
  cue: string;
  tz: string;
  due_at: Date;
  day_minutes?: number;
  is_test?: boolean;
}) {
  const user = await upsertUser(input.email);
  // Coming back with a new plan counts as opting back in.
  if (user.unsubscribed) await q(`update users set unsubscribed=false where id=$1`, [user.id]);
  const plan = (await q1<any>(
    `insert into plans (token, user_id, visitor_id, entry_path, spark_id, src, own_spark, action, cue, tz,
       due_at, next_send_at, stage, status, day_minutes, is_test)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,'reminder','active',$12,$13) returning *`,
    [
      newToken(), user.id, input.visitor_id, input.entry_path, input.spark_id, input.src, input.own_spark,
      input.action, input.cue, input.tz, input.due_at.toISOString(), input.day_minutes ?? 1440, !!input.is_test,
    ],
  ))!;
  await logPlanEvent(plan, "plan_set", { due_at: input.due_at.toISOString() });
  return { ...plan, email: user.email };
}
