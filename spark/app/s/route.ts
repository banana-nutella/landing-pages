import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";

// "Give me a spark": pick a random active spark and open it, keeping ?src=... etc.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const spark = await q1<{ slug: string }>(`select slug from sparks where active order by random() limit 1`);
  if (!spark) return NextResponse.redirect(new URL("/start" + url.search, url));
  return NextResponse.redirect(new URL(`/s/${spark.slug}${url.search}`, url));
}
export const dynamic = "force-dynamic";
