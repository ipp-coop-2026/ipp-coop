/**
 * P01 workflow rules: statuses, versions, access and evidence. Pure functions; nothing passed in is changed.
 *
 *   draft -> submitted -> reviewed
 *                      -> clarification_requested -> (new draft version) -> submitted ...
 *
 * A version's content is locked once it is submitted. Any later change is a new version, so every
 * recommendation or application can be traced to the exact version it used.
 */
import type {
  EvidenceItem,
  FieldErrors,
  OpenQuestion,
  P01Role,
  P01State,
  ProfileContent,
  ProfilePatch,
  ProfileStatus,
  ProfileVersion,
  SkillEntry,
  Term,
} from "./types";
import type { WorkArrangement } from "@/lib/db";

export const GOALS_MIN = 20;
export const GOALS_MAX = 400;
export const COMMENT_MIN = 10;
export const ARRANGEMENTS: WorkArrangement[] = ["on-site", "hybrid", "remote"];

export const STATUS_LABEL: Record<ProfileStatus, string> = {
  draft: "Draft",
  submitted: "Submitted for review",
  clarification_requested: "Clarification requested",
  reviewed: "Reviewed",
};

export type RuleCode = "access" | "status" | "stale" | "invalid" | "evidence" | "not_found";

/** A refused action. The message is shown to the user as it is. */
export class RuleError extends Error {
  readonly code: RuleCode;
  constructor(code: RuleCode, message: string) {
    super(message);
    this.name = "RuleError";
    this.code = code;
  }
}

/** What the page showed when the user pressed the button. Guards against acting on an old version. */
export interface Seen {
  profile_version: number;
  status: ProfileStatus;
}

export const latest = (s: P01State): ProfileVersion => s.versions[s.versions.length - 1]!;

/** The version P04 and P05 may use: the newest reviewed one, or null if none has been reviewed yet. */
export const currentReviewed = (s: P01State): ProfileVersion | null =>
  [...s.versions].reverse().find((v) => v.status === "reviewed") ?? null;

export const isEditable = (v: ProfileVersion): boolean => v.status === "draft";

function need(role: P01Role, required: P01Role, what: string) {
  if (role !== required)
    throw new RuleError(
      "access",
      required === "student"
        ? `Only the student can ${what}.`
        : `Only a university coordinator can ${what}.`,
    );
}

function checkSeen(v: ProfileVersion, seen: Seen) {
  if (v.profile_version !== seen.profile_version || v.status !== seen.status)
    throw new RuleError(
      "stale",
      `This profile changed while you had it open. It is now version ${v.profile_version} (${STATUS_LABEL[v.status].toLowerCase()}). Check it and try again.`,
    );
}

const replaceLatest = (s: P01State, v: ProfileVersion): P01State => ({
  ...s,
  versions: [...s.versions.slice(0, -1), v],
});

const log = (
  s: P01State,
  actor: P01State["events"][number]["actor"],
  action: string,
  at: string,
  version: number | null,
): P01State => ({ ...s, events: [...s.events, { at, actor, action, profile_version: version }] });

const isDate = (d: string | null): d is string =>
  !!d &&
  /^\d{4}-\d{2}-\d{2}$/.test(d) &&
  !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) &&
  new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

/** Required fields and date ranges. An empty result means the profile can be submitted. */
export function validateProfile(c: ProfileContent, today: string): FieldErrors {
  const e: FieldErrors = {};
  const goals = c.goals.trim();
  if (!goals) e.goals = "Write what you want to learn. A coordinator reads this first.";
  else if (goals.length < GOALS_MIN)
    e.goals = `Say a little more about your goal (at least ${GOALS_MIN} characters).`;
  else if (goals.length > GOALS_MAX) e.goals = `Keep the goal under ${GOALS_MAX} characters.`;
  if (!c.sectors.length) e.sectors = "Add at least one sector.";
  if (!c.roles.length) e.roles = "Add at least one role.";
  if (!c.locations.length) e.locations = "Add at least one location.";
  if (!c.work_arrangements.length) e.work_arrangements = "Choose at least one way of working.";
  if (!isDate(c.available_from)) e.available_from = "Enter the first date you are available.";
  if (!isDate(c.available_to)) e.available_to = "Enter the last date you are available.";
  if (isDate(c.available_from) && isDate(c.available_to)) {
    if (c.available_to <= c.available_from)
      e.available_to = "The last date must be after the first date.";
    else if (c.available_to < today)
      e.available_to = "Your availability is already over. Enter a future date.";
  }
  if (!c.skills.length) e.skills = "Add at least one skill from the shared list.";
  return e;
}

