// Sends data to / reads data from the Google Sheet (via its Apps Script web app).
// SHEET_URL and SHEET_SECRET are set in Vercel → Project → Settings → Environment Variables.
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const VARIANTS = ["a", "b", "c", "d"];

const clean = (v, max = 200) => String(v == null ? "" : v).slice(0, max);

function parseBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  return b && typeof b === "object" ? b : {};
}

async function callSheet(data) {
  if (!process.env.SHEET_URL) throw new Error("SHEET_URL is not set");
  const r = await fetch(process.env.SHEET_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ ...data, secret: process.env.SHEET_SECRET || "" }),
    redirect: "follow",
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { throw new Error("Sheet returned non-JSON: " + text.slice(0, 200)); }
  if (!json.ok) throw new Error("Sheet error: " + json.error);
  return json;
}

function common(b) {
  const out = { variant: clean(b.variant, 1), vid: clean(b.vid, 40), referrer: clean(b.referrer, 500) };
  for (const k of UTM_KEYS) out[k] = clean(b[k]);
  return out;
}

module.exports = { callSheet, parseBody, common, clean, VARIANTS };
