import "server-only";
import { z } from "zod";
import { callStructured } from "./ai";
import {
  CONNECTION_TYPES,
  CONNECTION_TYPE_HINTS,
  type Connection,
  type ConnectResponse,
  type ConvergeResponse,
  type Idea,
  type RejectedConnection,
} from "./types";

// Ideas are shown to the model as short labels (I1, I2, ...) rather than their
// storage ids: shorter, and much less likely to be mistyped.
function labelIdeas(ideas: Idea[]) {
  const toId = new Map<string, string>();
  const toLabel = new Map<string, string>();
  ideas.forEach((idea, i) => {
    const label = `I${i + 1}`;
    toId.set(label, idea.id);
    toLabel.set(idea.id, label);
  });
  const list = ideas.map((idea) => `${toLabel.get(idea.id)}: ${idea.text}`).join("\n");
  return { toId, toLabel, list };
}

function badLabels(labels: string[], toId: Map<string, string>) {
  return labels.filter((l) => !toId.has(l));
}

type ConnectionRef = Pick<Connection, "type" | "ideaIds" | "why">;

const typeList = CONNECTION_TYPES.map((t) => `- ${t}: ${CONNECTION_TYPE_HINTS[t]}`).join("\n");

/* ------------------------------- Connect -------------------------------- */

