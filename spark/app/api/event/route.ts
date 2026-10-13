import { NextResponse } from "next/server";
import { logEvent } from "@/lib/events";
import { clean } from "@/lib/util";

// Events the browser is allowed to log. The rest are logged by the server.
const CLIENT_EVENTS = new Set(["landing_view", "spark_viewed", "spark_submitted", "timer_done"]);

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (!CLIENT_EVENTS.has(b.name)) return NextResponse.json({ ok: false }, { status: 400 });
  const path = b.entry_path === "A" || b.entry_path === "B" ? b.entry_path : null;
  await logEvent({
    name: b.name,
    visitor_id: clean(b.visitor_id, 64) || null,
    entry_path: path,
    spark_id: Number.isInteger(b.spark_id) ? b.spark_id : null,
    src: clean(b.src, 100) || null,
    is_test: !!b.test,
    meta: b.meta && typeof b.meta === "object" ? b.meta : null,
  });
  return NextResponse.json({ ok: true });
}
