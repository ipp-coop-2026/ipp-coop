/**
 * P01 profile assistant: a conversation about one student's own profile. It can explain the profile's status,
 * what is missing and what a person still decides, and it can propose changes to a draft. It never saves,
 * submits, reviews or verifies anything: the student applies a proposal, and people decide the rest.
 *
 * With a model key the server route asks a language model; without one, `rulesReply` answers from the same facts.
 */
import { FAQ } from "@/lib/ai/knowledge";
import { retrieveFaq } from "@/lib/ai/chat";
import { approvals, currentReviewed, latest, STATUS_LABEL, validateProfile } from "./rules";
import type { WorkArrangement } from "@/lib/db";
import type { P01State, ProfileContent, ProfilePatch, Term } from "./types";

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

export type AssistantKind = "answer" | "proposal" | "handoff";

export interface AssistantReply {
  answer: string;
  kind: AssistantKind;
  /** Where the answer comes from, e.g. "Profile v3", "Evidence", "FAQ-07". */
  sources: string[];
  patch?: ProfilePatch;
  mode: "ai" | "rules";
  model?: string;
}

/** Everything the assistant may use. Built in the browser; the server only passes it on. */
export interface AssistantFacts {
  student: string;
  student_id: string;
  version: number;
  status: string;
  editable: boolean;
  coordinator_comment: string | null;
  missing: string[];
  profile: ProfileContent;
  skills: {
    label: string;
    skill_id: string;
    source: string;
    evidence_id: string | null;
    evidence_outcome: string | null;
  }[];
  approvals: { step: string; who: string; state: string; detail: string }[];
  reviewed_version: number | null;
}

export function buildFacts(
  s: P01State,
  form: ProfileContent,
  vocab: readonly Term[],
  today: string,
): AssistantFacts {
  const v = latest(s);
  const name = (id: string) => vocab.find((t) => t.skill_id === id)?.label ?? id;
  return {
    student: v.full_name,
    student_id: v.student_id,
    version: v.profile_version,
    status: STATUS_LABEL[v.status],
    editable: v.status === "draft",
    coordinator_comment: v.coordinator_comment,
    missing: Object.values(validateProfile(form, today)),
    profile: form,
    skills: form.skills.map((x) => ({
      label: name(x.skill_id),
      skill_id: x.skill_id,
      source: x.source === "reviewed" ? "reviewed" : "self-declared",
      evidence_id: x.evidence_id,
      evidence_outcome:
        s.evidence.find((e) => e.evidence_id === x.evidence_id)?.review_outcome ?? null,
    })),
    approvals: approvals(s),
    reviewed_version: currentReviewed(s)?.profile_version ?? null,
  };
}

export const HANDOFF =
  "I don't have an approved answer for that, so I won't guess. I can send your question to the co-op office and a person will answer it.";

/** Recommendations belong to Team 5 and applications to Team 4; this assistant only covers the profile. */
export const ELSEWHERE =
  "I only look after your profile. Recommendations and applications are in Opportunities.";

export const STARTERS = [
  "What is missing from my profile?",
  "What still needs a person to approve?",
  "Why is Jira not verified?",
  "How do I get a skill reviewed?",
];

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const SECTORS = [
  "aviation",
  "logistics",
  "healthcare",
  "finance",
  "fintech",
  "energy",
  "public sector",
  "retail",
  "education",
  "technology",
];
const CITIES = ["Abu Dhabi", "Dubai", "Sharjah", "Al Ain", "Remote"];
const ROLES = [
  "data analyst",
  "operations analyst",
  "BI developer",
  "software engineer",
  "product analyst",
  "data engineer",
  "business analyst",
];

