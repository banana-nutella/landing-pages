const crypto = require("crypto");
const { callSheet } = require("./_sheet");

function same(a, b) {
  const x = crypto.createHash("sha256").update(String(a)).digest();
  const y = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const pw = process.env.STATS_PASSWORD;
  if (!pw || !same(req.headers["x-stats-password"] || "", pw)) return res.status(401).json({ ok: false });
  try {
    const d = await callSheet({ type: "stats" });
    res.status(200).json({ variants: d.variants, sources: d.sources });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
};
