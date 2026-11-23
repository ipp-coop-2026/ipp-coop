// P03 Internship Desk, server side. Used only by the /api/desk/* routes, never by the browser.
//
// Storage: if DESK_REDIS_URL is set (a server-side Redis REST endpoint that accepts
// POST {command, args}, e.g. Cohesivity edge Redis), desk records are shared by every visitor,
// so a case a student raises on a phone shows up on Sara's laptop. Without it, records live in
// the server's memory and reset when the server restarts. When the shared Supabase gives P03 a
// write key, this file is the one place to switch storage.
//
// AI: if ANTHROPIC_API_KEY is set, Claude Haiku reads the policy entries and sorts each message.
// Without it, the desk still answers by matching the policy entries.
import { adminAction, askClaude, decide, emptyDesk, record } from "./desk-core";

export const SESSION_LIMIT = 10;
const AI_DAILY_CAP_DEFAULT = 150;
/** Daily AI calls across the desk, the AI reviewer and Launchpad. Override with AI_DAILY_CAP on the host. */
const aiDailyCap = () => Number(env("AI_DAILY_CAP")) || AI_DAILY_CAP_DEFAULT;
const DESK_KEY = "ipp-coop:p03:desk";
const MODELS = ["claude-haiku-5-5", "claude-haiku-4-5"];

const env = (k: string): string | undefined => {
  // Cohesivity deploys put server secrets on globalThis.__IPP_ENV (deploy/cohesivity.mjs); other hosts use process.env.
  const injected = (globalThis as { __IPP_ENV?: Record<string, string> }).__IPP_ENV?.[k];
  if (injected) return injected;
  try {
    return typeof process !== "undefined" ? process.env?.[k] || undefined : undefined;
  } catch {
    return undefined;
  }
};

type Desk = ReturnType<typeof emptyDesk>;

const memory: { desk: Desk | null; counters: Map<string, number> } = {
  desk: null,
  counters: new Map(),
};

async function redis(command: string, args: unknown[]): Promise<unknown> {
  const url = env("DESK_REDIS_URL");
  if (!url) throw new Error("no redis");
  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "ipp-coop-desk/1.0" },
    body: JSON.stringify({ command, args }),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const j = (await r.json()) as { result?: unknown };
  return j.result;
}

const shared = () => Boolean(env("DESK_REDIS_URL"));

export async function readDesk(): Promise<Desk> {
  if (shared()) {
    const v = await redis("GET", [DESK_KEY]);
    return typeof v === "string" ? (JSON.parse(v) as Desk) : emptyDesk();
  }
  return (memory.desk ??= emptyDesk());
}

async function writeDesk(d: Desk) {
  if (shared()) await redis("SET", [DESK_KEY, JSON.stringify(d)]);
  else memory.desk = d;
}

async function incr(key: string, ttlSeconds: number): Promise<number> {
  if (shared()) {
    const n = Number(await redis("INCR", [key]));
    if (n === 1) await redis("EXPIRE", [key, ttlSeconds]);
    return n;
  }
  const n = (memory.counters.get(key) ?? 0) + 1;
  memory.counters.set(key, n);
  return n;
}

export const deskView = (d: Desk) => ({
  ...d,
  ai: { enabled: Boolean(env("ANTHROPIC_API_KEY")) },
  shared: shared(),
});

export async function handleAdmin(body: unknown) {
  const d = adminAction(await readDesk(), body);
  await writeDesk(d);
  return deskView(d);
}

export type AskResult = { status: number; body: Record<string, unknown> };

/** One AI call against the shared daily cap (the desk and the AI reviewer share it). */
export async function takeAiQuota(): Promise<boolean> {
  try {
    return (
      (await incr(`${DESK_KEY}:ai:${new Date().toISOString().slice(0, 10)}`, 172800)) <=
      aiDailyCap()
    );
  } catch {
    return true;
  }
}

export const aiKey = () => env("ANTHROPIC_API_KEY");
export const AI_MODELS = MODELS;

export async function handleAsk(body: {
  role?: unknown;
  question?: unknown;
  session?: unknown;
}): Promise<AskResult> {
  const role = body.role === "supervisor" ? "supervisor" : "student";
  const question = String(body.question ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
  const session = String(body.session ?? "")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .slice(0, 64);
  if (!question) return { status: 400, body: { error: "Type a question first." } };
  if (!session) return { status: 400, body: { error: "Missing session." } };

  const used = await incr(`${DESK_KEY}:s:${session}`, 86400);
  if (used > SESSION_LIMIT)
    return {
      status: 429,
      body: {
        error: "You have used your 10 questions for this session. Start a new session to ask more.",
        remaining: 0,
      },
    };

  const desk = await readDesk();
  const apiKey = env("ANTHROPIC_API_KEY");
  let ai: Awaited<ReturnType<typeof askClaude>> | null = null;
  if (apiKey) {
    let allowed = true;
    try {
      allowed =
        (await incr(`${DESK_KEY}:ai:${new Date().toISOString().slice(0, 10)}`, 172800)) <=
        aiDailyCap();
    } catch {
      /* counter unavailable: allow */
    }
    if (allowed) {
      try {
        ai = await askClaude(role, question, desk.policy, { apiKey, models: MODELS });
      } catch {
        ai = null;
      }
    }
  }
  const res = decide(role, question, desk.policy, ai);
  const { desk: next, case_id } = record(desk, role, question, res);
  if (res.outcome !== "answered") await writeDesk(next);
  return {
    status: 200,
    body: {
      outcome: res.outcome,
      answer: res.answer,
      section: res.section,
      urgency: res.urgency,
      summary: res.summary,
      source: res.source,
      model: ai?.model,
      remaining: SESSION_LIMIT - used,
      case_id,
    },
  };
}
