import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { runTick } from "@/lib/ladder";

// "Run the email checker now" from /admin/lab.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const onlyTest = new URL(req.url).searchParams.get("all") !== "1";
  return NextResponse.json(await runTick({ onlyTest }));
}
