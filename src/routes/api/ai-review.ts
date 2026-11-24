import { createFileRoute } from "@tanstack/react-router";
import { cleanInput, reviewWithClaude } from "@/lib/p03/ai-review-core";
import { AI_MODELS, aiKey, crossSite, takeAiQuota } from "@/lib/p03/desk-server";

// P03 AI reviewer (Sprint 2).
//   POST /api/ai-review  { submission: {organization,title,description,location,work_mode,duration}, rules: string[] }
// Suggestions only: the coordinator still ticks every check and decides. Without
// ANTHROPIC_API_KEY on the host it answers 503 and the page keeps its rule-based hints.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const Route = createFileRoute("/api/ai-review")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (crossSite(request)) return json({ error: "Cross-site requests are not allowed." }, 403);
        const apiKey = aiKey();
        if (!apiKey)
          return json(
            {
              error:
                "The AI reviewer is switched off on this site. The rule-based hints still work.",
            },
            503,
          );
        const text = await request.text();
        if (text.length > 12000) return json({ error: "Submission too large." }, 413);
        let input: ReturnType<typeof cleanInput>;
        try {
          input = cleanInput(JSON.parse(text));
        } catch {
          return json({ error: "Send a JSON body." }, 400);
        }
        if (!input) return json({ error: "Nothing to review." }, 400);
        if (!(await takeAiQuota(request)))
          return json(
            { error: "The AI limit is used up for now. The rule-based hints still work." },
            429,
          );
        try {
          return json(await reviewWithClaude(input, { apiKey, models: AI_MODELS }));
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "The AI reviewer failed." }, 502);
        }
      },
    },
  },
});
