"use client";
import { useEffect, useState } from "react";

type Log = { at: string; text: string };

export function AutoTick() {
  const [on, setOn] = useState(true);
  const [log, setLog] = useState<Log[]>([]);

  async function tick() {
    try {
      const r = await fetch("/api/admin/tick", { method: "POST" });
      const d = await r.json();
      const text = !r.ok ? `Error: ${d.error || r.status}`
        : d.results?.length ? d.results.map((x: any) => `plan #${x.plan}: ${x.kind} → ${x.status}`).join(", ")
        : "nothing due";
      setLog((l) => [{ at: new Date().toLocaleTimeString(), text }, ...l].slice(0, 12));
    } catch (e: any) {
      setLog((l) => [{ at: new Date().toLocaleTimeString(), text: `Error: ${e.message}` }, ...l].slice(0, 12));
    }
  }

  useEffect(() => {
    if (!on) return;
    tick();
    const id = setInterval(tick, 20_000);
    return () => clearInterval(id);
  }, [on]);

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-5 w-5 accent-orange-600" />
          Auto-run every 20 seconds
        </label>
        <button onClick={tick} className="ml-auto rounded-lg px-3 py-1.5 text-sm ring-1 ring-stone-300">Run now</button>
      </div>
      <ul className="mt-3 space-y-1 font-mono text-xs text-stone-600">
        {log.map((l, i) => <li key={i}>{l.at} · {l.text}</li>)}
      </ul>
    </div>
  );
}