const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Finds dates such as "2027-02-01", "1 Feb 2027" or "June 2027" (end = last day of the month), in order. */
export function findDates(text: string, fallbackYear: number): { start: string; end: string }[] {
  const out: { at: number; start: string; end: string }[] = [];
  const isoRe = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
  for (let m = isoRe.exec(text); m; m = isoRe.exec(text))
    out.push({ at: m.index, start: m[0], end: m[0] });
  const wordRe = new RegExp(
    `\\b(?:(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?)?(${MONTHS.map((x) => `${x.slice(0, 3)}(?:${x.slice(3)})?`).join("|")})\\b\\.?(?:\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!\\d))?,?(?:\\s+(20\\d{2}))?`,
    "gi",
  );
  const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
  const defYear = years[0] ?? fallbackYear;
  for (let m = wordRe.exec(text); m; m = wordRe.exec(text)) {
    // "may" is usually a verb unless it has a day or a year next to it.
    if (/^may$/i.test(m[2]!) && !m[1] && !m[3] && !m[4]) continue;
    const month = MONTHS.findIndex((x) => x.startsWith(m![2]!.toLowerCase().slice(0, 3))) + 1;
    const year = m[4] ? Number(m[4]) : defYear;
    const day = Number(m[1] ?? m[3] ?? 0);
    if (day > lastDay(year, month)) continue;
    out.push({
      at: m.index,
      start: iso(year, month, day || 1),
      end: iso(year, month, day || lastDay(year, month)),
    });
  }
  return out.sort((a, b) => a.at - b.at).map(({ start, end }) => ({ start, end }));
}

/** Reads a change request from plain text. Returns null when there is nothing to change. */
export function parsePatch(
  message: string,
  vocab: readonly Term[],
  profile: ProfileContent,
): ProfilePatch | null {
  const text = message.trim();
  const low = text.toLowerCase();
  const p: ProfilePatch = {};
  const year = Number((profile.available_from ?? "").slice(0, 4)) || 2027;
  if (/\b(available|availability|free|start|from|until|till|to)\b/.test(low)) {
    const dates = findDates(text, year);
    if (dates.length >= 2) {
      p.available_from = dates[0]!.start;
      p.available_to = dates[1]!.end;
    } else if (dates.length === 1) {
      if (/\b(until|till|to|end)\b/.test(low)) p.available_to = dates[0]!.end;
      else p.available_from = dates[0]!.start;
    }
  }
  const wantsChange =
    /\b(add|i (?:also )?(?:know|can|use|learned|learnt)|include|put|interested in|want to work|would like to work|also)\b/.test(
      low,
    );
  if (wantsChange) {
    const sectors = SECTORS.filter(
      (x) => new RegExp(`\\b${x}\\b`).test(low) && !profile.sectors.includes(x),
    );
    if (sectors.length && /\b(sector|industry|work|interested)\b/.test(low))
      p.add_sectors = sectors;
    const cities = CITIES.filter(
      (c) => new RegExp(`\\b${c.toLowerCase()}\\b`).test(low) && !profile.locations.includes(c),
    );
    if (cities.length) p.add_locations = cities;
    const roles = ROLES.filter(
      (r) =>
        low.includes(r.toLowerCase()) &&
        !profile.roles.some((x) => x.toLowerCase() === r.toLowerCase()),
    );
    if (roles.length) p.add_roles = roles;
    const named = vocab
      .filter((t) =>
        [t.label, ...t.synonyms].some(
          (w) =>
            w.length > 2 &&
            new RegExp(
              `(^|[^a-z0-9])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`,
            ).test(low),
        ),
      )
      .filter((t) => !profile.skills.some((x) => x.skill_id === t.skill_id))
      // "aviation" is both a sector and a skill synonym; as a sector it was handled above.
      .filter((t) => !(p.add_sectors ?? []).some((x) => t.synonyms.includes(x)))
      .map((t) => t.label);
    if (named.length && /\b(skill|know|can|use|learned|learnt|add|include)\b/.test(low))
      p.add_skills = named;
  }
  const goal = /\b(?:my goal is|change my goal to|goal:|i want to learn)\s*(.+)$/i.exec(text);
  if (goal?.[1] && goal[1].trim().length >= 10) {
    const g = goal[1].trim().replace(/^to\s+/i, "");
    p.goals = /i want to learn/i.test(goal[0])
      ? `Learn ${g}`
      : g.charAt(0).toUpperCase() + g.slice(1);
  }
  return Object.keys(p).length ? p : null;
}

