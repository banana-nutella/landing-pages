"use client";

import { useEffect, useRef, useState } from "react";
import { EXAMPLE_IDEAS } from "@/lib/examples";
import {
  CONNECTION_TYPE_HINTS,
  type ApiError,
  type Connection,
  type ConnectionType,
  type ConnectRequest,
  type ConnectResponse,
  type ConvergeRequest,
  type ConvergeResponse,
  type Idea,
  type RejectedConnection,
  type Thread,
} from "@/lib/types";

/* ------------------------------ Persistence ------------------------------ */

const STORAGE_KEY = "threadline:v1";
const MAX_REJECTED = 50;

type State = {
  ideas: Idea[];
  connections: Connection[];
  rejected: RejectedConnection[];
  threads: Thread[];
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const exampleState = (): State => ({
  ideas: EXAMPLE_IDEAS.map((text) => ({ id: newId(), text, example: true })),
  connections: [],
  rejected: [],
  threads: [],
});

function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<State>;
      return {
        ideas: s.ideas ?? [],
        connections: s.connections ?? [],
        rejected: s.rejected ?? [],
        threads: s.threads ?? [],
      };
    }
  } catch {
    // Corrupt or unavailable storage: fall through to the examples.
  }
  return exampleState();
}

/** Split pasted text into one idea per non-empty line, dropping list markers. */
function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•–]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

async function postJson<Req, Res>(url: string, body: Req): Promise<Res> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the server. Is `npm run dev` still running?");
  }
  const data = (await res.json().catch(() => null)) as Res | ApiError | null;
  if (!res.ok || data === null) {
    throw new Error((data as ApiError | null)?.error ?? `Request failed (${res.status}).`);
  }
  return data as Res;
}

/* --------------------------------- App ---------------------------------- */

