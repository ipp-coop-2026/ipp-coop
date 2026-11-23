/**
 * Launchpad AI tasks (Team 2's AI features), shared by the server route and the tests.
 * Each task has a model prompt and a rules/template fallback, so the app works without a key.
 * The model only suggests: it never approves, shortlists or rejects anyone.
 */
import { FAQ, SKILLS } from "./data";

export type Task =
  | "chat"
  | "employer_chat"
  | "draft"
  | "improve"
  | "shorten"
  | "suggest_skills"
  | "analysis"
  | "questions"
  | "message";

export interface AiRequest {
  task: Task;
  /** Free text: the question, the current description, etc. */
  text?: string;
  /** Structured context: listing fields, applicant fields, employer data. Synthetic only. */
  context?: Record<string, unknown>;
}

export interface AiAnswer {
  text: string;
  items?: string[];
  model: boolean;
  source?: string;
}

export const TASKS: Task[] = [
  "chat",
  "employer_chat",
  "draft",
  "improve",
  "shorten",
  "suggest_skills",
  "analysis",
  "questions",
  "message",
];
const clip = (v: unknown, n: number) => String(v ?? "").slice(0, n);

export function cleanRequest(body: unknown): AiRequest | null {
  const b = (body ?? {}) as { task?: unknown; text?: unknown; context?: unknown };
  if (!TASKS.includes(b.task as Task)) return null;
  const context =
    b.context && typeof b.context === "object"
      ? (JSON.parse(clip(JSON.stringify(b.context), 4000)) as Record<string, unknown>)
      : {};
  return { task: b.task as Task, text: clip(b.text, 2000), context };
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z]{3,}/g) ?? []);

