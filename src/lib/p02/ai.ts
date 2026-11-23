// Browser side of the Launchpad AI features. Calls /api/p02/ai; if the server is not reachable,
// answers with the same rules/template fallback, so the page always responds.
import { fallback, type AiAnswer, type AiRequest } from "./ai-core";
import { commit, logAi, type AiKind } from "./store";

export async function askAi(
  r: AiRequest,
  log?: { kind: AiKind; title: string },
): Promise<AiAnswer> {
  let answer: AiAnswer;
  try {
    const res = await fetch("/api/p02/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    });
    if (!(res.headers.get("content-type") ?? "").includes("json")) throw new Error("not json");
    const body = (await res.json()) as AiAnswer & { error?: string };
    if (!res.ok) throw new Error(body.error ?? String(res.status));
    answer = body;
  } catch {
    answer = fallback(r);
  }
  if (log) {
    const detail = answer.items?.length ? answer.items.join(", ") : answer.text;
    commit((s) =>
      logAi(s, {
        kind: log.kind,
        title: log.title,
        detail: detail.slice(0, 280),
        model: answer.model,
      }),
    );
  }
  return answer;
}

/** The label shown next to every AI output: honest about whether a model wrote it. */
export const aiLabel = (a: { model: boolean }) =>
  a.model ? "AI-generated" : "Rules-based suggestion";
