"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicPlan } from "@/lib/public";
import { fastMode, post, track, trafficSrc, visitorId } from "@/lib/client";
import { DoIt } from "./DoIt";
import { Button, Card, ErrorText, inputClass } from "./ui";

type Path = "A" | "B";
type Step = "spark" | "action" | "plan" | "doit";

const EXAMPLES = [
  "Open the doc and write one sentence",
  "Put my running shoes by the door",
  "Send one email asking about it",
  "Make a list of the first 3 steps",
];

// Signs an action might be too big for 10 minutes.
const BIG = /\b(finish|complete|entire|whole|all of|launch|every|the rest)\b/i;

type When = "now" | "hour" | "evening" | "morning" | "custom";
const WHEN_LABELS: Record<When, string> = {
  now: "Right now",
  hour: "In an hour",
  evening: "This evening",
  morning: "Tomorrow morning",
  custom: "Pick a time",
};

function atLocal(daysAhead: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function dueFor(when: When, custom: string, fast: boolean): Date | null {
  const now = Date.now();
  if (fast) return new Date(now + (when === "now" ? 2 : 1) * 60_000); // test mode: minutes, not days
  switch (when) {
    case "now": return new Date(now + 24 * 3600_000); // doing it now; check in same time tomorrow
    case "hour": return new Date(now + 3600_000);
    case "evening": return new Date().getHours() < 18 ? atLocal(0, 19) : atLocal(1, 19);
    case "morning": return atLocal(1, 8);
    case "custom": {
      const d = custom ? new Date(custom) : null;
      return d && !isNaN(d.getTime()) && d.getTime() > now ? d : null;
    }
  }
}

export function Flow({ path, spark, children }: { path: Path; spark?: { id: number }; children?: React.ReactNode }) {
  const [step, setStep] = useState<Step>(path === "A" ? "spark" : "action");
  const [ownSpark, setOwnSpark] = useState("");
  const [action, setAction] = useState("");
  const [bigOk, setBigOk] = useState(false);
  const [cue, setCue] = useState("");
  const [when, setWhen] = useState<When | null>(null);
  const [custom, setCustom] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [plan, setPlan] = useState<PublicPlan | null>(null);
  const [fast, setFast] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const t = useMemo(() => ({ entry_path: path, spark_id: spark?.id ?? null }), [path, spark?.id]);

  useEffect(() => {
    setFast(fastMode());
    track("spark_viewed", t);
  }, [t]);

  const go = (s: Step) => {
    setErr("");
    setStep(s);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const looksBig = !bigOk && (action.length > 90 || BIG.test(action));

  function submitSpark(e: React.FormEvent) {
    e.preventDefault();
    if (!ownSpark.trim()) return setErr("Paste a link or write a few words about what inspired you.");
    track("spark_submitted", { ...t, meta: { kind: /^https?:\/\//i.test(ownSpark.trim()) ? "link" : "text" } });
    go("action");
  }

  function submitAction(e: React.FormEvent) {
    e.preventDefault();
    if (!action.trim()) return setErr("Write one small thing. It can be really small.");
    if (looksBig) return; // the nudge below asks them first
    if (path === "B") track("spark_submitted", t);
    go("plan");
  }

  async function submitPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!when) return setErr("Pick when you'll do it.");
    const due = dueFor(when, custom, fast);
    if (!due) return setErr("Pick a time in the future.");
    setBusy(true); setErr("");
    try {
      const r = await post<{ plan: PublicPlan }>("/api/plan", {
        email, action: action.trim(), cue: cue.trim() || WHEN_LABELS[when].toLowerCase(),
        due_at: due.toISOString(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        visitor_id: visitorId(), src: trafficSrc(), entry_path: path, spark_id: spark?.id ?? null,
        own_spark: path === "A" ? ownSpark : null, fast,
      });
      setPlan(r.plan);
      go("doit");
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      {fast && (
        <p className="rounded-lg bg-violet-100 px-3 py-2 text-sm text-violet-800">
          Test mode: 1 day = 2 minutes, timer = 10 seconds. <a className="underline" href="?fast=0">Turn off</a>
        </p>
      )}
      {children}
      <div ref={top} className="scroll-mt-4" />

      {step === "spark" && (
        <Card className="animate-rise">
          <form onSubmit={submitSpark}>
            <h1 className="text-2xl font-extrabold leading-tight">What just inspired you?</h1>
            <p className="mt-1 text-stone-600">Paste a link, or describe it in a sentence. Quick is fine.</p>
            <textarea
              className={`${inputClass} mt-4 min-h-28`} autoFocus value={ownSpark}
              onChange={(e) => setOwnSpark(e.target.value)}
              placeholder="e.g. a video about someone who learned guitar at 40… or paste the link"
            />
            <ErrorText>{err}</ErrorText>
            <Button className="mt-4" type="submit">Next</Button>
          </form>
        </Card>
      )}

      {step === "action" && (
        <Card className="animate-rise">
          <form onSubmit={submitAction}>
            <h2 className="text-2xl font-extrabold leading-tight">What&apos;s one thing you can do in the next 10 minutes?</h2>
            <p className="mt-1 text-stone-600">Smaller is better. &ldquo;Write one sentence&rdquo; beats &ldquo;write the book.&rdquo;</p>
            <input
              className={`${inputClass} mt-4`} value={action} autoFocus={path === "A"}
              onChange={(e) => { setAction(e.target.value); setBigOk(false); }}
              placeholder="One tiny step…"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  type="button" key={ex} onClick={() => { setAction(ex); setBigOk(false); }}
                  className="rounded-full bg-orange-50 px-3 py-1.5 text-sm text-orange-800 ring-1 ring-orange-200 hover:bg-orange-100"
                >
                  {ex}
                </button>
              ))}
            </div>
            {looksBig && action.trim() && (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                <p>That sounds like more than 10 minutes. Want to shrink it? What&apos;s just the <em>first</em> bit?</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white" onClick={() => setAction("")}>
                    I&apos;ll shrink it
                  </button>
                  <button type="button" className="rounded-lg px-3 py-2 font-semibold underline" onClick={() => setBigOk(true)}>
                    It&apos;s fine as is
                  </button>
                </div>
              </div>
            )}
            <ErrorText>{err}</ErrorText>
            <Button className="mt-4" type="submit" disabled={!!(looksBig && action.trim())}>That&apos;s my tiny step</Button>
          </form>
        </Card>
      )}

      {step === "plan" && (
        <Card className="animate-rise">
          <form onSubmit={submitPlan}>
            <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Your step: {action}</p>
            <h2 className="mt-1 text-2xl font-extrabold leading-tight">When and where will you do it?</h2>
            <p className="mt-1 text-stone-600">Tie it to something you already do. People who decide this up front are much more likely to follow through.</p>
            <input
              className={`${inputClass} mt-4`} value={cue} onChange={(e) => setCue(e.target.value)}
              placeholder="e.g. tomorrow after I make coffee, at the kitchen table"
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(WHEN_LABELS) as When[]).map((w) => (
                <button
                  type="button" key={w} onClick={() => setWhen(w)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold ring-1 transition ${
                    when === w ? "bg-orange-600 text-white ring-orange-600" : "bg-white text-stone-700 ring-stone-300"
                  } ${w === "custom" ? "col-span-2" : ""}`}
                >
                  {WHEN_LABELS[w]}
                </button>
              ))}
            </div>
            {when === "custom" && (
              <input type="datetime-local" className={`${inputClass} mt-3`} value={custom} onChange={(e) => setCustom(e.target.value)} />
            )}
            <label className="mt-5 block text-sm font-semibold text-stone-700" htmlFor="email">
              Where should we send your reminder?
            </label>
            <input
              id="email" type="email" required autoComplete="email" inputMode="email"
              className={`${inputClass} mt-1.5`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
            />
            <p className="mt-2 text-xs text-stone-500">
              One email at your chosen time, never more than one a day. Pause or unsubscribe with one click. No password, no account.
            </p>
            <ErrorText>{err}</ErrorText>
            <Button className="mt-4" type="submit" disabled={busy}>{busy ? "Saving…" : "Set my plan"}</Button>
          </form>
        </Card>
      )}

      {step === "doit" && plan && (
        <DoIt
          plan={plan} track={t} autoStart={when === "now"}
          readyIntro={
            <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              Plan saved: &ldquo;{plan.sentence}.&rdquo;
            </p>
          }
        />
      )}
    </div>
  );
}
