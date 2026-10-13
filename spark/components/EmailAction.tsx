"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicPlan } from "@/lib/public";
import { post } from "@/lib/client";
import { Button, Card, Celebrate, ErrorText, inputClass } from "./ui";

type Res = { plan: PublicPlan; kind: string; rep?: number; already?: boolean; saved?: boolean; freshLabel?: string };

export function EmailAction({ token, action }: { token: string; action: string }) {
  const [res, setRes] = useState<Res | null>(null);
  const [err, setErr] = useState("");
  const [smaller, setSmaller] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    post<Res>(`/api/e/${token}/${action}`, {})
      .then((r) => {
        if (action === "open") { location.replace(`/p/${r.plan.token}`); return; }
        setRes(r);
        setSmaller(r.plan.tiny);
      })
      .catch((e) => setErr(e.message));
  }, [token, action]);

  async function saveSmaller() {
    setBusy(true);
    try {
      const r = await post<Res>(`/api/e/${token}/smaller`, { action: smaller });
      setRes(r); setSaved(true);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  if (err) return <Card><p className="text-stone-700">{err}</p><a className="mt-3 block underline" href="/">Go to Spark</a></Card>;
  if (!res) return <p className="py-10 text-center text-stone-500">One moment…</p>;

  const plan = res.plan;
  const planLink = <a href={`/p/${plan.token}`} className="mt-5 block text-center text-sm text-stone-500 underline underline-offset-4">See my plan</a>;
  const next = plan.status === "active" && plan.nextLabel ? <strong>{plan.nextLabel}</strong> : null;

  if (action === "did") {
    return (
      <Card>
        <Celebrate title={res.already ? "Already counted. Nice work." : "You did it."}>
          <p>{res.already ? "We've got it down." : "Look at you, showing up. That's exactly how this works."}</p>
          {next && <p className="mt-3 text-sm">Want to go again? We&apos;ll check in {next}.</p>}
        </Celebrate>
        {planLink}
      </Card>
    );
  }

  if (action === "smaller") {
    if (saved) {
      return (
        <Card>
          <h1 className="text-xl font-extrabold">Smaller it is.</h1>
          <p className="mt-1 text-stone-600">Your new step: <strong>{plan.action}</strong>. Want to do it right now?</p>
          <a href={`/p/${plan.token}`} className="mt-4 block"><Button>Do it now</Button></a>
          {next && <p className="mt-4 text-sm text-stone-500">Or we&apos;ll check in {next}.</p>}
        </Card>
      );
    }
    return (
      <Card>
        <h1 className="text-xl font-extrabold">Let&apos;s make it smaller.</h1>
        <p className="mt-1 text-stone-600">Instead of <em>{plan.action}</em>, what about something so small it&apos;s almost silly?</p>
        <input className={`${inputClass} mt-4`} value={smaller} onChange={(e) => setSmaller(e.target.value)} />
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {[plan.tiny, "Just open it and look at it", "Set it up for tomorrow"].map((s) => (
            <button key={s} type="button" onClick={() => setSmaller(s)} className="rounded-full bg-orange-50 px-3 py-1.5 text-orange-800 ring-1 ring-orange-200">
              {s}
            </button>
          ))}
        </div>
        <Button className="mt-4" disabled={busy || !smaller.trim()} onClick={saveSmaller}>Save smaller version</Button>
        <ErrorText>{err}</ErrorText>
      </Card>
    );
  }

  const messages: Record<string, { title: string; body: React.ReactNode }> = {
    pause: { title: "Paused.", body: <>No more emails about this until you come back. No pressure, no guilt.</> },
    unsub: { title: "You're unsubscribed.", body: <>You won&apos;t get any more emails from Spark. Thanks for giving it a try.</> },
    keep: { title: "Let's keep going.", body: <>{next ? <>We&apos;ll check in {next}.</> : null} Small and steady wins.</> },
    fresh: { title: "Fresh start it is.", body: <>{next ? <>We&apos;ll remind you {next}.</> : null} A clean slate, no catching up needed.</> },
  };
  const m = messages[action] ?? { title: "Done.", body: null };
  return (
    <Card>
      <h1 className="text-xl font-extrabold">{m.title}</h1>
      <p className="mt-1 text-stone-600">{m.body}</p>
      {action !== "unsub" && planLink}
    </Card>
  );
}
