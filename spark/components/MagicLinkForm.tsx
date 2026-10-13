"use client";
import { useState } from "react";
import { post } from "@/lib/client";
import { Button, ErrorText, inputClass } from "./ui";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (sent) return <p className="mt-5 rounded-xl bg-green-50 p-4 text-green-800">If we have plans for that email, a link is on its way. Check your inbox.</p>;

  return (
    <form
      className="mt-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setErr("");
        try { await post("/api/me", { email }); setSent(true); } catch (e: any) { setErr(e.message); }
        setBusy(false);
      }}
    >
      <input type="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
      <ErrorText>{err}</ErrorText>
      <Button className="mt-3" disabled={busy}>Email me my link</Button>
    </form>
  );
}
