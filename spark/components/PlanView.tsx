"use client";
import { useState } from "react";
import type { PublicPlan } from "@/lib/public";
import { post } from "@/lib/client";
import { DoIt } from "./DoIt";
import { Button, Card, ErrorText, inputClass } from "./ui";

export function PlanView({
  plan: initial, track,
}: { plan: PublicPlan; track: { entry_path?: "A" | "B" | null; spark_id?: number | null } }) {
  const [plan, setPlan] = useState(initial);
  const [mode, setMode] = useState<"view" | "doit" | "smaller" | "time">("view");
  const [smaller, setSmaller] = useState(initial.tiny);
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  async function act(body: Record<string, unknown>, msg: string) {
    setBusy(true); setErr("");
    try {
      const r = await post<{ plan: PublicPlan }>(`/api/plan/${plan.token}`, body);
      setPlan(r.plan); setMode("view"); setNote(msg);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  if (mode === "doit") return <DoIt plan={plan} track={track} autoStart />;

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Your plan</p>
        <p className="mt-1 text-xl font-extrabold leading-snug">&ldquo;{plan.sentence}.&rdquo;</p>
        <p className="mt-3 text-sm text-stone-600">
          {plan.status === "active" && plan.nextLabel && <>Next check-in: <strong>{plan.nextLabel}</strong>.</>}
          {plan.status === "paused" && <>Emails are paused. Come back whenever you like.</>}
          {plan.status === "stopped" && <>We&apos;ve stopped emailing about this one.</>}
        </p>
        {note && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{note}</p>}
      </Card>

      {mode === "view" && (
        <div className="grid gap-3">
          <Button onClick={() => setMode("doit")}>Do my 10 minutes now</Button>
          <Button variant="secondary" onClick={() => setMode("smaller")}>Make it smaller</Button>
          <Button variant="secondary" onClick={() => setMode("time")}>Change the time</Button>
          {plan.status === "active" ? (
            <Button variant="ghost" disabled={busy} onClick={() => act({ op: "pause" }, "Paused. No emails until you come back.")}>
              Pause emails
            </Button>
          ) : (
            <Button variant="ghost" disabled={busy} onClick={() => act({ op: "resume" }, "Welcome back. We'll check in at your usual time.")}>
              Resume emails
            </Button>
          )}
        </div>
      )}

      {mode === "smaller" && (
        <Card>
          <h2 className="text-lg font-extrabold">What&apos;s a smaller version?</h2>
          <p className="mt-1 text-sm text-stone-600">So small it&apos;s almost silly. That&apos;s the point.</p>
          <input className={`${inputClass} mt-3`} value={smaller} onChange={(e) => setSmaller(e.target.value)} />
          <div className="mt-3 grid gap-2">
            <Button disabled={busy || !smaller.trim()} onClick={() => act({ op: "smaller", action: smaller }, "Smaller it is. Nice.")}>Save</Button>
            <Button variant="ghost" onClick={() => setMode("view")}>Cancel</Button>
          </div>
        </Card>
      )}

      {mode === "time" && (
        <Card>
          <h2 className="text-lg font-extrabold">When works better?</h2>
          <input type="datetime-local" className={`${inputClass} mt-3`} value={time} onChange={(e) => setTime(e.target.value)} />
          <div className="mt-3 grid gap-2">
            <Button
              disabled={busy || !time}
              onClick={() => act({ op: "reschedule", due_at: new Date(time).toISOString() }, "Got it. New time saved.")}
            >
              Save
            </Button>
            <Button variant="ghost" onClick={() => setMode("view")}>Cancel</Button>
          </div>
        </Card>
      )}
      <ErrorText>{err}</ErrorText>
      <p className="pt-4 text-center text-xs text-stone-400">Bookmark this page. It&apos;s your private link.</p>
    </div>
  );
}
