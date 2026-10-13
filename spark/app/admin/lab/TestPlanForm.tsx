"use client";
import { useActionState, useEffect, useState } from "react";
import { createTestPlan } from "../actions";
import { Button, ErrorText, inputClass } from "@/components/ui";

export function TestPlanForm() {
  const [state, action, pending] = useActionState(createTestPlan, null);
  const [tz, setTz] = useState("UTC");
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="tz" value={tz} />
      <label className="block text-sm font-semibold">Your email
        <input name="email" type="email" required className={`${inputClass} mt-1`} placeholder="you@email.com" />
      </label>
      <label className="block text-sm font-semibold">Tiny action
        <input name="action" className={`${inputClass} mt-1`} defaultValue="open the doc and write one sentence" />
      </label>
      <label className="block text-sm font-semibold">When / where (their words)
        <input name="cue" className={`${inputClass} mt-1`} defaultValue="after I make coffee" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">1 day =
          <span className="mt-1 flex items-center gap-2"><input name="day" type="number" min={1} max={60} defaultValue={2} className={inputClass} /> min</span>
        </label>
        <label className="block text-sm font-semibold">First email in
          <span className="mt-1 flex items-center gap-2"><input name="first" type="number" min={0} max={60} defaultValue={1} className={inputClass} /> min</span>
        </label>
      </div>
      <ErrorText>{state?.error}</ErrorText>
      {state?.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>}
      <Button disabled={pending}>Create test plan</Button>
    </form>
  );
}