export const contentOf = (v: ProfileVersion): ProfileContent => ({
  goals: v.goals,
  sectors: v.sectors,
  roles: v.roles,
  locations: v.locations,
  work_arrangements: v.work_arrangements,
  available_from: v.available_from,
  available_to: v.available_to,
  skills: v.skills,
  unmapped_skills: v.unmapped_skills,
});

const cleanList = (list: string[]): string[] => {
  const seen = new Set<string>();
  return list
    .map((x) => x.trim())
    .filter((x) => x && !seen.has(x.toLowerCase()) && !!seen.add(x.toLowerCase()));
};

/**
 * Students may add, remove or keep skills, but a skill only counts as reviewed if it was already
 * reviewed on the version this draft started from. Anything else is put back to self-declared.
 */
function protectSkills(edited: SkillEntry[], base: SkillEntry[]): SkillEntry[] {
  const before = new Map(base.map((x) => [x.skill_id, x]));
  const seen = new Set<string>();
  return edited
    .filter((x) => !seen.has(x.skill_id) && !!seen.add(x.skill_id))
    .map((x) => {
      const was = before.get(x.skill_id);
      if (was) return was;
      return {
        ...x,
        source: "self_declared" as const,
        evidence_id: null,
        review_date: null,
        reviewer: null,
      };
    });
}

function cleanContent(c: ProfileContent, base: SkillEntry[]): ProfileContent {
  return {
    goals: c.goals.trim(),
    sectors: cleanList(c.sectors),
    roles: cleanList(c.roles),
    locations: cleanList(c.locations),
    work_arrangements: ARRANGEMENTS.filter((a) => c.work_arrangements.includes(a)),
    available_from: c.available_from || null,
    available_to: c.available_to || null,
    skills: protectSkills(c.skills, base),
    unmapped_skills: cleanList(c.unmapped_skills),
  };
}

/** Skills as they stood on the newest version before the open draft. */
const baseSkills = (s: P01State): SkillEntry[] => {
  const v = latest(s);
  if (v.status !== "draft") return v.skills;
  return s.versions[s.versions.length - 2]?.skills ?? [];
};

/** Student starts a new draft version from the newest version. Not possible while it is being reviewed. */
export function startRevision(s: P01State, role: P01Role, seen: Seen, at: string): P01State {
  need(role, "student", "revise a profile");
  const v = latest(s);
  checkSeen(v, seen);
  if (v.status === "draft") throw new RuleError("status", "You already have an open draft.");
  if (v.status === "submitted")
    throw new RuleError(
      "status",
      `Version ${v.profile_version} is with a coordinator, so it is locked. You can revise it after the review.`,
    );
  const next: ProfileVersion = {
    ...v,
    profile_version: v.profile_version + 1,
    status: "draft",
    change_note: null,
    published_at: null,
    // The comment stays visible on the draft so the student can answer it.
    coordinator_comment: v.status === "clarification_requested" ? v.coordinator_comment : null,
  };
  return log(
    { ...s, versions: [...s.versions, next] },
    "student",
    `Started version ${next.profile_version}`,
    at,
    next.profile_version,
  );
}

/** Drafts may be incomplete; nothing is checked until submission except access and version. */
export function saveDraft(
  s: P01State,
  role: P01Role,
  seen: Seen,
  content: ProfileContent,
  at: string,
): P01State {
  need(role, "student", "edit a profile");
  const v = latest(s);
  checkSeen(v, seen);
  if (!isEditable(v))
    throw new RuleError(
      "status",
      `Version ${v.profile_version} is ${STATUS_LABEL[v.status].toLowerCase()} and locked. Start a new version to change it.`,
    );
  const next = { ...v, ...cleanContent(content, baseSkills(s)) };
  return log(
    replaceLatest(s, next),
    "student",
    `Saved draft version ${v.profile_version}`,
    at,
    v.profile_version,
  );
}

