"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, requireAdmin, setAdminCookie } from "@/lib/admin";
import { q } from "@/lib/db";
import { createDemoData, deleteTestData } from "@/lib/demo";
import { createPlan } from "@/lib/plans";
import { clean, isEmail } from "@/lib/util";

export async function login(_: unknown, form: FormData) {
  if (!checkPassword(String(form.get("password") || ""))) return { error: "Wrong password." };
  await setAdminCookie();
  redirect("/admin");
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export async function saveSpark(_: unknown, form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const title = clean(form.get("title"), 200);
  const slug = slugify(clean(form.get("slug"), 80) || title);
  const type = form.get("type") === "video" ? "video" : "text";
  const content = clean(form.get("content"), 5000);
  const theme = clean(form.get("theme"), 200);
  const active = form.get("active") === "on";
  if (!title || !slug) return { error: "Add a title." };
  if (!content) return { error: type === "video" ? "Paste the video link." : "Write the spark text." };
  try {
    if (id) {
      await q(`update sparks set title=$2, slug=$3, type=$4, content=$5, theme=$6, active=$7, updated_at=now() where id=$1`,
        [id, title, slug, type, content, theme, active]);
    } else {
      await q(`insert into sparks (title, slug, type, content, theme, active) values ($1,$2,$3,$4,$5,$6)`,
        [title, slug, type, content, theme, active]);
    }
  } catch (e: any) {
    if (String(e?.message).includes("unique")) return { error: `Another spark already uses the link "/s/${slug}". Pick a different one.` };
    throw e;
  }
  revalidatePath("/admin/sparks");
  redirect("/admin/sparks?saved=1");
}

export async function deleteSpark(form: FormData) {
  await requireAdmin();
  await q(`delete from sparks where id=$1`, [Number(form.get("id"))]);
  redirect("/admin/sparks");
}

export async function seedDemo() {
  await requireAdmin();
  await createDemoData();
  redirect("/admin?data=test");
}

export async function clearTestData() {
  await requireAdmin();
  await deleteTestData();
  redirect("/admin");
}

export async function createTestPlan(_: unknown, form: FormData) {
  await requireAdmin();
  const email = clean(form.get("email"), 200);
  if (!isEmail(email)) return { error: "Enter an email you can check." };
  const num = (k: string, d: number) => {
    const n = Number(form.get(k));
    return form.get(k) !== "" && Number.isFinite(n) ? n : d;
  };
  const dayMinutes = Math.min(60, Math.max(1, num("day", 2)));
  const firstIn = Math.min(60, Math.max(0, num("first", 1)));
  await createPlan({
    email,
    action: clean(form.get("action"), 300) || "open the doc and write one sentence",
    cue: clean(form.get("cue"), 300) || "after I make coffee",
    tz: clean(form.get("tz"), 64) || "UTC",
    due_at: new Date(Date.now() + firstIn * 60_000),
    visitor_id: null, entry_path: "B", spark_id: null, src: "test-lab", own_spark: null,
    day_minutes: dayMinutes, is_test: true,
  });
  revalidatePath("/admin/lab");
  return { ok: `Test plan created. First email in about ${firstIn} minute(s), as long as auto-run is on.` };
}

export async function sendNextNow(form: FormData) {
  await requireAdmin();
  // Skip the wait: make this test plan's next email due now (and lift the 1-per-day gap).
  await q(`update plans set next_send_at=now(), last_sent_at=null where id=$1 and is_test and status='active'`, [Number(form.get("id"))]);
  revalidatePath("/admin/lab");
}
