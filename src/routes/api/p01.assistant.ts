import { createFileRoute } from "@tanstack/react-router";
import { GROQ_BACKUP_MODEL, GROQ_MODEL } from "@/lib/ai/chat";
import {
  buildPrompt,
  completeReply,
  parseAssistant,
  rulesReply,
  sanitizeFacts,
  sanitizeTurns,
  type AssistantReply,
  type AssistantTurn,
} from "@/lib/p01/assistant";
import type { Term } from "@/lib/p01/types";

// POST /api/p01/assistant  Body: { turns: [{role, content}], facts, vocab: [{skill_id, label, synonyms}] }
// GROQ_API_KEY stays on the server. Without it, or if the model fails, the answer comes from the rules.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const readKey = (): string | undefined =>
  typeof process !== "undefined" ? process.env?.["GROQ_API_KEY"] : undefined;

function sanitizeVocab(input: unknown): Term[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 80).flatMap((t: Partial<Term> | null) =>
    t && typeof t.skill_id === "string" && typeof t.label === "string"
      ? [
          {
            skill_id: t.skill_id.slice(0, 20),
            label: t.label.slice(0, 60),
            synonyms: Array.isArray(t.synonyms)
              ? t.synonyms
                  .filter((x): x is string => typeof x === "string")
                  .slice(0, 10)
                  .map((x) => x.slice(0, 40))
              : [],
          },
        ]
      : [],
  );
}

async function callModel(
  key: string,
  model: string,
  system: string,
  turns: AssistantTurn[],
  version: number,
): Promise<AssistantReply | "busy" | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
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
        messages: [{ role: "system", content: system }, ...turns],
      }),
    });
    if (res.status === 429) return "busy";
    if (!res.ok) {
      console.error("P01 assistant: model request failed", model, res.status);
      return null;
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parseAssistant(body.choices?.[0]?.message?.content ?? "", model, version);
  } catch (error) {
    console.error(
      "P01 assistant: model request error",
      model,
      error instanceof Error ? error.message : error,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const Route = createFileRoute("/api/p01/assistant")({
  server: {
    handlers: {
      GET: async () =>
        json({ ok: true, ai: Boolean(readKey()), model: readKey() ? GROQ_MODEL : null }),
      POST: async ({ request }) => {
        let body: { turns?: unknown; facts?: unknown; vocab?: unknown };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Send a JSON body." }, 400);
        }
        const turns = sanitizeTurns(body.turns);
        const last = turns[turns.length - 1];
        const facts = sanitizeFacts(body.facts);
        if (!last || last.role !== "user" || !last.content.trim())
          return json({ error: "Ask a question first." }, 400);
        if (!facts) return json({ error: "The profile could not be read." }, 400);
        const vocab = sanitizeVocab(body.vocab);
        const key = readKey();
        if (key) {
          const system = buildPrompt(facts, vocab);
          for (const model of [GROQ_MODEL, GROQ_BACKUP_MODEL]) {
            const reply = await callModel(key, model, system, turns, facts.version);
            if (reply === "busy") continue;
            if (reply) return json(completeReply(reply, last.content, facts, vocab));
            break;
          }
        }
        return json(rulesReply(last.content, facts, vocab));
      },
    },
  },
});
