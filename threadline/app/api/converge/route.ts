import { NextResponse } from "next/server";
import { z } from "zod";
import { convergeThreads } from "@/lib/threadline";
import { badRequest, ConnectionInput, errorResponse, IdeaInput } from "@/lib/route-helpers";

export const maxDuration = 120;

const Body = z.object({
  ideas: z.array(IdeaInput).max(200),
  accepted: z.array(ConnectionInput).max(100),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return badRequest("Invalid request body.");
  const { ideas, accepted } = body.data;
  if (accepted.length < 1) return badRequest("Accept at least one connection before converging.");

  try {
    const result = await convergeThreads(ideas, accepted);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
