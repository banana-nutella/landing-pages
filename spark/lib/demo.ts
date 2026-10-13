// Fake data so you can see the dashboard working before real traffic arrives.
// Everything here is marked as test data and never receives real emails.
import { q } from "./db";
import { newToken } from "./util";

const SOURCES = ["tiktok-ad1", "tiktok-ad2", "instagram-reel", "direct"];
const ACTIONS = [
  "open the doc and write one sentence", "put my running shoes by the door", "email Sam about the class",
  "sketch for 5 minutes", "list the first 3 steps", "practice 2 chords",
];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export async function createDemoData(people = 80) {
  const sparks = await q<{ id: number }>(`select id from sparks order by id`);
  // Give each spark a different "quality" so the by-spark breakdown shows differences.
  const quality = new Map(sparks.map((s, i) => [s.id, 0.3 + (i % 5) * 0.08]));
  const day = 86400_000;

  for (let i = 0; i < people; i++) {
    const vid = `demo-${newToken(6)}`;
    const path = Math.random() < 0.35 ? "A" : "B";
    const spark = path === "B" && sparks.length ? pick(sparks).id : null;
    const src = pick(SOURCES);
    const t0 = Date.now() - Math.random() * 14 * day;
    const ev = (name: string, at: number, plan: number | null = null, meta: object | null = null) =>
      q(`insert into events (at, name, visitor_id, plan_id, entry_path, spark_id, src, is_test, meta)
         values ($1,$2,$3,$4,$5,$6,$7,true,$8)`,
        [new Date(at).toISOString(), name, vid, plan, path, spark, src, meta ? JSON.stringify(meta) : null]);

    if (path === "A" || Math.random() < 0.3) await ev("landing_view", t0 - 5000);
    await ev("spark_viewed", t0);

    const pPlan = path === "A" ? 0.55 : spark ? quality.get(spark)! + 0.1 : 0.4;
    if (Math.random() > pPlan) continue;
    await ev("spark_submitted", t0 + 20_000);

    const [user] = await q<{ id: number }>(
      `insert into users (email, token) values ($1,$2) returning id`, [`${vid}@example.com`, newToken()]);
    const due = t0 + day;
    const [plan] = await q<{ id: number }>(
      `insert into plans (token, user_id, visitor_id, entry_path, spark_id, src, action, cue, tz, due_at,
         stage, status, next_send_at, is_test, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,'tomorrow after coffee','UTC',$8,'reminder','active',null,true,$9) returning id`,
      [newToken(), user.id, vid, path, spark, src, pick(ACTIONS), new Date(due).toISOString(), new Date(t0 + 60_000).toISOString()]);
    await ev("plan_set", t0 + 60_000, plan.id);

    let completions = 0;
    if (Math.random() < 0.6) {
      await ev("timer_done", t0 + 11 * 60_000, plan.id);
      if (Math.random() < 0.85) {
        completions = 1;
        await q(`insert into completions (plan_id, rep, after_nag, via, at) values ($1,1,false,'timer',$2)`,
          [plan.id, new Date(t0 + 11 * 60_000).toISOString()]);
        await ev("did_it_yes", t0 + 11 * 60_000, plan.id, { via: "timer", rep: 1 });
      }
    }

    // The nag ladder: a reminder, then maybe a restart.
    const kinds = ["reminder", "restart"];
    for (const [k, kind] of kinds.entries()) {
      const at = due + k * 2 * day;
      if (at > Date.now()) break;
      const clicked = Math.random() < (completions ? 0.45 : 0.25);
      await q(`insert into emails (token, plan_id, user_id, kind, to_email, subject, html, status, sent_at, clicked_at)
               values ($1,$2,$3,$4,$5,'(demo email)','<p>demo</p>','logged',$6,$7)`,
        [newToken(), plan.id, user.id, kind, `${vid}@example.com`, new Date(at).toISOString(), clicked ? new Date(at + 3600_000).toISOString() : null]);
      await ev("nag_sent", at, plan.id, { kind });
      if (!clicked) continue;
      const action = Math.random() < 0.7 ? "did" : pick(["smaller", "pause", "unsub"]);
      await ev("nag_clicked", at + 3600_000, plan.id, { kind, action });
      if (action !== "pause" && action !== "unsub") await ev("returned_after_nag", at + 3600_000, plan.id, { kind, action });
      if (action === "did") {
        completions++;
        await q(`insert into completions (plan_id, rep, after_nag, via, at) values ($1,$2,true,'email',$3)`,
          [plan.id, completions, new Date(at + 3600_000).toISOString()]);
        await ev("did_it_yes", at + 3600_000, plan.id, { via: "email", rep: completions });
        break;
      }
    }
    await q(`update plans set completions=$2 where id=$1`, [plan.id, completions]);
  }
}

export async function deleteTestData() {
  await q(`delete from events where is_test`);
  await q(`delete from plans where is_test`);
  await q(`delete from users u where email like '%@example.com' and not exists (select 1 from plans p where p.user_id=u.id)`);
}
