import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "spark_admin";

function sign(password: string) {
  return createHmac("sha256", password).update("spark-admin-v1").digest("hex");
}

export function adminConfigured() {
  return !!process.env.ADMIN_PASSWORD;
}

export function checkPassword(input: string) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const a = Buffer.from(sign(input));
  const b = Buffer.from(sign(pw));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setAdminCookie() {
  (await cookies()).set(COOKIE, sign(process.env.ADMIN_PASSWORD!), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
}

export async function isAdmin() {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return (await cookies()).get(COOKIE)?.value === sign(pw);
}

/** Use at the top of every admin page and admin action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
