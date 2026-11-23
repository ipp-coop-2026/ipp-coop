import { createFileRoute } from "@tanstack/react-router";
import { apply, validate, writeStatus, WriteRefused } from "@/lib/p03/shared-write";

// P03 writes to the shared database (listing_reviews, listings).
//   GET  /api/p03/review   { enabled, scope }   whether this host can write, and where
//   POST /api/p03/review   { action: "decide" | "publish" | "close" | "withdraw", opportunity_id, ... }
// Off unless P03_TEAM_KEY is set on the host; sandbox only (OP-999) unless P03_WRITE_SCOPE=all.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const Route = createFileRoute("/api/p03/review")({
  server: {
    handlers: {
      GET: () => json(writeStatus()),
      POST: async ({ request }) => {
        const text = await request.text();
        if (text.length > 4000) return json({ error: "Request too large." }, 413);
        try {
          const action = validate(JSON.parse(text || "{}"), writeStatus().scope);
          return json(await apply(action));
        } catch (e) {
          if (e instanceof WriteRefused) return json({ error: e.message }, e.status);
          if (e instanceof SyntaxError) return json({ error: "Send a JSON body." }, 400);
          return json({ error: e instanceof Error ? e.message : "The change failed." }, 500);
        }
      },
    },
  },
});