export function describePatch(p: ProfilePatch): string[] {
  const rows: string[] = [];
  if (p.goals) rows.push(`Learning goal: ${p.goals}`);
  if (p.add_sectors?.length) rows.push(`Add sector: ${p.add_sectors.join(", ")}`);
  if (p.add_roles?.length) rows.push(`Add role: ${p.add_roles.join(", ")}`);
  if (p.add_locations?.length) rows.push(`Add location: ${p.add_locations.join(", ")}`);
  if (p.work_arrangements?.length) rows.push(`Ways of working: ${p.work_arrangements.join(", ")}`);
  if (p.available_from) rows.push(`Available from: ${p.available_from}`);
  if (p.available_to) rows.push(`Available to: ${p.available_to}`);
  if (p.add_skills?.length) rows.push(`Add skill (self-declared): ${p.add_skills.join(", ")}`);
  return rows;
}

const profileSource = (f: AssistantFacts) => `Profile v${f.version}`;

/** Answers without a model, from the same facts. */
export function rulesReply(
  message: string,
  f: AssistantFacts,
  vocab: readonly Term[],
): AssistantReply {
  const low = message.toLowerCase();
  const base = { mode: "rules" as const };
  const isQuestion = /\?|^(what|why|which|who|how|when|where|is|are|do|does|can|should)\b/.test(
    low.trim(),
  );

  const asked = vocab.find(
    (t) =>
      f.skills.some((s) => s.skill_id === t.skill_id) &&
      [t.label, ...t.synonyms, t.skill_id.split("-")[1] ?? ""].some(
        (w) =>
          w.length > 1 &&
          new RegExp(`\\b${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(low),
      ),
  );
  if (asked && isQuestion && /(verif|review|evidence|self|trust|count|prove|status)/.test(low)) {
    const s = f.skills.find((x) => x.skill_id === asked.skill_id)!;
    const text =
      s.source === "reviewed"
        ? `${s.label} is reviewed with evidence ${s.evidence_id}.`
        : s.evidence_id
          ? `${s.label} is self-declared. Evidence ${s.evidence_id} is ${(s.evidence_outcome ?? "pending").replace("_", " ")}. It becomes reviewed only after P06 records it as demonstrated and a coordinator accepts it.`
          : `${s.label} is self-declared. It needs evidence that a P06 reviewer records as demonstrated, and then a coordinator accepts it.`;
    return { ...base, kind: "answer", answer: text, sources: [profileSource(f), "Evidence"] };
  }
  if (/\b(approv|human|person|who decides|still need|waiting on|waiting for)/.test(low)) {
    const open = f.approvals.filter((a) => a.state !== "done");
    return {
      ...base,
      kind: "answer",
      answer: [
        "People still decide these steps:",
        ...open.map((a) => `• ${a.step} (${a.who}): ${a.detail}`),
      ].join("\n"),
      sources: [profileSource(f), "Approvals"],
    };
  }
  if (/\b(missing|complete|incomplete|finish|ready to submit|fix)\b/.test(low) && isQuestion) {
    const answer = f.missing.length
      ? ["Before you can submit:", ...f.missing.map((m) => `• ${m}`)].join("\n")
      : `Nothing required is missing from version ${f.version}.${f.coordinator_comment ? ` The coordinator asked: “${f.coordinator_comment}”` : ""}`;
    return { ...base, kind: "answer", answer, sources: [profileSource(f)] };
  }
  if (
    /\b(internship|match|recommend|fit|suit|job|opportunit)/.test(low) &&
    isQuestion &&
    !/how (are|is)|apply/.test(low)
  ) {
    return { ...base, kind: "answer", answer: ELSEWHERE, sources: [profileSource(f)] };
  }
  if (/\b(status|comment|clarif|coordinator|happening)\b/.test(low) && isQuestion) {
    const answer = `Version ${f.version}: ${f.status}.${f.coordinator_comment ? ` Coordinator: “${f.coordinator_comment}”` : ""}${f.reviewed_version ? ` Version ${f.reviewed_version} is the one ready to hand over.` : " No version has been reviewed yet."}`;
    return { ...base, kind: "answer", answer, sources: [profileSource(f)] };
  }
  const patch = isQuestion ? null : parsePatch(message, vocab, f.profile);
  if (patch) return proposal(patch, f, base);
  const hit = retrieveFaq(message);
  if (hit) return { ...base, kind: "answer", answer: hit.entry.answer, sources: [hit.entry.id] };
  return { ...base, kind: "handoff", answer: HANDOFF, sources: [] };
}

/** The fixed sentence shown with every proposed change. */
function proposalText(f: AssistantFacts): string {
  const note = f.editable
    ? "Check it, then press Apply. Nothing is saved until you do."
    : `Version ${f.version} is locked (${f.status.toLowerCase()}). Start a new version to use this.`;
  return `I can change this in your draft. ${note}`;
}

function proposal(
  patch: ProfilePatch,
  f: AssistantFacts,
  base: { mode: "ai" | "rules"; model?: string },
): AssistantReply {
  return {
    ...base,
    kind: "proposal",
    answer: proposalText(f),
    sources: [profileSource(f)],
    patch,
  };
}

export function buildPrompt(f: AssistantFacts, vocab: readonly Term[]): string {
  return `You are the profile assistant in IPP, a university internship platform (classroom demo, synthetic data). You talk with one student about their own profile.

Rules:
1. Use only FACTS, SKILL LIST and FAQ below. If they do not answer the question, reply with kind "handoff" and this answer exactly: "${HANDOFF}"
2. If the student asks to change the profile (skills, dates, goal, sectors, roles, locations, ways of working), reply with kind "proposal" and a "patch". The student applies it; never say it is saved or submitted.
3. A patch may contain only: goals (string), add_sectors, add_roles, add_locations (string arrays), work_arrangements (from "on-site","hybrid","remote"), available_from, available_to (YYYY-MM-DD), add_skills (string array; use a label from SKILL LIST when one fits, otherwise the student's words). Leave out fields that do not change. When only a month is given, use its first day for available_from and its last day for available_to.
4. You cannot review, verify, approve, submit or place. A skill is reviewed only after a P06 reviewer records evidence as demonstrated and a coordinator accepts it. Never say the student is eligible, accepted or placed.
5. For internships, recommendations, applications or placement, reply exactly: "${ELSEWHERE}" You only look after the profile.
   When asked what people still approve or decide, list every step in FACTS.approvals that is not "done", with who decides it. When asked to do something people decide, say who decides it.
   Write IDs exactly as given, with plain hyphens.
6. Ask one short follow-up question when a request is unclear, for example a change without a value. Use the conversation so far.
7. Under 110 words, plain text, friendly and direct. Lists as lines starting with "• ".
8. Reply with JSON only: {"answer": string, "kind": "answer"|"proposal"|"handoff", "sources": string[], "patch"?: object}. sources is a list from: "Profile v${f.version}", "Evidence", "Approvals", or FAQ IDs.

FACTS:
${JSON.stringify(f)}

SKILL LIST: ${vocab.map((t) => t.label).join("; ")}

FAQ:
${FAQ.map((x) => `[${x.id}] ${x.question} ${x.answer}`).join("\n")}`;
}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
const list = (v: unknown, max = 5): string[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((x) => str(x, 60))
    .filter((x): x is string => !!x)
    .slice(0, max);
  return out.length ? out : undefined;
};
const date = (v: unknown): string | undefined => {
  const d = str(v, 10);
  return d && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) ? d : undefined;
};

/** Keeps only the fields a student may change. Status, evidence and review fields can never come from the model. */
export function sanitizePatch(input: unknown): ProfilePatch | null {
  if (!input || typeof input !== "object") return null;
  const r = input as Record<string, unknown>;
  const arrangements = list(r["work_arrangements"])?.filter(
    (a): a is WorkArrangement => a === "on-site" || a === "hybrid" || a === "remote",
  );
  const p: ProfilePatch = {};
  const goals = str(r["goals"], 400);
  if (goals) p.goals = goals;
  const sectors = list(r["add_sectors"]);
  if (sectors) p.add_sectors = sectors;
  const roles = list(r["add_roles"]);
  if (roles) p.add_roles = roles;
  const locations = list(r["add_locations"]);
  if (locations) p.add_locations = locations;
  if (arrangements?.length) p.work_arrangements = arrangements;
  const from = date(r["available_from"]);
  if (from) p.available_from = from;
  const to = date(r["available_to"]);
  if (to) p.available_to = to;
  const skills = list(r["add_skills"], 8);
  if (skills) p.add_skills = skills;
  return Object.keys(p).length ? p : null;
}

/** Models like typographic hyphens; IDs must stay searchable and exact. */
const plainHyphens = (t: string) => t.replace(/[\u2010\u2011]/g, "-");

const CLAIMS =
  /\b(you are|you're|you have been) (now )?(eligible|accepted|placed|approved|verified)\b/i;

/** Checks the model's JSON. Null means it broke the contract, so the caller answers from the rules. */
export function parseAssistant(
  content: string,
  model: string,
  version: number,
): AssistantReply | null {
  let raw: unknown;
  try {
    const a = content.indexOf("{");
    const b = content.lastIndexOf("}");
    raw = JSON.parse(a >= 0 && b > a ? content.slice(a, b + 1) : content);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const answer = plainHyphens(str(r["answer"], 1200) ?? "");
  if (!answer || CLAIMS.test(answer)) return null;
  const allowed = new Set([
    `Profile v${version}`,
    "Evidence",
    "Approvals",
    ...FAQ.map((x) => x.id),
  ]);
  const sources = (list(r["sources"], 6) ?? []).filter((x) => allowed.has(x));
  const patch = sanitizePatch(r["patch"]);
  if (r["kind"] === "proposal") {
    if (!patch) return { answer, kind: "answer", sources, mode: "ai", model };
    return { answer, kind: "proposal", sources, patch, mode: "ai", model };
  }
  if (r["kind"] === "handoff")
    return { answer: HANDOFF, kind: "handoff", sources: [], mode: "ai", model };
  return { answer, kind: "answer", sources, mode: "ai", model };
}

/** Adds what a model answer must not leave out: every open approval step. */
export function completeReply(
  r: AssistantReply,
  question: string,
  f: AssistantFacts,
  vocab: readonly Term[] = [],
): AssistantReply {
  // Before a person is asked, use the answer the page already has.
  if (r.kind === "handoff") {
    const own = rulesReply(question, f, vocab);
    return own.kind === "answer" ? own : r;
  }
  // A model may say a change is done; nothing is done until the student applies it.
  if (r.kind === "proposal") return { ...r, answer: proposalText(f) };
  if (r.kind !== "answer") return r;
  const lines = [r.answer];
  if (/\b(approv|decid|person to|human)/i.test(question)) {
    const low = r.answer.toLowerCase();
    const left = f.approvals.filter(
      (a) => a.state !== "done" && !low.includes(a.step.toLowerCase()),
    );
    lines.push(...left.map((a) => `• ${a.step} (${a.who}): ${a.detail}`));
  }
  return lines.length > 1 ? { ...r, answer: lines.join("\n") } : r;
}

export function sanitizeTurns(input: unknown): AssistantTurn[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is AssistantTurn =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }))
    .slice(-10);
}

/** Bounds what the browser may send before it reaches the model. */
export function sanitizeFacts(input: unknown): AssistantFacts | null {
  if (!input || typeof input !== "object") return null;
  const f = input as AssistantFacts;
  if (
    typeof f.version !== "number" ||
    typeof f.student_id !== "string" ||
    !f.profile ||
    !Array.isArray(f.skills) ||
    !Array.isArray(f.approvals) ||
    !Array.isArray(f.missing)
  )
    return null;
  if (!/^COOP-[A-Z]\d{3}$/.test(f.student_id) || JSON.stringify(f).length > 12_000) return null;
  return f;
}
