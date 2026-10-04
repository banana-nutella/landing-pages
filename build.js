// Builds the site into /public. Vercel runs this automatically on every deploy.
// You shouldn't need to touch this file — edit copy.js instead.
const fs = require("fs");
const path = require("path");
const copy = require("./copy.js");

const out = path.join(__dirname, "public");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

const page = fs.readFileSync(path.join(__dirname, "src/page.html"), "utf8");
const helpChips = copy.helpOptions
  .map((o) => `<button type="button" class="chip" aria-pressed="false">${esc(o)}</button>`)
  .join("");

for (const [id, v] of Object.entries(copy.variants)) {
  const vars = {};
  for (const [k, val] of Object.entries(copy)) if (typeof val === "string") vars[k] = esc(val);
  const tags = (v.tags || []).map((t) => `<li>${esc(t)}</li>`).join("");
  const preview = fs.readFileSync(path.join(__dirname, `src/previews/${id}.html`), "utf8");
  Object.assign(vars, { headline: esc(v.headline), subline: esc(v.subline), variant: id, helpChips, tags, preview });
  fs.writeFileSync(path.join(out, `${id}.html`), fill(page, vars));
}

const names = Object.fromEntries(Object.entries(copy.variants).map(([id, v]) => [id, v.name]));
fs.writeFileSync(
  path.join(out, "stats.html"),
  fill(fs.readFileSync(path.join(__dirname, "src/stats.html"), "utf8"), {
    variantNames: JSON.stringify(names).replace(/</g, "\\u003c"),
  })
);
fs.copyFileSync(path.join(__dirname, "src/index.html"), path.join(out, "index.html"));
fs.cpSync(path.join(__dirname, "src/fonts"), path.join(out, "fonts"), { recursive: true });

console.log("Built variants:", Object.keys(copy.variants).join(", "));
