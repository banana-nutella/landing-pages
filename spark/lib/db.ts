// Database access. Uses Neon (Postgres) when DATABASE_URL is set.
// Without it, falls back to PGlite: a small Postgres that runs inside the app.
// That's fine for local testing and a first demo, but its data does NOT persist
// on Vercel, so production needs DATABASE_URL.
import { SEED_SPARKS } from "./seed-sparks";

type Row = Record<string, any>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

// Kept on globalThis because Next.js can load this file more than once in the same
// server (pages and API routes are bundled separately); they must share one database.
const g = globalThis as unknown as { __sparkDb?: { runner?: Promise<Runner>; schema?: Promise<void> | null } };
const state = (g.__sparkDb ??= {});

export const usingDemoDb = () => !process.env.DATABASE_URL;

async function makeRunner(): Promise<Runner> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    return (text, params = []) => sql.query(text, params as any[]) as Promise<Row[]>;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  // Locally, keep data in a folder between restarts. On Vercel, memory only.
  const dir = process.env.VERCEL ? undefined : process.env.PGLITE_DIR || ".pglite";
  const db = dir ? new PGlite(dir) : new PGlite();
  await db.waitReady;
  return async (text, params = []) => (await db.query<Row>(text, params as any[])).rows;
}

async function raw(text: string, params?: unknown[]) {
  if (!state.runner) state.runner = makeRunner();
  const run = await state.runner;
  return run(text, params);
}

const SCHEMA = [
  `create table if not exists sparks (
    id serial primary key,
    slug text unique not null,
    title text not null,
    type text not null default 'text',
    content text not null default '',
    theme text not null default '',
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists users (
    id serial primary key,
    email text unique not null,
    token text unique not null,
    unsubscribed boolean not null default false,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists plans (
    id serial primary key,
    token text unique not null,
    user_id int references users(id) on delete cascade,
    visitor_id text,
    entry_path text,
    spark_id int references sparks(id) on delete set null,
    src text,
    own_spark text,
    action text not null,
    original_action text,
    cue text,
    tz text not null default 'UTC',
    due_at timestamptz,
    stage text not null default 'reminder',
    next_send_at timestamptz,
    last_sent_at timestamptz,
    status text not null default 'active',
    fresh_start_used boolean not null default false,
    day_minutes int not null default 1440,
    is_test boolean not null default false,
    completions int not null default 0,
    last_done_at timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists plans_due_idx on plans (status, next_send_at)`,
  `create table if not exists completions (
    id serial primary key,
    plan_id int not null references plans(id) on delete cascade,
    rep int not null,
    after_nag boolean not null default false,
    via text,
    at timestamptz not null default now()
  )`,
  `create table if not exists emails (
    id serial primary key,
    token text unique not null,
    plan_id int references plans(id) on delete cascade,
    user_id int references users(id) on delete cascade,
    kind text not null,
    to_email text not null,
    subject text not null,
    html text not null,
    status text not null default 'pending',
    error text,
    clicked_at timestamptz,
    sent_at timestamptz not null default now()
  )`,
  `create table if not exists events (
    id bigserial primary key,
    at timestamptz not null default now(),
    name text not null,
    visitor_id text,
    plan_id int,
    entry_path text,
    spark_id int,
    src text,
    is_test boolean not null default false,
    meta jsonb
  )`,
  `create index if not exists events_name_idx on events (name, at)`,
];

async function ensureSchema() {
  for (const stmt of SCHEMA) await raw(stmt);
  const [{ n }] = await raw(`select count(*)::int as n from sparks`);
  if (n === 0) {
    for (const s of SEED_SPARKS) {
      await raw(
        `insert into sparks (slug, title, type, content, theme) values ($1,$2,$3,$4,$5) on conflict (slug) do nothing`,
        [s.slug, s.title, s.type, s.content, s.theme],
      );
    }
  }
}

/** Run a query and return all rows. */
export async function q<T = Row>(text: string, params?: unknown[]): Promise<T[]> {
  if (!state.schema) state.schema = ensureSchema().catch((e) => { state.schema = null; throw e; });
  await state.schema;
  return (await raw(text, params)) as T[];
}

/** Run a query and return the first row (or null). */
export async function q1<T = Row>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
