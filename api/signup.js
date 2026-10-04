const { callSheet, parseBody, common, clean, VARIANTS } = require("./_sheet");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const body = parseBody(req);
  // Hidden "website" field: humans never fill it in, spam bots do. Pretend it worked.
  if (body.website) return res.status(200).json({ ok: true });

  const b = common(body);
  const email = clean(body.email, 254).trim().toLowerCase();
  if (!VARIANTS.includes(b.variant)) return res.status(400).json({ ok: false, error: "bad variant" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ ok: false, error: "bad email" });

  try {
    await callSheet({
      type: "signup",
      ...b,
      email,
      help: clean(body.help, 50),
      chat: body.chat === true,
      invite: body.invite === true,
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
};
