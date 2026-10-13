"use client";
import { useCallback, useState } from "react";
import type { PublicPlan } from "@/lib/public";
import { post, track } from "@/lib/client";
import { Timer } from "./Timer";
import { Button, Card, Celebrate, ErrorText, inputClass } from "./ui";

type Stage = "ready" | "running" | "ask" | "yes" | "notyet" | "smaller-saved";

/**
 * Timer -> "Did you do it?" -> celebration, or a no-big-deal restart.
 * Used right after making a plan and on the plan page.
 */
export function DoIt({
  plan: initial, track: trackInfo, autoStart = false, readyIntro,
}: {
  plan: PublicPlan;
  track?: { entry_path?: "A" | "B" | null; spark_id?: number | null };
  autoStart?: boolean;
  readyIntro?: React.ReactNode;
}) {
  const [plan, setPlan] = useState(initial);
  const [stage, setStage] = useState<Stage>(autoStart ? "running" : "ready");
  const [seconds, setSeconds] = useState(plan.test ? 10 : 600);
  const [smaller, setSmaller] = useState(plan.tiny);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const start = (secs: number) => { setSeconds(secs); setStage("running"); };
  const onTimerDone = useCallback((early: boolean) => {
    track("timer_done", { ...trackInfo, meta: { early } });
    setStage("ask");
  }, [trackInfo]);

  async function act(body: Record<string, unknown>, next: Stage) {
    setBusy(true); setErr("");
    try {
      const r = await post<{ plan: PublicPlan }>(`/api/plan/${plan.token}`, body);
      setPlan(r.plan);
      setStage(next);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  const nextLine = plan.nextLabel && plan.status === "active"
    ? <>We&apos;ll check in <strong>{plan.nextLabel}</strong>. One email, never more than one a day.</>
    : null;

  if (stage === "running") {
    return <Card className="animate-rise"><Timer key={seconds} seconds={seconds} onDone={onTimerDone} /></Card>;
  }

  if (stage === "ask") {
    return (
      <Card className="animate-rise text-center">
        <h2 className="text-2xl font-extrabold">Did you do it?</h2>
        <p className="mt-1 text-stone-600">{plan.action}</p>
        <div className="mt-5 grid gap-3">
          <Button variant="green" disabled={busy} onClick={() => act({ op: "done", via: "timer" }, "yes")}>Yes, I did it</Button>
          <Button variant="secondary" disabled={busy} onClick={() => setStage("notyet")}>Not yet</Button>
        </div>
        <ErrorText>{err}</ErrorText>
      </Card>
    );
  }

  if (stage === "yes") {
    return (
      <Card>
        <Celebrate>
          <p>That was the hard part. Starting is the whole game, and you just did it.</p>
          {nextLine && <p className="mt-3 text-sm">{nextLine}</p>}
        </Celebrate>
        <a href={`/p/${plan.token}`} className="mt-5 block text-center text-sm text-stone-500 underline underline-offset-4">See my plan</a>
      </Card>
    );
  }

  if (stage === "notyet") {
    return (
      <Card className="animate-rise">
        <h2 className="text-xl font-extrabold">No big deal.</h2>
        <p className="mt-1 text-stone-600">Seriously, it happens. Want to make it even smaller? A version so small it&apos;s almost silly:</p>
        <input className={`${inputClass} mt-4`} value={smaller} onChange={(e) => setSmaller(e.target.value)} />
        <div className="mt-3 grid gap-3">
          <Button disabled={busy || !smaller.trim()} onClick={() => act({ op: "smaller", action: smaller }, "smaller-saved")}>
            Use the smaller version
          </Button>
          <Button variant="secondary" onClick={() => start(plan.test ? 10 : 120)}>Try just 2 minutes now</Button>
        </div>
        {nextLine && <p className="mt-4 text-sm text-stone-500">Either way, {nextLine}</p>}
        <ErrorText>{err}</ErrorText>
      </Card>
    );
  }

  if (stage === "smaller-saved") {
    return (
      <Card className="animate-rise">
        <h2 className="text-xl font-extrabold">Smaller it is.</h2>
        <p className="mt-1 text-stone-600">Your new step: <strong>{plan.action}</strong></p>
        <div className="mt-4"><Button onClick={() => start(plan.test ? 10 : 120)}>Do it now (2 minutes)</Button></div>
        {nextLine && <p className="mt-4 text-sm text-stone-500">Or later: {nextLine}</p>}
      </Card>
    );
  }

  // ready
  return (
    <Card className="animate-rise">
      {readyIntro}
      <h2 className="text-xl font-extrabold">Got 10 minutes right now?</h2>
      <p className="mt-1 text-stone-600">
        The feeling is strongest right now. Want to start the timer and do <strong>{plan.action}</strong>?
      </p>
      <div className="mt-5 grid gap-3">
        <Button onClick={() => start(plan.test ? 10 : 600)}>Start my 10 minutes</Button>
      </div>
      {nextLine && <p className="mt-4 text-sm text-stone-500">Not now? That&apos;s fine. {nextLine}</p>}
    </Card>
  );
}
