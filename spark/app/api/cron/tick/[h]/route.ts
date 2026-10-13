import { NextResponse } from "next/server";
import { runTick } from "@/lib/ladder";

// Vercel Cron calls /api/cron/tick/0 ... /api/cron/tick/23, one per hour of the day
// (24 daily jobs = an hourly check on the free plan).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await runTick());
}
export const maxDuration = 60;
