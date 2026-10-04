const { callSheet, parseBody, common, VARIANTS } = require("./_sheet");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const b = common(parseBody(req));
  if (!VARIANTS.includes(b.variant) || !b.vid) return res.status(400).json({ ok: false });
  try {
    await callSheet({ type: "visit", ...b });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
};
