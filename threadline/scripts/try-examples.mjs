// Runs the example ideas through the full flow against a running dev server and
// prints what the AI returned, so you can judge output quality without clicking.
//   npm run dev            (in one terminal)
//   npm run try-examples   (in another)
// Accepts every connection with confidence >= 0.5, rejects the rest, runs Connect
// a second time with those rejections, then Converges.

const BASE = process.env.THREADLINE_URL ?? "http://localhost:3000";
const { EXAMPLE_IDEAS } = await import("../lib/examples.ts").catch(async () => {
  // Node without TS support: parse the array out of the source file.
  const fs = await import("node:fs/promises");
  const src = await fs.readFile(new URL("../lib/examples.ts", import.meta.url), "utf8");
  return { EXAMPLE_IDEAS: [...src.matchAll(/^\s*"(.*)",$/gm)].map((m) => m[1]) };
});

const ideas = EXAMPLE_IDEAS.map((text, i) => ({ id: `idea-${i + 1}`, text }));
const label = (id) => id.replace("idea-", "#");

async function post(path, body) {
  const t = Date.now();
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${data.error}`);
  console.log(`(${path} took ${((Date.now() - t) / 1000).toFixed(1)}s)\n`);
  return data;
}

function printConnections(list) {
  for (const c of list) {
    console.log(`[${c.type}] ${c.ideaIds.map(label).join(" + ")}  conf=${c.confidence}`);
    console.log(`  ${c.why}\n`);
  }
}

console.log("IDEAS");
ideas.forEach((i) => console.log(`  ${label(i.id)} ${i.text}`));
console.log("\n=== CONNECT, run 1 ===");
const run1 = await post("/api/connect", { ideas, accepted: [], rejected: [] });
printConnections(run1.connections);

const accepted = run1.connections.filter((c) => c.confidence >= 0.5);
const rejected = run1.connections
  .filter((c) => c.confidence < 0.5)
  .map((c) => ({ type: c.type, why: c.why, ideaTexts: c.ideaIds.map((id) => ideas.find((i) => i.id === id).text) }));

console.log(`=== CONNECT, run 2 (${accepted.length} accepted, ${rejected.length} rejected) ===`);
const run2 = await post("/api/connect", { ideas, accepted, rejected });
printConnections(run2.connections);

console.log("=== CONVERGE ===");
const { threads } = await post("/api/converge", { ideas, accepted });
for (const t of threads) {
  console.log(`## ${t.title}  (${t.ideaIds.map(label).join(", ")})`);
  console.log(`${t.synthesis}`);
  console.log(`Next: ${t.nextAction}\n`);
}
