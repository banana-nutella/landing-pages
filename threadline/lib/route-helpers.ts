import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { UserFacingError } from "./ai";
import { CONNECTION_TYPES } from "./types";

export const IdeaInput = z.object({
  id: z.string().min(1),
  text: z.string().trim().min(1).max(2000),
});

export const ConnectionInput = z.object({
  type: z.enum(CONNECTION_TYPES),
  ideaIds: z.array(z.string()),
  why: z.string(),
});

export const RejectedInput = z.object({
  type: z.enum(CONNECTION_TYPES),
  ideaTexts: z.array(z.string()),
  why: z.string(),
});

export function errorResponse(err: unknown) {
  if (err instanceof UserFacingError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[threadline] unexpected error:", err);
  return NextResponse.json({ error: "Something went wrong on the server." }, { status: 500 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