const ConnectionsSchema = z.object({
  connections: z
    .array(
      z.object({
        type: z.enum(CONNECTION_TYPES),
        idea_ids: z.array(z.string()).min(2).max(3).describe("Labels like I3, 2 or 3 of them"),
        why: z.string().describe("One plain-language sentence naming the specific mechanism or assumption"),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(12),
});

const CONNECT_SYSTEM = `You are Threadline, a thinking partner for convergent thinkers. The user has dumped a set of raw ideas. Your job is to find NON-OBVIOUS connections between them and explain each one precisely.

Every connection has exactly one of these five types:
${typeList}

What makes a good connection:
- It links ideas that look unrelated on the surface. A smart person reading the list would not have spotted it on their own.
- It names the specific mechanism, cause, or unstated assumption. "Both rely on loss aversion: the streak and the sunk onboarding call each make quitting feel like losing something already paid for" is good. "Both are about retention" is useless.
- It would change how the user thinks about at least one of the ideas.

Reject these (do not return them):
- Links based on a shared keyword, shared topic, or shared category ("both are pricing ideas").
- Restatements of one idea in terms of another.
- Vague links where the "why" could apply to almost any pair of ideas.
- Anything that closely resembles a connection the user has already rejected or already accepted.

Rules:
- Each connection involves 2 or 3 ideas, referenced by their labels (I1, I2, ...). Use only labels that appear in the list.
- "why" is ONE sentence in plain language, no jargon without explanation, under 40 words.
- "confidence" (0 to 1) is how sure you are that the link is real AND non-trivial. Be calibrated: most should fall between 0.4 and 0.85.
- Spread across types where the ideas genuinely support it, but never force a type.
- Return between 5 and 12 connections if that many good ones exist. If fewer than 5 good connections exist, return fewer. Quality beats quantity; an empty list is acceptable.
- Order by confidence, highest first.`;

export async function findConnections(
  ideas: Idea[],
  accepted: ConnectionRef[],
  rejected: RejectedConnection[],
): Promise<ConnectResponse> {
  const { toId, toLabel, list } = labelIdeas(ideas);

  const acceptedText = accepted
    .map((c) => `- [${c.type}] ${c.ideaIds.map((id) => toLabel.get(id) ?? "?").join(" + ")}: ${c.why}`)
    .join("\n");
  const rejectedText = rejected
    .map((r) => `- [${r.type}] "${r.ideaTexts.join('" + "')}": ${r.why}`)
    .join("\n");

  const prompt = [
    `<ideas>\n${list}\n</ideas>`,
    accepted.length
      ? `<already_accepted>\nThe user already has these. Do not repeat them.\n${acceptedText}\n</already_accepted>`
      : "",
    rejected.length
      ? `<rejected>\nThe user rejected these as weak or wrong. Do not suggest anything similar: avoid the same reasoning, not just the same idea pairs. Use them to infer what this user finds obvious or unconvincing.\n${rejectedText}\n</rejected>`
      : "",
    "Find the connections.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callStructured({
    system: CONNECT_SYSTEM,
    prompt,
    schema: ConnectionsSchema,
    check: ({ connections }) => {
      for (const c of connections) {
        const bad = badLabels(c.idea_ids, toId);
        if (bad.length) return `unknown idea labels: ${bad.join(", ")}. Use only I1 to I${ideas.length}.`;
        if (new Set(c.idea_ids).size !== c.idea_ids.length) return "a connection lists the same idea twice.";
      }
      return null;
    },
  });

  return {
    connections: result.connections
      .map((c) => ({
        type: c.type,
        ideaIds: c.idea_ids.map((l) => toId.get(l)!),
        why: c.why.trim(),
        confidence: c.confidence,
      }))
      .sort((a, b) => b.confidence - a.confidence),
  };
}

/* ------------------------------- Converge ------------------------------- */

const ThreadsSchema = z.object({
  threads: z
    .array(
      z.object({
        title: z.string().describe("Short, specific, under 8 words"),
        synthesis: z.string().describe("2-3 sentences"),
        idea_ids: z.array(z.string()).min(1).describe("Labels like I3"),
        next_action: z.string().describe("One concrete thing to do this week"),
      }),
    )
    .min(1)
    .max(3),
});

const CONVERGE_SYSTEM = `You are Threadline, a thinking partner for convergent thinkers. The user has a list of raw ideas and a set of connections between them that they have reviewed and accepted. Your job is to converge: find the strongest threads running through those connections.

A thread is a single direction worth pursuing that pulls several ideas and connections together. It is not a summary of one connection.

For each thread:
- title: short and specific, under 8 words. No generic titles like "Improving retention".
- synthesis: 2-3 sentences. Say what the thread is, why the accepted connections point to it, and what it implies that none of the individual ideas said on their own.
- idea_ids: the labels (I1, I2, ...) of the ideas it draws on. Use only labels from the list.
- next_action: one concrete, small action the user could take this week to test or advance the thread. Specific enough to put in a calendar ("Interview 5 users who churned in week 2 about...") not a goal ("Explore pricing").

Return the top 3 threads, strongest first. Strength means: supported by several accepted connections, actionable, and likely to matter. Threads should be clearly distinct from each other. If the accepted connections only support 1 or 2 genuine threads, return fewer.`;

export async function convergeThreads(ideas: Idea[], accepted: ConnectionRef[]): Promise<ConvergeResponse> {
  const { toId, toLabel, list } = labelIdeas(ideas);
  const acceptedText = accepted
    .map((c) => `- [${c.type}] ${c.ideaIds.map((id) => toLabel.get(id) ?? "?").join(" + ")}: ${c.why}`)
    .join("\n");

  const prompt = `<ideas>\n${list}\n</ideas>\n\n<accepted_connections>\n${acceptedText}\n</accepted_connections>\n\nFind the strongest threads.`;

  const result = await callStructured({
    system: CONVERGE_SYSTEM,
    prompt,
    schema: ThreadsSchema,
    effort: "medium",
    check: ({ threads }) => {
      for (const t of threads) {
        const bad = badLabels(t.idea_ids, toId);
        if (bad.length) return `unknown idea labels: ${bad.join(", ")}. Use only I1 to I${ideas.length}.`;
      }
      return null;
    },
  });

  return {
    threads: result.threads.map((t) => ({
      title: t.title.trim(),
      synthesis: t.synthesis.trim(),
      ideaIds: [...new Set(t.idea_ids)].map((l) => toId.get(l)!),
      nextAction: t.next_action.trim(),
    })),
  };
}
