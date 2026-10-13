import { q } from "./db";

export type FunnelRow = {
  key: string;
  label: string;
  viewers: number;   // saw a spark (path B) or opened "I just got inspired" (path A)
  planned: number;   // set a plan
  first: number;     // did the first action
  second: number;    // did a second action after at least one nag email
};

export type Stats = {
  overall: FunnelRow;
  byPath: FunnelRow[];
  bySpark: FunnelRow[];
  bySrc: FunnelRow[];
  nags: { kind: string; sent: number; clicked: number; did: number; smaller: number; pause: number; unsub: number }[];
  events: { name: string; n: number }[];
  landingViews: number;
};

const pathLabel = (p: string | null) => (p === "A" ? "A · I just got inspired" : p === "B" ? "B · Give me a spark" : "(unknown)");

export async function getStats(test: boolean): Promise<Stats> {
  const [views, plans, comps, sparks, nagRows, clickRows, eventRows] = await Promise.all([
    q<any>(`select distinct visitor_id, entry_path, spark_id, coalesce(src,'direct') as src
            from events where name='spark_viewed' and is_test=$1 and visitor_id is not null`, [test]),
    q<any>(`select id, visitor_id, entry_path, spark_id, coalesce(src,'direct') as src, completions from plans where is_test=$1`, [test]),
    q<any>(`select c.plan_id, c.rep, c.after_nag from completions c join plans p on p.id=c.plan_id where p.is_test=$1`, [test]),
    q<any>(`select id, title from sparks`),
    q<any>(`select e.kind, count(*)::int as sent, count(e.clicked_at)::int as clicked
            from emails e join plans p on p.id=e.plan_id where p.is_test=$1 group by e.kind`, [test]),
    q<any>(`select meta->>'kind' as kind, meta->>'action' as action, count(*)::int as n
            from events where name='nag_clicked' and is_test=$1 group by 1,2`, [test]),
    q<any>(`select name, count(*)::int as n from events where is_test=$1 group by name order by name`, [test]),
  ]);

  const sparkTitle = new Map<number, string>(sparks.map((s: any) => [s.id, s.title]));
  const secondPlans = new Set(comps.filter((c: any) => c.rep >= 2 && c.after_nag).map((c: any) => c.plan_id));
  const person = (p: any) => p.visitor_id || `plan-${p.id}`;

  function funnel(key: string, label: string, vf: (v: any) => boolean, pf: (p: any) => boolean): FunnelRow {
    const ps = plans.filter(pf);
    return {
      key, label,
      viewers: new Set(views.filter(vf).map((v: any) => v.visitor_id)).size,
      planned: new Set(ps.map(person)).size,
      first: new Set(ps.filter((p: any) => p.completions >= 1).map(person)).size,
      second: new Set(ps.filter((p: any) => secondPlans.has(p.id)).map(person)).size,
    };
  }

  function groupBy(field: "entry_path" | "spark_id" | "src", label: (v: any) => string) {
    const keys = new Set<any>([...views.map((v: any) => v[field]), ...plans.map((p: any) => p[field])]);
    return [...keys]
      .map((k) => funnel(String(k), label(k), (v) => v[field] === k, (p) => p[field] === k))
      .sort((a, b) => b.viewers + b.planned - (a.viewers + a.planned));
  }

  const nagKinds = ["reminder", "restart", "freshstart", "final"];
  const clicks = (kind: string, action: string) =>
    clickRows.find((r: any) => r.kind === kind && r.action === action)?.n ?? 0;

  const landing = eventRows.find((e: any) => e.name === "landing_view")?.n ?? 0;

  return {
    overall: funnel("all", "Everyone", () => true, () => true),
    byPath: groupBy("entry_path", pathLabel),
    bySpark: groupBy("spark_id", (id) => (id == null ? "Their own spark (path A)" : sparkTitle.get(id) ?? `Deleted spark #${id}`)),
    bySrc: groupBy("src", (s) => s ?? "direct"),
    nags: nagKinds.map((kind) => {
      const r = nagRows.find((x: any) => x.kind === kind);
      return {
        kind, sent: r?.sent ?? 0, clicked: r?.clicked ?? 0,
        did: clicks(kind, "did"), smaller: clicks(kind, "smaller"), pause: clicks(kind, "pause"), unsub: clicks(kind, "unsub"),
      };
    }),
    events: eventRows,
    landingViews: landing,
  };
}
