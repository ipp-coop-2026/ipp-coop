import { createFileRoute } from "@tanstack/react-router";
import {
  crossSite,
  deskView,
  handleAdmin,
  handleAsk,
  readDesk,
  underIpLimit,
} from "@/lib/p03/desk-server";

// P03 Internship Desk API.
//   GET  /api/desk/state   policy entries, open and resolved cases, unanswered questions
//   POST /api/desk/ask     { role: "student" | "supervisor", question, session }
//   POST /api/desk/admin   { action: "resolve" | "add_entry" | "reset", ... } (Career Services)

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

export const Route = createFileRoute("/api/desk/$action")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (params.action !== "state") return json({ error: "Not found." }, 404);
        try {
          return json(deskView(await readDesk()));
        } catch {
          return json({ error: "The desk store is not reachable." }, 503);
        }
      },
      POST: async ({ request, params }) => {
        if (crossSite(request)) return json({ error: "Cross-site requests are not allowed." }, 403);
        const kind = params.action === "admin" ? "admin" : "ask";
        if (!(await underIpLimit(request, kind)))
          return json({ error: "Too many requests from this network. Try again in an hour." }, 429);
        const text = await request.text();
        if (text.length > 8000) return json({ error: "Message too large." }, 413);
        let body: Record<string, unknown>;
        try {
          body = JSON.parse(text);
        } catch {
          return json({ error: "Send a JSON body." }, 400);
        }
        try {
          if (params.action === "admin") return json(await handleAdmin(body));
          if (params.action === "ask") {
            const r = await handleAsk(body, request);
            return json(r.body, r.status);
          }
          return json({ error: "Not found." }, 404);
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "Request failed." }, 400);
        }
      },
    },
  },
});
