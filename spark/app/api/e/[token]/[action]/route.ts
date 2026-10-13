import { NextResponse } from "next/server";
import { handleEmailAction } from "@/lib/email-actions";

// Buttons inside emails land here (via the /e/... page, or directly for one-click unsubscribe).
export async function POST(req: Request, ctx: { params: Promise<{ token: string; action: string }> }) {
  const { token, action } = await ctx.params;
  let body: any = {};
  if (req.headers.get("content-type")?.includes("application/json")) body = await req.json().catch(() => ({}));
  const res = await handleEmailAction(token, action, body);
  return NextResponse.json(res, { status: res.error ? 404 : 200 });
}
