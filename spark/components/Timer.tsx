"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

/** A countdown. Calls onDone when it reaches zero or when they tap "I'm done". */
export function Timer({ seconds, onDone }: { seconds: number; onDone: (early: boolean) => void }) {
  const [left, setLeft] = useState(seconds);
  const endAt = useRef(Date.now() + seconds * 1000);
  const fired = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l === 0 && !fired.current) {
        fired.current = true;
        clearInterval(id);
        try { navigator.vibrate?.(300); } catch {}
        onDone(false);
      }
    }, 250);
    return () => clearInterval(id);
  }, [onDone]);

  const pct = 1 - left / seconds;
  const r = 88, c = 2 * Math.PI * r;
  const mm = String(Math.floor(left / 60)).padStart(1, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="text-center">
      <div className="relative mx-auto h-56 w-56">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <circle cx="100" cy="100" r={r} fill="none" stroke="#fed7aa" strokeWidth="12" />
          <circle
            cx="100" cy="100" r={r} fill="none" stroke="#ea580c" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .25s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-extrabold tabular-nums">{mm}:{ss}</span>
          <span className="mt-1 text-sm text-stone-500">you've got this</span>
        </div>
      </div>
      <p className="mt-4 text-stone-600">Phone down, go do it. We'll be right here.</p>
      <div className="mt-5">
        <Button variant="secondary" onClick={() => { if (!fired.current) { fired.current = true; onDone(true); } }}>
          I&apos;m done already
        </Button>
      </div>
    </div>
  );
}