export function submitProfile(
  s: P01State,
  role: P01Role,
  seen: Seen,
  content: ProfileContent,
  changeNote: string,
  at: string,
): P01State {
  const saved = saveDraft(s, role, seen, content, at);
  const v = latest(saved);
  const errors = validateProfile(v, at.slice(0, 10));
  const count = Object.keys(errors).length;
  if (count)
    throw new RuleError(
      "invalid",
      `Fix ${count} field${count === 1 ? "" : "s"} before submitting.`,
    );
  const note = changeNote.trim();
  if (v.profile_version > 1 && !note)
    throw new RuleError(
      "invalid",
      "Say what changed in this version, so the coordinator can check it quickly.",
    );
  const next: ProfileVersion = {
    ...v,
    status: "submitted",
    change_note: note || "First submitted profile",
    published_at: at.slice(0, 10),
  };
  return log(
    { ...replaceLatest(saved, next), events: s.events },
    "student",
    `Submitted version ${v.profile_version}`,
    at,
    v.profile_version,
  );
}

export function requestClarification(
  s: P01State,
  role: P01Role,
  seen: Seen,
  comment: string,
  at: string,
): P01State {
  need(role, "coordinator", "request clarification");
  const v = latest(s);
  checkSeen(v, seen);
  if (v.status !== "submitted")
    throw new RuleError("status", `Version ${v.profile_version} is not waiting for review.`);
  const text = comment.trim();
  if (text.length < COMMENT_MIN)
    throw new RuleError("invalid", "Tell the student what to clarify.");
  return log(
    replaceLatest(s, { ...v, status: "clarification_requested", coordinator_comment: text }),
    "coordinator",
    `Asked for clarification on version ${v.profile_version}`,
    at,
    v.profile_version,
  );
}

export function markReviewed(s: P01State, role: P01Role, seen: Seen, at: string): P01State {
  need(role, "coordinator", "review a profile");
  const v = latest(s);
  checkSeen(v, seen);
  if (v.status !== "submitted")
    throw new RuleError("status", `Version ${v.profile_version} is not waiting for review.`);
  if (Object.keys(validateProfile(v, at.slice(0, 10))).length)
    throw new RuleError(
      "invalid",
      "This version has missing or invalid fields. Ask the student to clarify instead.",
    );
  return log(
    replaceLatest(s, { ...v, status: "reviewed", published_at: at.slice(0, 10) }),
    "coordinator",
    `Reviewed version ${v.profile_version}`,
    at,
    v.profile_version,
  );
}

/** Stand-in for P06: records a review outcome on an evidence record. */
export function recordEvidenceOutcome(
  s: P01State,
  evidenceId: string,
  outcome: EvidenceItem["review_outcome"],
  reviewer: string,
  at: string,
): P01State {
  const item = s.evidence.find((e) => e.evidence_id === evidenceId);
  if (!item) throw new RuleError("not_found", `Evidence ${evidenceId} was not found.`);
  if (item.accepted_in !== null)
    throw new RuleError(
      "evidence",
      `${evidenceId} is already on profile version ${item.accepted_in}. Its outcome can no longer change here.`,
    );
  return log(
    {
      ...s,
      evidence: s.evidence.map((e) =>
        e.evidence_id === evidenceId
          ? { ...e, review_outcome: outcome, reviewer, reviewed_at: at.slice(0, 10) }
          : e,
      ),
    },
    "P06 reviewer (stand-in)",
    `${evidenceId}: ${outcome.replace("_", " ")}`,
    at,
    null,
  );
}

/**
 * Coordinator accepts evidence that P06 recorded as demonstrated. This creates a new reviewed version in
 * which that one skill is reviewed; the evidence ID the student gave earlier is kept, not replaced.
 */