/** Best approved FAQ entry for a question, by word overlap. null when nothing fits. */
export function faqMatch(q: string): (typeof FAQ)[number] | null {
  const qw = words(q);
  let best: (typeof FAQ)[number] | null = null;
  let bestScore = 0;
  for (const f of FAQ) {
    const fw = words(f.q);
    const hit = [...fw].filter((w) => qw.has(w)).length / Math.max(fw.size, 1);
    if (hit > bestScore) {
      bestScore = hit;
      best = f;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

export const NO_ANSWER =
  "I don't have an approved answer for that. Please contact the co-op coordinator.";

/** Rules and templates used when no model key is set. Pure. */
interface Ctx {
  title?: unknown;
  company?: unknown;
  city?: unknown;
  required?: unknown;
  preferred?: unknown;
  skills?: unknown;
  name?: unknown;
  hr?: unknown;
}

export function fallback(r: AiRequest): AiAnswer {
  const c = (r.context ?? {}) as Ctx;
  const title = clip(c.title, 120) || "this placement";
  const company = clip(c.company, 120) || "our team";
  const req = (Array.isArray(c.required) ? c.required : []).map(String);
  const pref = (Array.isArray(c.preferred) ? c.preferred : []).map(String);
  switch (r.task) {
    case "chat": {
      const f = faqMatch(r.text ?? "");
      return f ? { text: f.a, model: false, source: f.q } : { text: NO_ANSWER, model: false };
    }
    case "employer_chat":
      return {
        text: "I can answer questions about your own listings and applicants. Ask about a listing, applicant counts or shortlists.",
        model: false,
      };
    case "draft":
      return {
        text: `${company} is looking for a ${title} to join the team${c.city ? ` in ${clip(c.city, 60)}` : ""}. You will work on real projects with support from an experienced supervisor.${req.length ? ` You will use ${req.join(", ")} every week.` : ""} At the end of the placement you will present what you built and what you learned.`,
        model: false,
      };
    case "improve":
      return {
        text: (r.text ?? "")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/(^|\.\s+)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase()),
        model: false,
      };
    case "shorten": {
      const sentences = (r.text ?? "").match(/[^.!?]+[.!?]/g) ?? [r.text ?? ""];
      return { text: sentences.slice(0, 2).join(" ").trim(), model: false };
    }
    case "suggest_skills": {
      const t = `${title} ${r.text ?? ""}`.toLowerCase();
      const pick = SKILLS.filter(
        (s) =>
          t.includes(s.toLowerCase()) ||
          (/data|analy|bi/.test(t) &&
            ["SQL", "Excel", "Python", "Data Visualization"].includes(s)) ||
          (/software|developer|frontend|engineer/.test(t) &&
            ["JavaScript", "React", "Git"].includes(s)) ||
          (/cloud/.test(t) && ["Python", "SQL", "Git", "Linux", "Cloud"].includes(s)),
      );
      return { text: "", items: [...new Set(pick)].slice(0, 5), model: false };
    }
    case "analysis": {
      const has = (Array.isArray(c.skills) ? c.skills : []).map((s) => String(s).toLowerCase());
      const met = req.filter((s) => has.includes(s.toLowerCase()));
      const missing = req.filter((s) => !has.includes(s.toLowerCase()));
      return {
        text: `${clip(c.name, 80) || "The applicant"} meets ${met.length} of ${req.length} required skills${met.length ? ` (${met.join(", ")})` : ""}.${missing.length ? ` Missing: ${missing.join(", ")}.` : ""}${pref.length ? ` Preferred skills held: ${pref.filter((s) => has.includes(s.toLowerCase())).join(", ") || "none"}.` : ""} Check the CV before deciding.`,
        model: false,
      };
    }
    case "questions":
      return {
        text: "",
        items: [
          ...req
            .slice(0, 2)
            .map((s) => `Tell us about a project where you used ${s}. What was hard?`),
          `Why does the ${title} role interest you?`,
          "Describe a time you got stuck. How did you get unstuck?",
        ],
        model: false,
      };
    case "message":
      return {
        text: `Dear ${clip(c.name, 80) || "applicant"},\n\nThank you for applying for the ${title} placement at ${company}. We would like to invite you to a short interview to learn more about your experience. Please reply with two times that suit you next week.\n\nKind regards,\n${clip(c.hr, 80) || "The hiring team"}`,
        model: false,
      };
  }
}

/** System and user prompts for the model. The context is synthetic demo data. */
export function prompts(r: AiRequest): { system: string; user: string } {
  const ctx = JSON.stringify(r.context ?? {});
  const rules =
    "Plain English, short sentences, no em dashes. Never invent facts. You only suggest; a person decides.";
  switch (r.task) {
    case "chat":
      return {
        system: `You are the IPP assistant for university students looking for co-op placements. Answer ONLY from this approved FAQ:\n${FAQ.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}\nIf the FAQ does not answer the question, reply exactly: "${NO_ANSWER}" ${rules}`,
        user: r.text ?? "",
      };
    case "employer_chat":
      return {
        system: `You help an employer understand ONLY their own listings and applicants, given as JSON. If asked about anything else, say you can only help with their own listings and applicants. Never shortlist or reject. ${rules}`,
        user: `Data: ${ctx}\nQuestion: ${r.text ?? ""}`,
      };
    case "draft":
      return {
        system: `Write a 3-4 sentence internship description from the fields given. ${rules}`,
        user: ctx,
      };
    case "improve":
      return {
        system: `Improve the wording of this internship description. Keep every fact, keep the length. Return only the new text. ${rules}`,
        user: r.text ?? "",
      };
    case "shorten":
      return {
        system: `Shorten this internship description to at most two sentences. Keep the key facts. Return only the new text. ${rules}`,
        user: r.text ?? "",
      };
    case "suggest_skills":
      return {
        system: `Suggest up to 5 skills for this internship, choosing only from: ${SKILLS.join(", ")}. Reply with a comma-separated list only.`,
        user: `${ctx}\n${r.text ?? ""}`,
      };
    case "analysis":
      return {
        system: `Summarise in 2-3 sentences how this applicant fits the listing: required skills met and missing, preferred skills, year of study. No recommendation to shortlist or reject. ${rules}`,
        user: ctx,
      };
    case "questions":
      return {
        system: `Write 4 interview questions for this applicant and listing, one per line, no numbering. ${rules}`,
        user: ctx,
      };
    case "message":
      return {
        system: `Draft a short, polite email from the employer to this applicant inviting them to an interview. ${rules}`,
        user: ctx,
      };
  }
}

/** Turns model text into the answer shape. Pure. */
export function parseModel(r: AiRequest, text: string, model: string): AiAnswer {
  const t = text.trim();
  if (r.task === "suggest_skills") {
    const allowed = new Map(SKILLS.map((s) => [s.toLowerCase(), s]));
    const items = t
      .split(/[,\n]/)
      .map((s) => allowed.get(s.trim().toLowerCase()))
      .filter((s): s is string => !!s);
    return { text: "", items: [...new Set(items)].slice(0, 5), model: true, source: model };
  }
  if (r.task === "questions")
    return {
      text: "",
      items: t
        .split("\n")
        .map((s) => s.replace(/^[-*\d.)\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 5),
      model: true,
      source: model,
    };
  return { text: t, model: true, source: model };
}
