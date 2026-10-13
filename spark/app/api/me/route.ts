import { NextResponse } from "next/server";
import { q1 } from "@/lib/db";
import { sendMagicLink } from "@/lib/email";
import { clean, isEmail } from "@/lib/util";

// "Email me my link". Always answers the same way so nobody can probe which emails exist.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = clean(b.email, 200).toLowerCase();
  if (!isEmail(email)) return NextResponse.json({ error: "That email doesn't look quite right." }, { status: 400 });
  const user = await q1<any>(`select * from users where email=$1`, [email]);
  if (user) await sendMagicLink(user);
  return NextResponse.json({ ok: true });
}