export function acceptEvidence(
  s: P01State,
  role: P01Role,
  evidenceId: string,
  at: string,
): P01State {
  need(role, "coordinator", "accept skill evidence");
  const item = s.evidence.find((e) => e.evidence_id === evidenceId);
  if (!item) throw new RuleError("not_found", `Evidence ${evidenceId} was not found.`);
  const v = latest(s);
  if (item.student_id !== v.student_id)
    throw new RuleError(
      "evidence",
      `${evidenceId} belongs to ${item.student_id}, not ${v.student_id}. It was not accepted.`,
    );
  if (item.accepted_in !== null)
    throw new RuleError(
      "evidence",
      `${evidenceId} is already on profile version ${item.accepted_in}.`,
    );
  if (item.review_outcome !== "demonstrated")
    throw new RuleError(
      "evidence",
      `${evidenceId} is ${item.review_outcome.replace("_", " ")}, so the skill stays self-declared.`,
    );
  if (!item.reviewer || !isDate(item.reviewed_at))
    throw new RuleError(
      "evidence",
      `${evidenceId} has no reviewer or review date, so it cannot be accepted.`,
    );
  if (v.status !== "reviewed")
    throw new RuleError(
      "status",
      `Version ${v.profile_version} is ${STATUS_LABEL[v.status].toLowerCase()}. Finish that review first, so no change is lost.`,
    );
  const skill = v.skills.find((x) => x.skill_id === item.skill_id);
  if (!skill)
    throw new RuleError(
      "evidence",
      `The student has not declared ${item.skill_id}. Ask them to add it first.`,
    );
  if (skill.evidence_id && skill.evidence_id !== evidenceId && skill.source === "reviewed")
    throw new RuleError(
      "evidence",
      `${item.skill_id} is already reviewed with ${skill.evidence_id}.`,
    );
  const version = v.profile_version + 1;
  const next: ProfileVersion = {
    ...v,
    profile_version: version,
    status: "reviewed",
    coordinator_comment: null,
    change_note: `Accepted reviewed evidence ${evidenceId} from P06`,
    published_at: at.slice(0, 10),
    skills: v.skills.map((x) =>
      x.skill_id === item.skill_id
        ? {
            ...x,
            source: "reviewed",
            evidence_id: evidenceId,
            review_date: item.reviewed_at,
            reviewer: item.reviewer,
          }
        : x,
    ),
  };
  return log(
    {
      ...s,
      versions: [...s.versions, next],
      evidence: s.evidence.map((e) =>
        e.evidence_id === evidenceId ? { ...e, accepted_in: version } : e,
      ),
    },
    "coordinator",
    `Accepted ${evidenceId} into version ${version}`,
    at,
    version,
  );
}

/** Adds a question the assistant could not answer. The same open question is kept once. */
export function askPerson(s: P01State, question: string, at: string): P01State {
  const text = question.trim().slice(0, 400);
  if (!text) return s;
  if (s.questions.some((q) => q.answer === null && q.question.toLowerCase() === text.toLowerCase()))
    return s;
  const n = s.questions.reduce((m, q) => Math.max(m, Number(/\d+$/.exec(q.id)?.[0] ?? 0)), 0) + 1;
  const q: OpenQuestion = {
    id: `Q-${String(n).padStart(3, "0")}`,
    question: text,
    asked_at: at,
    answer: null,
    answered_at: null,
  };
  return log(
    { ...s, questions: [...s.questions, q] },
    "student",
    `${q.id}: question sent to the co-op office`,
    at,
    null,
  );
}

export function answerQuestion(
  s: P01State,
  role: P01Role,
  id: string,
  answer: string,
  at: string,
): P01State {
  need(role, "coordinator", "answer student questions");
  const text = answer.trim();
  const q = s.questions.find((x) => x.id === id);
  if (!q) throw new RuleError("not_found", `Question ${id} was not found.`);
  if (q.answer !== null) throw new RuleError("status", `${id} is already answered.`);
  if (!text) throw new RuleError("invalid", "Write an answer first.");
  return log(
    {
      ...s,
      questions: s.questions.map((x) =>
        x.id === id ? { ...x, answer: text, answered_at: at } : x,
      ),
    },
    "coordinator",
    `Answered ${id}`,
    at,
    null,
  );
}

const norm = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9+#./ -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Exact match on a term's ID, label or synonym. Anything else stays free text for a person to map. */
export function mapSkill(text: string, vocab: readonly Term[]): Term | null {
  const t = norm(text);
  if (!t) return null;
  return (
    vocab.find(
      (v) => norm(v.skill_id) === t || norm(v.label) === t || v.synonyms.some((x) => norm(x) === t),
    ) ?? null
  );
}

