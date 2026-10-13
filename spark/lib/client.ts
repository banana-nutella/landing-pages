"use client";
// Small browser helpers: anonymous visitor id, traffic source, test mode, event logging.

function store(key: string, value?: string | null) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  return value ?? null;
}

export function visitorId() {
  let id = store("spark_vid");
  if (!id) {
    id = (crypto.randomUUID?.() || String(Math.random()).slice(2)) as string;
    store("spark_vid", id);
  }
  return id;
}

/** Traffic source: ?src=tiktok-ad1 (or ?utm_source=...). Remembered for this browser. */
export function trafficSrc() {
  const p = new URLSearchParams(location.search);
  const fromUrl = (p.get("src") || p.get("utm_source") || "").trim().toLowerCase().slice(0, 100);
  if (fromUrl) store("spark_src", fromUrl);
  return fromUrl || store("spark_src") || "direct";
}

/** Test mode: add ?fast=1 to any link. One "day" becomes 2 minutes, the timer becomes 10 seconds. */
export function fastMode() {
  const p = new URLSearchParams(location.search);
  if (p.get("fast") === "1") store("spark_fast", "1");
  if (p.get("fast") === "0") store("spark_fast", null);
  return store("spark_fast") === "1";
}

export function track(
  name: "landing_view" | "spark_viewed" | "spark_submitted" | "timer_done",
  data: { entry_path?: "A" | "B" | null; spark_id?: number | null; meta?: Record<string, unknown> } = {},
) {
  const body = JSON.stringify({
    name, visitor_id: visitorId(), src: trafficSrc(), test: fastMode(), ...data,
  });
  try {
    fetch("/api/event", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
  } catch {}
}

export async function post<T = any>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
