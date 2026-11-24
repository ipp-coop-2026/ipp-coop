import { createFileRoute } from "@tanstack/react-router";
import { crossSite, takeGroqQuota } from "@/lib/p03/desk-server";
import {
  GROQ_BACKUP_MODEL,
  GROQ_MODEL,
  buildSystemPrompt,
  finalizeReply,
  findProfile,
  lookupReply,
  parseModelReply,
  sanitizeMessages,
  type ChatReply,
} from "@/lib/ai/chat";
import { buildListings, recommend } from "@/lib/ai/matching";
import type { IppData } from "@/lib/ipp-store";

// POST /api/chat
// Body: { messages: [{role, content}], profile_id?: string, data?: { opportunities, employers } }
// The Groq key is read from the server environment (GROQ_API_KEY) and never reaches the browser.
// Without a key, or if the model call fails, the route answers from the approved FAQ lookup.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

function storeSnapshot(input: unknown): Pick<IppData, "opportunities" | "employers"> | null {
  if (!input || typeof input !== "object") return null;
  const d = input as { opportunities?: unknown; employers?: unknown };
  if (!Array.isArray(d.opportunities) || !Array.isArray(d.employers)) return null;
  const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");
  type Row = Partial<Record<string, unknown>>;
  return {
    opportunities: d.opportunities.slice(0, 50).map((o: Row) => ({
      opportunity_id: str(o?.["opportunity_id"], 20),
      employer_id: str(o?.["employer_id"], 20),
      title: str(o?.["title"]),
      description: str(o?.["description"], 600),
      location: str(o?.["location"]),
      work_mode: (["On-site", "Hybrid", "Remote"].includes(str(o?.["work_mode"]))
        ? str(o?.["work_mode"])
        : "On-site") as "On-site",
      duration: str(o?.["duration"]),
      approval_status: str(o?.["approval_status"]) === "Approved" ? "Approved" : "Pending Review",
    })),
    employers: d.employers.slice(0, 50).map((e: Row) => ({
      employer_id: str(e?.["employer_id"], 20),
      organization_name: str(e?.["organization_name"]),
      hr_user_id: str(e?.["hr_user_id"], 20),
      hr_authorized: true,
    })),
  };
}

function readKey(): string | undefined {
  try {
    return typeof process !== "undefined" ? process.env?.["GROQ_API_KEY"] : undefined;
  } catch {
    return undefined;
  }
}

/** Calls one Groq model. Returns "rate-limited" on 429 so the caller can try the backup model. */
async function callModel(
  key: string,
  model: string,
  system: string,
  messages: { role: string; content: string }[],
): Promise<ChatReply | "rate-limited" | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_completion_tokens: 900,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (res.status === 429) {
      console.warn("Groq rate limit", model);
      return "rate-limited";
    }
    if (!res.ok) {
      console.error("Groq request failed", model, res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parseModelReply(body.choices?.[0]?.message?.content ?? "", model);
  } catch (error) {
    console.error("Groq request error", model, error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Main model first; on a rate limit, the smaller backup model (separate quota). */
async function askGroq(
  key: string,
  system: string,
  messages: { role: string; content: string }[],
): Promise<ChatReply | null> {
  for (const model of [GROQ_MODEL, GROQ_BACKUP_MODEL]) {
    const reply = await callModel(key, model, system, messages);
    if (reply === "rate-limited") continue;
    return reply;
  }
  return null;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: async () =>
        json({ ok: true, ai: Boolean(readKey()), model: readKey() ? GROQ_MODEL : null }),
      POST: async ({ request }) => {
        if (crossSite(request)) return json({ error: "Cross-site requests are not allowed." }, 403);
        const raw = await request.text();
        if (raw.length > 20000) return json({ error: "Request too large." }, 413);
        let body: { messages?: unknown; profile_id?: unknown; data?: unknown };
        try {
          body = JSON.parse(raw || "{}");
        } catch {
          return json({ error: "Send a JSON body." }, 400);
        }
        const messages = sanitizeMessages(body.messages);
        const last = [...messages].reverse().find((m) => m.role === "user");
        if (!last || !last.content.trim()) return json({ error: "Ask a question first." }, 400);

        const profile = findProfile(
          typeof body.profile_id === "string" ? body.profile_id : undefined,
        );
        const recs = recommend(profile, buildListings(storeSnapshot(body.data)));
        const key = readKey();
        if (key && (await takeGroqQuota(request))) {
          const reply = await askGroq(key, buildSystemPrompt(profile, recs), messages);
          if (reply) return json(finalizeReply(reply));
        }
        return json(lookupReply(last.content, profile, recs));
      },
    },
  },
});
