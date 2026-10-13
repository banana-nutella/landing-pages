export const CONNECTION_TYPES = [
  "Shared mechanism",
  "Inverse",
  "Hidden assumption",
  "Combination",
  "Contradiction",
] as const;

export type ConnectionType = (typeof CONNECTION_TYPES)[number];

export const CONNECTION_TYPE_HINTS: Record<ConnectionType, string> = {
  "Shared mechanism": "different ideas, same underlying cause",
  Inverse: "one is the opposite of the other",
  "Hidden assumption": "both depend on something unstated",
  Combination: "A plus B makes something new",
  Contradiction: "these can't both be true",
};

export type Idea = {
  id: string;
  text: string;
  example?: boolean;
};

export type ConnectionStatus = "pending" | "accepted";

export type Connection = {
  id: string;
  type: ConnectionType;
  ideaIds: string[];
  why: string;
  confidence: number;
  status: ConnectionStatus;
};

/** What we remember about a rejected connection, so the AI can avoid similar ones. */
export type RejectedConnection = {
  type: ConnectionType;
  ideaTexts: string[];
  why: string;
};

export type Thread = {
  id: string;
  title: string;
  synthesis: string;
  ideaIds: string[];
  nextAction: string;
};

// Request/response shapes for the two API routes.

export type ConnectRequest = {
  ideas: Idea[];
  accepted: Connection[];
  rejected: RejectedConnection[];
};

export type ConnectResponse = { connections: Omit<Connection, "id" | "status">[] };

export type ConvergeRequest = {
  ideas: Idea[];
  accepted: Connection[];
};

export type ConvergeResponse = { threads: Omit<Thread, "id">[] };

export type ApiError = { error: string };
