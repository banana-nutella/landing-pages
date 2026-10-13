import { q } from "./db";

export const EVENT_NAMES = [
  "landing_view",
  "spark_viewed",
  "spark_submitted",
  "plan_set",
  "timer_done",
  "did_it_yes",
  "nag_sent",
  "nag_clicked",
  "returned_after_nag",
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

type EventInput = {
  name: EventName;
  visitor_id?: string | null;
  plan_id?: number | null;
  entry_path?: string | null;
  spark_id?: number | null;
  src?: string | null;
  is_test?: boolean;
  meta?: Record<string, unknown> | null;
};

export async function logEvent(e: EventInput) {
  await q(
    `insert into events (name, visitor_id, plan_id, entry_path, spark_id, src, is_test, meta)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      e.name, e.visitor_id ?? null, e.plan_id ?? null, e.entry_path ?? null,
      e.spark_id ?? null, e.src ?? null, !!e.is_test, e.meta ? JSON.stringify(e.meta) : null,
    ],
  );
}

/** Log an event that belongs to a plan; copies the plan's path, spark and source onto it. */
export function logPlanEvent(plan: any, name: EventName, meta?: Record<string, unknown>) {
  return logEvent({
    name, plan_id: plan.id, visitor_id: plan.visitor_id, entry_path: plan.entry_path,
    spark_id: plan.spark_id, src: plan.src, is_test: plan.is_test, meta,
  });
}
