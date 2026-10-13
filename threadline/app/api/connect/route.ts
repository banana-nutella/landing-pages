import { NextResponse } from "next/server";
import { z } from "zod";
import { findConnections } from "@/lib/threadline";
import { badRequest, ConnectionInput, errorResponse, IdeaInput, RejectedInput } from "@/lib/route-helpers";

export const maxDuration = 120;

const Body = z.object({
  ideas: z.array(IdeaInput).max(200),
  accepted: z.array(ConnectionInput).default([]),
  rejected: z.array(RejectedInput).max(100).default([]),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return badRequest("Invalid request body.");
  const { ideas, accepted, rejected } = body.data;
  if (ideas.length < 2) return badRequest("Add at least two ideas to find connections.");

  try {
    const result = await findConnections(ideas, accepted, rejected);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
