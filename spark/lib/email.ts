import { q, q1 } from "./db";
import { logPlanEvent } from "./events";
import { baseUrl, escapeHtml, newToken } from "./util";
import { formatDay, formatWhen, nextFreshStart } from "./time";

export type NagKind = "reminder" | "restart" | "freshstart" | "final";

const FROM = () => process.env.EMAIL_FROM || "Spark <onboarding@resend.dev>";

/** One-minute version of their action, used in the "gentle restart" email. */
export const tinyVersion = (action: string) => `Just 1 minute of: ${action}`;

/** Their plan in their own words, e.g. "Tomorrow after coffee, I'll open the doc." */
export function planSentence(plan: { cue?: string | null; action: string }) {
  const cue = (plan.cue || "").trim().replace(/[.,]$/, "");
  return cue ? `${cue[0].toUpperCase()}${cue.slice(1)}, I'll ${plan.action}` : `I'll ${plan.action}`;
}

export function freshStartFor(plan: any, now = new Date()) {
  if (plan.day_minutes < 1440) {
    // Test mode: "Monday" is 2 test-days away.
    return { at: new Date(now.getTime() + 2 * plan.day_minutes * 60000), label: "Monday (test mode)" };
  }
  return nextFreshStart(now, new Date(plan.due_at), plan.tz);
}

type Built = { subject: string; intro: string; body: string[]; primary?: { label: string; action: string } };

function buildNag(kind: NagKind, plan: any): Built {
  const quote = `“${escapeHtml(planSentence(plan))}.”`;
  const action = escapeHtml(plan.action);
  switch (kind) {
    case "reminder":
      if (plan.completions > 0) {
        return {
          subject: `Again today? ${plan.action}`,
          intro: "Hi! It's your time again.",
          body: [
            `Your plan: ${quote}`,
            `You've done this ${plan.completions === 1 ? "once" : `${plan.completions} times`} already. Want to do your 10 minutes again? Even 2 minutes counts.`,
          ],
        };
      }
      return {
        subject: `It's time: ${plan.action}`,
        intro: "Hi! This is the moment you picked.",
        body: [
          `You said: ${quote}`,
          `Want to do it now? Ten minutes is plenty, and even two minutes counts.`,
        ],
      };
    case "restart":
      return {
        subject: "No big deal. Want to try the 1-minute version?",
        intro: "Hi! Quick, friendly check-in.",
        body: [
          `Missing a day is completely normal. It doesn't undo anything.`,
          `Here's a tiny restart, if you're up for it: <strong>${escapeHtml(tinyVersion(plan.action))}</strong>. One minute, then you're allowed to stop.`,
          `Your original plan was: ${quote}`,
        ],
      };
    case "freshstart": {
      const fs = freshStartFor(plan);
      const when = plan.day_minutes < 1440 ? fs.label : `${fs.label} (${formatDay(fs.at, plan.tz)})`;
      return {
        subject: `Fresh start on ${fs.label}?`,
        intro: "Hi! Some weeks just get away from us.",
        body: [
          `That's okay. ${escapeHtml(when)} is a clean slate, and a natural moment to begin again.`,
          `Want a reminder then, for the same thing? <strong>${action}</strong>`,
        ],
        primary: { label: `Yes, restart on ${fs.label.replace(" (test mode)", "")}`, action: "fresh" },
      };
    }
    case "final":
      return {
        subject: "Pause, or keep going?",
        intro: "Hi! We don't want to be one more email you skip.",
        body: [
          `This is our last note unless you tell us otherwise. Want to keep going with <strong>${action}</strong>, or pause for now?`,
          `Either one is a perfectly good answer.`,
        ],
        primary: { label: "Keep going", action: "keep" },
      };
  }
}

function button(href: string, label: string, color = "#ea580c") {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:10px;margin:4px 6px 4px 0">${label}</a>`;
}

function layout(inner: string) {
  return `<!doctype html><html><body style="margin:0;background:#fff7ed;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#1c1917">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
<div style="font-weight:800;font-size:18px;color:#ea580c;margin-bottom:18px">✦ Spark</div>
<div style="background:#fff;border-radius:16px;padding:24px;line-height:1.55;font-size:16px">${inner}</div>
</div></body></html>`;
}

export function renderNag(kind: NagKind, plan: any, emailToken: string) {
  const b = buildNag(kind, plan);
  const link = (a: string) => `${baseUrl()}/e/${emailToken}/${a}`;
  const buttons = [
    b.primary ? button(link(b.primary.action), b.primary.label) : "",
    button(link("did"), "I did it ✓", b.primary ? "#16a34a" : "#ea580c"),
    button(link("smaller"), "Make it smaller", "#78716c"),
  ].join("");
  const html = layout(
    `<p style="margin:0 0 14px">${b.intro}</p>` +
      b.body.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join("") +
      `<div style="margin:20px 0 8px">${buttons}</div>` +
      `<p style="margin:22px 0 0;font-size:13px;color:#78716c">` +
      `<a href="${link("pause")}" style="color:#78716c">Pause these emails</a> · ` +
      `<a href="${link("unsub")}" style="color:#78716c">Unsubscribe</a> · ` +
      `<a href="${link("open")}" style="color:#78716c">See my plan</a></p>`,
  );
  return { subject: b.subject, html };
}

async function deliver(to: string, subject: string, html: string, unsubUrl?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: "logged", error: null as string | null };
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: FROM(), to, subject, html,
      headers: unsubUrl
        ? { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    });
    if (error) return { status: "error", error: `${error.name}: ${error.message}` };
    return { status: "sent", error: null };
  } catch (e: any) {
    return { status: "error", error: String(e?.message || e) };
  }
}

/** Send one nag-ladder email for a plan and record it. */
export async function sendNag(kind: NagKind, plan: any) {
  const token = newToken(12);
  const { subject, html } = renderNag(kind, plan, token);
  const row = await q1<{ id: number }>(
    `insert into emails (token, plan_id, user_id, kind, to_email, subject, html)
     values ($1,$2,$3,$4,$5,$6,$7) returning id`,
    [token, plan.id, plan.user_id, kind, plan.email, subject, html],
  );
  const res = await deliver(plan.email, subject, html, `${baseUrl()}/api/e/${token}/unsub`);
  await q(`update emails set status=$2, error=$3 where id=$1`, [row!.id, res.status, res.error]);
  await logPlanEvent(plan, "nag_sent", { kind, status: res.status });
  return res;
}

/** The "here's your link" email for /me. */
export async function sendMagicLink(user: { id: number; email: string; token: string }) {
  const url = `${baseUrl()}/me/${user.token}`;
  const subject = "Your Spark link";
  const html = layout(
    `<p style="margin:0 0 14px">Here's your private link to see your plans. No password needed.</p>` +
      `<div style="margin:18px 0">${button(url, "Open my Spark")}</div>` +
      `<p style="margin:0;font-size:13px;color:#78716c">If you didn't ask for this, you can ignore it.</p>`,
  );
  const res = await deliver(user.email, subject, html);
  await q(
    `insert into emails (token, user_id, kind, to_email, subject, html, status, error) values ($1,$2,'magic_link',$3,$4,$5,$6,$7)`,
    [newToken(12), user.id, user.email, subject, html, res.status, res.error],
  );
  return res;
}

export { formatWhen };
