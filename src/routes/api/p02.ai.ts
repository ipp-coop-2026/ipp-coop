import { createFileRoute } from "@tanstack/react-router";
import { cleanRequest, fallback, parseModel, prompts, type AiRequest } from "@/lib/p02/ai-core";
import { AI_MODELS, aiKey, crossSite, takeAiQuota } from "@/lib/p03/desk-server";

// Team 2 (Launchpad) AI features.
//   POST /api/p02/ai  { task, text?, context? }  ->  { text, items?, model, source? }
// With ANTHROPIC_API_KEY set, Claude writes the suggestion; without it (or when the daily cap is
// used) the rules/template fallback answers, and `model: false` tells the page to say so.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

async function callClaude(r: AiRequest, apiKey: string) {
  const { system, user } = prompts(r);
  let last = "no model available";
  for (const model of AI_MODELS) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (res.status === 404 || res.status === 400) {
      last = `model ${model} unavailable (${res.status})`;
      continue;
    }
    if (!res.ok) throw new Error(`AI service error ${res.status}`);
    const body = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (body.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    return parseModel(r, text, model);
  }
  throw new Error(last);
}

export const Route = createFileRoute("/api/p02/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (crossSite(request)) return json({ error: "Cross-site requests are not allowed." }, 403);
        const raw = await request.text();
        if (raw.length > 8000) return json({ error: "Request too large." }, 413);
        let r: AiRequest | null = null;
        try {
          r = cleanRequest(JSON.parse(raw || "{}"));
        } catch {
          return json({ error: "Send a JSON body." }, 400);
        }
        if (!r) return json({ error: "Unknown task." }, 400);
        const key = aiKey();
        let reason = key ? "" : "no key";
        if (key) {
          if (await takeAiQuota(request)) {
            try {
              return json(await callClaude(r, key));
            } catch (e) {
              reason = e instanceof Error ? e.message : "model error";
            }
          } else reason = "AI limit reached";
        }
        // `reason` says why the rules answer was used (shown in the AI review log detail, never secret).
        return json({ ...fallback(r), reason });
      },
    },
  },
});