export default function Threadline() {
  const [state, setState] = useState<State | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [converging, setConverging] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [convergeError, setConvergeError] = useState<string | null>(null);

  useEffect(() => setState(loadState()), []);
  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: the app still works for this session.
    }
  }, [state]);

  if (!state) {
    return (
      <Shell>
        <div className="h-40 animate-pulse rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60" />
      </Shell>
    );
  }

  const { ideas, connections, rejected, threads } = state;
  const ideaById = new Map(ideas.map((i) => [i.id, i]));
  const accepted = connections.filter((c) => c.status === "accepted");
  const pending = connections.filter((c) => c.status === "pending");
  const hasExamples = ideas.some((i) => i.example);

  const update = (fn: (s: State) => State) => setState((s) => (s ? fn(s) : s));

  /* Ideas */
  const addIdeas = (texts: string[]) =>
    update((s) => ({ ...s, ideas: [...s.ideas, ...texts.map((text) => ({ id: newId(), text }))] }));

  const editIdea = (id: string, text: string) =>
    update((s) => ({ ...s, ideas: s.ideas.map((i) => (i.id === id ? { ...i, text } : i)) }));

  const removeIdeas = (ids: Set<string>) =>
    update((s) => ({
      ...s,
      ideas: s.ideas.filter((i) => !ids.has(i.id)),
      // A connection or thread built on a deleted idea no longer makes sense.
      connections: s.connections.filter((c) => !c.ideaIds.some((id) => ids.has(id))),
      threads: s.threads.filter((t) => !t.ideaIds.some((id) => ids.has(id))),
    }));

  const clearExamples = () => {
    removeIdeas(new Set(ideas.filter((i) => i.example).map((i) => i.id)));
    update((s) => ({ ...s, rejected: [] }));
  };

  const clearAll = () => {
    if (!confirm("Delete all ideas, connections and threads?")) return;
    setState({ ideas: [], connections: [], rejected: [], threads: [] });
  };

  /* Connections */
  const findConnections = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const data = await postJson<ConnectRequest, ConnectResponse>("/api/connect", {
        ideas: ideas.map(({ id, text }) => ({ id, text })),
        accepted,
        rejected,
      });
      update((s) => ({
        ...s,
        // New suggestions replace unreviewed ones; accepted connections are kept.
        connections: [
          ...s.connections.filter((c) => c.status === "accepted"),
          ...data.connections.map((c) => ({ ...c, id: newId(), status: "pending" as const })),
        ],
      }));
      if (data.connections.length === 0) {
        setConnectError("No strong connections found this time. Try adding more varied ideas.");
      }
    } catch (err) {
      setConnectError((err as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const acceptConnection = (id: string) =>
    update((s) => ({
      ...s,
      connections: s.connections.map((c) => (c.id === id ? { ...c, status: "accepted" } : c)),
    }));

  const rejectConnection = (conn: Connection) =>
    update((s) => ({
      ...s,
      connections: s.connections.filter((c) => c.id !== conn.id),
      rejected: [
        ...s.rejected,
        {
          type: conn.type,
          ideaTexts: conn.ideaIds.map((id) => ideaById.get(id)?.text ?? ""),
          why: conn.why,
        },
      ].slice(-MAX_REJECTED),
    }));

  const unacceptConnection = (id: string) =>
    update((s) => ({ ...s, connections: s.connections.filter((c) => c.id !== id) }));

  /* Threads */
  const converge = async () => {
    setConverging(true);
    setConvergeError(null);
    try {
      const data = await postJson<ConvergeRequest, ConvergeResponse>("/api/converge", {
        ideas: ideas.map(({ id, text }) => ({ id, text })),
        accepted,
      });
      update((s) => ({ ...s, threads: data.threads.map((t) => ({ ...t, id: newId() })) }));
    } catch (err) {
      setConvergeError((err as Error).message);
    } finally {
      setConverging(false);
    }
  };

  return (
    <Shell>
      {/* 1. Ideas */}
      <Section
        step={1}
        title="Ideas"
        count={ideas.length}
        action={
          ideas.length > 0 && !hasExamples ? (
            <button onClick={clearAll} className={linkButton}>
              Clear all
            </button>
          ) : null
        }
      >
        {hasExamples && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-amber-400/70 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <span>These are example ideas, so you can try it straight away.</span>
            <button
              onClick={clearExamples}
              className="shrink-0 rounded-lg bg-amber-200/70 px-2.5 py-1 font-medium hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30"
            >
              Clear
            </button>
          </div>
        )}

        <IdeaInput onAdd={addIdeas} />

        {ideas.length === 0 ? (
          <Empty>Add your first idea above. Paste a list to add one idea per line.</Empty>
        ) : (
          <ul className="mt-3 space-y-2">
            {ideas.map((idea, i) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                index={i + 1}
                onSave={(text) => editIdea(idea.id, text)}
                onDelete={() => removeIdeas(new Set([idea.id]))}
              />
            ))}
          </ul>
        )}

        <PrimaryButton
          className="mt-4"
          onClick={findConnections}
          disabled={ideas.length < 2 || connecting}
          loading={connecting}
          loadingText="Finding connections…"
        >
          {pending.length || accepted.length ? "Find more connections" : "Find connections"}
        </PrimaryButton>
        {ideas.length < 2 && <Hint>Add at least two ideas.</Hint>}
        {rejected.length > 0 && (
          <Hint>
            {rejected.length} rejected connection{rejected.length === 1 ? "" : "s"} will be passed to the AI as
            &ldquo;don&apos;t suggest anything like this&rdquo;.
          </Hint>
        )}
      </Section>

      {/* 2. Connections */}
      <Section step={2} title="Connections" count={connections.length}>
        {connectError && <ErrorBox message={connectError} onDismiss={() => setConnectError(null)} />}

        {connecting ? (
          <Skeletons count={3} label="Reading your ideas and looking for non-obvious links. This can take 20–60 seconds." />
        ) : connections.length === 0 ? (
          <Empty>Connections between your ideas will appear here.</Empty>
        ) : (
          <div className="space-y-5">
            {pending.length > 0 && (
              <div>
                <SubHeading>To review</SubHeading>
                <ul className="space-y-3">
                  {pending.map((c) => (
                    <ConnectionCard
                      key={c.id}
                      connection={c}
                      ideaById={ideaById}
                      ideas={ideas}
                      onAccept={() => acceptConnection(c.id)}
                      onReject={() => rejectConnection(c)}
                    />
                  ))}
                </ul>
              </div>
            )}
            {accepted.length > 0 && (
              <div>
                <SubHeading>Accepted</SubHeading>
                <ul className="space-y-3">
                  {accepted.map((c) => (
                    <ConnectionCard
                      key={c.id}
                      connection={c}
                      ideaById={ideaById}
                      ideas={ideas}
                      onRemove={() => unacceptConnection(c.id)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <PrimaryButton
          className="mt-4"
          onClick={converge}
          disabled={accepted.length === 0 || converging || connecting}
          loading={converging}
          loadingText="Converging…"
        >
          Converge
        </PrimaryButton>
        {accepted.length === 0 && connections.length > 0 && <Hint>Accept at least one connection to converge.</Hint>}
      </Section>

      {/* 3. Threads */}
      <Section step={3} title="Threads" count={threads.length}>
        {convergeError && <ErrorBox message={convergeError} onDismiss={() => setConvergeError(null)} />}
        {converging ? (
          <Skeletons count={2} label="Pulling your accepted connections into the strongest threads." />
        ) : threads.length === 0 ? (
          <Empty>The strongest threads through your accepted connections will appear here.</Empty>
        ) : (
          <ol className="space-y-3">
            {threads.map((t, i) => (
              <ThreadCard key={t.id} thread={t} rank={i + 1} ideaById={ideaById} ideas={ideas} />
            ))}
          </ol>
        )}
      </Section>
    </Shell>
  );
}

/* ------------------------------- Layout --------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Threadline</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Dump raw ideas. Find the non-obvious links. Converge on what matters.
          </p>
        </div>
        <ThemeToggle />
      </header>
      <main className="space-y-6">{children}</main>
    </div>
  );
}

function Section({
  step,
  title,
  count,
  action,
  children,
}: {
  step: number;
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <span className="flex size-6 items-center justify-center rounded-full bg-zinc-900 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
            {step}
          </span>
          {title}
          {count > 0 && <span className="text-sm font-normal text-zinc-400">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("threadline:theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-full border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

/* -------------------------------- Ideas --------------------------------- */

function IdeaInput({ onAdd }: { onAdd: (texts: string[]) => void }) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onAdd([text]);
    setValue("");
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!/\r?\n/.test(text.trim())) return; // Single line: let the browser paste normally.
    e.preventDefault();
    const lines = splitLines(text);
    if (lines.length) onAdd(lines);
  };

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        onPaste={onPaste}
        placeholder="Add an idea, press Enter"
        aria-label="New idea"
        className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-500 dark:focus:ring-zinc-100/10"
      />
      <button
        onClick={submit}
        disabled={!value.trim()}
        className="rounded-xl border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Add
      </button>
    </div>
  );
}

function IdeaCard({
  idea,
  index,
  onSave,
  onDelete,
}: {
  idea: Idea;
  index: number;
  onSave: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.setSelectionRange(draft.length, draft.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const save = () => {
    const text = draft.trim();
    if (text && text !== idea.text) onSave(text);
    else setDraft(idea.text);
    setEditing(false);
  };

  return (
    <li className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/50">
      <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-xs text-zinc-400">{index}</span>
      {editing ? (
        <textarea
          ref={ref}
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              save();
            } else if (e.key === "Escape") {
              setDraft(idea.text);
              setEditing(false);
            }
          }}
          aria-label="Edit idea"
          className="min-w-0 flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-2 py-1 text-base outline-none sm:text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      ) : (
        <p className="min-w-0 flex-1 text-sm leading-relaxed">
          {idea.text}
          {idea.example && (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
              example
            </span>
          )}
        </p>
      )}
      {!editing && (
        <div className="flex shrink-0 gap-1 sm:opacity-0 sm:transition sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <IconButton label="Edit idea" onClick={() => setEditing(true)}>
            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
          </IconButton>
          <IconButton label="Delete idea" onClick={onDelete}>
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
          </IconButton>
        </div>
      )}
    </li>
  );
}

/* ----------------------------- Connections ------------------------------ */

const TYPE_STYLES: Record<ConnectionType, string> = {
  "Shared mechanism": "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  Inverse: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  "Hidden assumption": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Combination: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Contradiction: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
};

function TypeBadge({ type }: { type: ConnectionType }) {
  return (
    <span
      title={CONNECTION_TYPE_HINTS[type]}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[type]}`}
    >
      {type}
    </span>
  );
}

function LinkedIdeas({ ids, ideaById, ideas }: { ids: string[]; ideaById: Map<string, Idea>; ideas: Idea[] }) {
  return (
    <ul className="space-y-1.5">
      {ids.map((id) => {
        const idea = ideaById.get(id);
        if (!idea) return null;
        return (
          <li key={id} className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <span className="mt-0.5 w-5 shrink-0 text-right font-mono text-xs text-zinc-400">
              {ideas.indexOf(idea) + 1}
            </span>
            <span>{idea.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ConnectionCard({
  connection: c,
  ideaById,
  ideas,
  onAccept,
  onReject,
  onRemove,
}: {
  connection: Connection;
  ideaById: Map<string, Idea>;
  ideas: Idea[];
  onAccept?: () => void;
  onReject?: () => void;
  onRemove?: () => void;
}) {
  const isAccepted = c.status === "accepted";
  return (
    <li
      className={`rounded-xl border p-3.5 ${
        isAccepted
          ? "border-emerald-300/70 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <TypeBadge type={c.type} />
        <span className="text-xs text-zinc-400" title="How confident the AI is that this link is real and non-obvious">
          {Math.round(c.confidence * 100)}% confident
        </span>
      </div>
      <LinkedIdeas ids={c.ideaIds} ideaById={ideaById} ideas={ideas} />
      <p className="mt-3 border-l-2 border-zinc-300 pl-3 text-sm font-medium leading-relaxed dark:border-zinc-600">
        {c.why}
      </p>
      <div className="mt-3 flex gap-2">
        {onAccept && (
          <button
            onClick={onAccept}
            className="flex-1 rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Accept
          </button>
        )}
        {onReject && (
          <button
            onClick={onReject}
            className="flex-1 rounded-lg border border-zinc-300 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Reject
          </button>
        )}
        {onRemove && (
          <button onClick={onRemove} className={linkButton}>
            Remove
          </button>
        )}
      </div>
    </li>
  );
}

/* -------------------------------- Threads -------------------------------- */

function ThreadCard({
  thread: t,
  rank,
  ideaById,
  ideas,
}: {
  thread: Thread;
  rank: number;
  ideaById: Map<string, Idea>;
  ideas: Idea[];
}) {
  return (
    <li className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-xs text-zinc-400">#{rank}</span>
        <h3 className="text-base font-semibold leading-snug">{t.title}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{t.synthesis}</p>
      <div className="mt-3">
        <SubHeading>Draws on</SubHeading>
        <LinkedIdeas ids={t.ideaIds} ideaById={ideaById} ideas={ideas} />
      </div>
      <div className="mt-3 rounded-lg bg-zinc-100 px-3 py-2.5 text-sm dark:bg-zinc-800/70">
        <span className="font-semibold">Next action: </span>
        {t.nextAction}
      </div>
    </li>
  );
}

/* ---------------------------- Small pieces ------------------------------ */

const linkButton =
  "rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100";

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  loadingText,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 ${className}`}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
      )}
      {loading ? loadingText : children}
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{children}</h3>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-zinc-400">{children}</p>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-center text-xs text-zinc-400">{children}</p>;
}

function ErrorBox({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200"
    >
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0 font-medium opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}

function Skeletons({ count, label }: { count: number; label: string }) {
  return (
    <div aria-busy="true">
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-800">
            <div className="h-4 w-28 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-3 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-3 w-3/5 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
