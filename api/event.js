// Anonymous app usage events ("opened the app", "did a check-in", "did a rep").
// No check-in contents are ever sent — those stay on the user's phone.
const { callSheet, parseBody, clean } = require("./_sheet");

const EVENTS = ["onboard", "open", "checkin", "rep_done"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const b = parseBody(req);
  const event = clean(b.event, 20);
  const vid = clean(b.vid, 40);
  if (!EVENTS.includes(event) || !vid) return res.status(400).json({ ok: false });
  try {
    await callSheet({
      type: "event",
      event,
      vid,
      variant: clean(b.variant, 1),
      app_day: Math.max(0, Math.min(10000, parseInt(b.app_day, 10) || 0)),
      goal: clean(b.goal, 30),
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
};
