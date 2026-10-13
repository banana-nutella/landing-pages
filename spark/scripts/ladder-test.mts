// Automated check of the nag ladder. Run with: npx tsx scripts/ladder-test.mts
// Uses a throwaway in-memory database and fast-forwards time by editing timestamps.
import assert from "node:assert/strict";

delete process.env.DATABASE_URL;
delete process.env.RESEND_API_KEY;
process.env.VERCEL = "1"; // forces the in-memory demo database

const { q, q1 } = await import("../lib/db");
const { createPlan } = await import("../lib/plans");
const { runTick, completePlan, getPlanById, acceptFreshStart } = await import("../lib/ladder");
const { handleEmailAction } = await import("../lib/email-actions");
const { getStats } = await import("../lib/stats");
const { nextFreshStart } = await import("../lib/time");

const DAY = 86400_000;
const shift = (id: number, ms: number) =>
  q(`update plans set due_at = due_at - $2 * interval '1 millisecond',
       next_send_at = next_send_at - $2 * interval '1 millisecond',
       last_sent_at = last_sent_at - $2 * interval '1 millisecond',
       last_done_at = last_done_at - $2 * interval '1 millisecond',
       created_at = created_at - $2 * interval '1 millisecond' where id=$1`, [id, ms]);
const kinds = async (id: number) => (await q<any>(`select kind from emails where plan_id=$1 order by id`, [id])).map((r) => r.kind);
const base = {
  visitor_id: "v1", entry_path: "B", spark_id: 1, src: "tiktok-ad1", own_spark: null,
  action: "write one sentence", cue: "tomorrow after I make coffee", tz: "America/New_York",
};

// 1. Full ladder when they never act.
let p = await createPlan({ ...base, email: "a@test.com", due_at: new Date(Date.now() - 1000) });
await runTick();
assert.deepEqual(await kinds(p.id), ["reminder"], "reminder at chosen time");
const reminder = await q1<any>(`select * from emails where plan_id=$1`, [p.id]);
assert.match(reminder.html, /Tomorrow after I make coffee, I&#39;ll write one sentence/, "quotes their words");
for (const a of ["did", "smaller", "pause", "unsub"]) assert.match(reminder.html, new RegExp(`/e/[^/]+/${a}`), `has ${a} link`);
await runTick();
assert.equal((await kinds(p.id)).length, 1, "nothing more on the same day");
await shift(p.id, 1 * DAY); await runTick();
assert.equal((await kinds(p.id)).length, 1, "nothing on day 1");
await shift(p.id, 1 * DAY); await runTick();
assert.deepEqual(await kinds(p.id), ["reminder", "restart"], "day 2: restart");
assert.match((await q1<any>(`select html from emails where plan_id=$1 and kind='restart'`, [p.id])).html, /1 minute/);
await shift(p.id, 3 * DAY); await runTick();
assert.deepEqual(await kinds(p.id), ["reminder", "restart", "freshstart"], "day 5: fresh start");
await shift(p.id, 3 * DAY); await runTick();
assert.deepEqual(await kinds(p.id), ["reminder", "restart", "freshstart", "final"], "day 8: final");
assert.equal((await getPlanById(p.id)).status, "stopped", "stops after final");
await shift(p.id, 30 * DAY); await runTick();
assert.equal((await kinds(p.id)).length, 4, "never emails again");
console.log("✓ full ladder: reminder → day 2 → day 5 → final → stop");

// 2. Doing it after a nag counts as a second action after a nag.
p = await createPlan({ ...base, visitor_id: "v2", email: "b@test.com", due_at: new Date(Date.now() + DAY) });
let r = await completePlan(await getPlanById(p.id), "timer");
assert.equal(r.rep, 1); assert.equal(r.afterNag, false, "first action from timer isn't after a nag");
await shift(p.id, 2 * DAY); await runTick();
assert.deepEqual(await kinds(p.id), ["reminder"]);
assert.match((await q1<any>(`select subject from emails where plan_id=$1`, [p.id])).subject, /Again today/, "repeat wording");
const em = await q1<any>(`select token from emails where plan_id=$1`, [p.id]);
const res: any = await handleEmailAction(em.token, "did");
assert.equal(res.rep, 2);
const again: any = await handleEmailAction(em.token, "did");
assert.equal(again.already, true, "double click doesn't count twice");
const c2 = await q1<any>(`select * from completions where plan_id=$1 and rep=2`, [p.id]);
assert.equal(c2.after_nag, true);
const plan2 = await getPlanById(p.id);
assert.equal(plan2.stage, "reminder"); assert.ok(new Date(plan2.next_send_at).getTime() > Date.now(), "next reminder scheduled");
console.log("✓ completion after nag resets the ladder and counts as 2nd action");

// 3. One email per day maximum.
p = await createPlan({ ...base, visitor_id: "v3", email: "c@test.com", due_at: new Date(Date.now() - 1000) });
await q(`update plans set last_sent_at = now() - interval '2 hours' where id=$1`, [p.id]);
const t = await runTick();
assert.ok(t.results.some((x) => x.plan === p.id && x.status.startsWith("postponed")), "postponed");
assert.equal((await kinds(p.id)).length, 0);
console.log("✓ never more than one email a day");

// 4. Fresh start, pause, unsubscribe.
p = await createPlan({ ...base, visitor_id: "v4", email: "d@test.com", due_at: new Date(Date.now() - 1000) });
const fs = await acceptFreshStart(await getPlanById(p.id));
assert.ok(fs.at.getTime() > Date.now() && fs.at.getTime() < Date.now() + 32 * DAY);
assert.equal((await getPlanById(p.id)).fresh_start_used, true);
await q(`update plans set next_send_at = now() - interval '1 second' where id=$1`, [p.id]);
await runTick();
const tok = (await q1<any>(`select token from emails where plan_id=$1`, [p.id])).token;
await handleEmailAction(tok, "pause");
assert.equal((await getPlanById(p.id)).status, "paused");
await handleEmailAction(tok, "unsub");
assert.equal((await q1<any>(`select unsubscribed from users where email='d@test.com'`)).unsubscribed, true);
console.log("✓ fresh start, pause, unsubscribe");

// 5. Fresh-start date: next Monday or the 1st, whichever is first, at the same local time.
const wed = new Date("2026-10-14T15:00:00Z"); // Wednesday
const f1 = nextFreshStart(wed, new Date("2026-10-13T12:30:00Z"), "America/New_York");
assert.equal(f1.label, "Monday"); assert.equal(f1.at.toISOString(), "2026-10-19T12:30:00.000Z");
const f2 = nextFreshStart(new Date("2026-10-29T15:00:00Z"), new Date("2026-10-13T12:30:00Z"), "America/New_York");
assert.equal(f2.label, "the 1st of the month"); // Nov 1 (Sunday) comes before Monday Nov 2
assert.equal(f2.at.toISOString(), "2026-11-01T13:30:00.000Z", "8:30am New York after DST ends");
console.log("✓ fresh-start date math");

// 6. Stats.
await q(`insert into events (name, visitor_id, entry_path, spark_id, src) values
  ('spark_viewed','v1','B',1,'tiktok-ad1'),('spark_viewed','v2','B',1,'tiktok-ad1'),('spark_viewed','v9','B',2,'instagram')`);
const s = await getStats(false);
assert.equal(s.overall.viewers, 3);
assert.equal(s.overall.second, 1);
assert.ok(s.bySrc.find((x) => x.key === "tiktok-ad1")!.planned >= 2);
console.log("✓ stats");
console.log("\nAll ladder tests passed.");
process.exit(0);