/** Adds free-text skills: known terms become self-declared skills, unknown ones are kept for review. */
export function addSkills(
  c: ProfileContent,
  texts: string[],
  vocab: readonly Term[],
): ProfileContent {
  let skills = c.skills;
  let unmapped = c.unmapped_skills;
  for (const raw of texts) {
    const text = raw.trim().slice(0, 60);
    if (!text) continue;
    const term = mapSkill(text, vocab);
    if (term) {
      if (!skills.some((x) => x.skill_id === term.skill_id))
        skills = [
          ...skills,
          {
            skill_id: term.skill_id,
            source: "self_declared",
            evidence_id: null,
            review_date: null,
            reviewer: null,
          },
        ];
    } else if (!unmapped.some((x) => x.toLowerCase() === text.toLowerCase()))
      unmapped = [...unmapped, text];
  }
  return { ...c, skills, unmapped_skills: unmapped };
}

/** Applies a proposed change to the form. The student still has to save or submit it. */
export function applyPatch(
  c: ProfileContent,
  p: ProfilePatch,
  vocab: readonly Term[],
): ProfileContent {
  const next: ProfileContent = {
    ...c,
    ...(p.goals ? { goals: p.goals.slice(0, GOALS_MAX) } : {}),
    sectors: cleanList([...c.sectors, ...(p.add_sectors ?? [])]),
    roles: cleanList([...c.roles, ...(p.add_roles ?? [])]),
    locations: cleanList([...c.locations, ...(p.add_locations ?? [])]),
    work_arrangements: p.work_arrangements?.length
      ? ARRANGEMENTS.filter((a) => p.work_arrangements!.includes(a))
      : c.work_arrangements,
    available_from: p.available_from ?? c.available_from,
    available_to: p.available_to ?? c.available_to,
  };
  return addSkills(next, p.add_skills ?? [], vocab);
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

/** What changed between two versions, in words, for the coordinator. */
export function diffVersions(
  before: ProfileVersion | null,
  after: ProfileContent,
  label: (id: string) => string,
): FieldChange[] {
  const skillText = (list: SkillEntry[]) =>
    list
      .map(
        (x) =>
          `${label(x.skill_id)} (${x.source === "reviewed" ? `reviewed, ${x.evidence_id}` : "self-declared"})`,
      )
      .sort()
      .join(", ");
  const rows: [string, string, string][] = [
    ["Learning goal", before?.goals ?? "", after.goals],
    ["Sectors", (before?.sectors ?? []).join(", "), after.sectors.join(", ")],
    ["Roles", (before?.roles ?? []).join(", "), after.roles.join(", ")],
    ["Locations", (before?.locations ?? []).join(", "), after.locations.join(", ")],
    [
      "Ways of working",
      (before?.work_arrangements ?? []).join(", "),
      after.work_arrangements.join(", "),
    ],
    ["Available from", before?.available_from ?? "", after.available_from ?? ""],
    ["Available to", before?.available_to ?? "", after.available_to ?? ""],
    ["Skills", skillText(before?.skills ?? []), skillText(after.skills)],
    [
      "Skills not in the shared list",
      (before?.unmapped_skills ?? []).join(", "),
      after.unmapped_skills.join(", "),
    ],
  ];
  return rows
    .filter(([, b, a]) => b !== a)
    .map(([field, b, a]) => ({ field, before: b || "none", after: a || "none" }));
}

export interface Approval {
  step: string;
  who: string;
  state: "done" | "waiting" | "later";
  detail: string;
}

/** What is still decided by a person, and by whom. Nothing in the app or the assistant decides these. */
export function approvals(s: P01State): Approval[] {
  const v = latest(s);
  const open = v.skills.filter((x) => x.source === "self_declared").length;
  return [
    {
      step: "Profile review",
      who: "University coordinator",
      state: v.status === "reviewed" ? "done" : v.status === "draft" ? "later" : "waiting",
      detail:
        v.status === "reviewed"
          ? `Version ${v.profile_version} is reviewed.`
          : v.status === "submitted"
            ? `Version ${v.profile_version} is waiting for a coordinator.`
            : v.status === "clarification_requested"
              ? "The coordinator asked you to clarify something."
              : `Version ${v.profile_version} is a draft. Submit it when it is ready.`,
    },
    {
      step: "Skill evidence",
      who: "P06 reviewer, then coordinator",
      state: open ? "waiting" : "done",
      detail: open
        ? `${open} skill${open === 1 ? " is" : "s are"} self-declared until evidence is reviewed.`
        : "Every skill has reviewed evidence.",
    },
    {
      step: "Listings, applications and placement",
      who: "People in the other teams' parts",
      state: "later",
      detail: "Decided there by people. Your profile never decides them.",
    },
  ];
}
