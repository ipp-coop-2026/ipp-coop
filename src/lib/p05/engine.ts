/**
 * P05 matching engine (ported from Team 5's prototype, src/engine.js, rules-1.0.0 and ai-embed-1.0.0).
 *
 * Rules decide eligibility with three states per mandatory condition: met / not_met / cannot_confirm.
 * Unknown input is never shown as met, and a self-declared skill never satisfies a requirement.
 * The AI method (pretrained gte-small sentence embeddings, not trained by us) only adds preference points and
 * unconfirmed skill suggestions; it never changes a mandatory state. Without an AI signal it falls back to
 * word overlap and says "simulated".
 *
 * Scope rule: P05 ranks opportunities for a student. Nothing here ranks students for an employer.
 */
import type {
  AiNote,
  AiParams,
  AiSignalData,
  AiSource,
  ConditionResult,
  Gap,
  Interest,
  Listing,
  ListingVersion,
  MatchData,
  MatchResult,
  MatchStatus,
  Method,
  MethodFamily,
  Profile,
  Reason,
  Recommendation,
  VocabTerm,
} from "./types";

export const AI_MODEL = "Supabase/gte-small";
// Set on 2026-11-16 from 67,284 goal × open-listing pairs: median 0.809, 90th percentile 0.844, max 0.933.
export const AI_PARAMS: AiParams = { floor: 0.82, ceil: 0.9, suggest_min: 0.84, suggest_top: 2, reason_min_fit: 0.5 };

export const METHODS: readonly Method[] = [
  {
    method_version: "rules-1.0.0",
    family: "rules",
    label: "Rules baseline",
    note: "Editable baseline: sector, role, city and nice-to-have skills order the jobs; requirements decide eligibility.",
    weights: { sector: 2, role: 2, city: 1, desirable_skill: 1 },
  },
  {
    method_version: "ai-embed-1.0.0",
    family: "ai",
    label: "AI similarity (gte-small)",
    model: AI_MODEL,
    note: "Rules baseline plus cosine similarity of sentence embeddings (goal vs job text; free-text skill vs vocabulary).",
    weights: { sector: 2, role: 2, city: 1, desirable_skill: 1, goal_semantic: 3, suggested_skill: 0.5 },
    params: AI_PARAMS,
  },
];

export const STATUS_ORDER: Record<MatchStatus, number> = { eligible: 0, cannot_confirm: 1, not_eligible: 2, excluded: 3 };

export function methodFor(family: MethodFamily): Method {
  const m = METHODS.find((x) => x.family === family);
  if (!m) throw new Error(`No method for ${family}`);
  return m;
}

// ---------- ids ----------
export function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `00000000${h.toString(16)}`.slice(-8).toUpperCase();
}

/** Immutable record ID: a hash of every input version and the method. */
export function recommendationId(studentId: string, profileVersion: number, opportunityId: string, opportunityVersion: number | null, methodVersion: string): string {
  return `REC-${fnv1a([studentId, profileVersion, opportunityId, opportunityVersion ?? "null", methodVersion].join("|"))}`;
}

/** A result built without the AI signal (fallback) gets its own ID, so it never overwrites one built with it. */
export function recordIdFor(r: Pick<Recommendation, "student_id" | "profile_version" | "opportunity_id" | "opportunity_version" | "method_version" | "ai_source">): string {
  const mv = r.method_version + (r.ai_source === "lexical-fallback" ? "+fallback" : "");
  return recommendationId(r.student_id, r.profile_version, r.opportunity_id, r.opportunity_version, mv);
}

export function textKey(text: string | null | undefined): string {
  return fnv1a(String(text ?? ""));
}

// ---------- word overlap (the simulated fallback) ----------
const STOP = new Set(
  ("a an and the of for in on to with by at from as is are be this that it into using use build learn how " +
    "my me i we our your their about across work working role roles data intern help teams team short more make plan").split(" "),
);

function stem(t: string): string {
  if (t.startsWith("analy")) return "analy";
  if (t.length > 4 && t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (t.length > 4 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

function tokenize(text: string | null): { stems: string[]; surface: Map<string, string> } {
  const stems: string[] = [];
  const surface = new Map<string, string>();
  (text ?? "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).forEach((w) => {
    if (!w || w.length < 3 || STOP.has(w)) return;
    const s = stem(w);
    if (!surface.has(s)) {
      surface.set(s, w);
      stems.push(s);
    }
  });
  return { stems, surface };
}

export function textSimilarity(a: string | null, b: string | null): { score: number; shared: string[] } {
  const A = tokenize(a);
  const B = tokenize(b);
  if (!A.stems.length || !B.stems.length) return { score: 0, shared: [] };
  const setB = new Set(B.stems);
  const shared = A.stems.filter((s) => setB.has(s));
  const score = shared.length / Math.sqrt(A.stems.length * B.stems.length);
  return { score: Math.round(score * 100) / 100, shared: shared.map((s) => A.surface.get(s) ?? s) };
}

export function suggestSkills(phrase: string, vocab: VocabTerm[]): { skill_id: string; label: string; score: number }[] {
  const P = tokenize(phrase).stems;
  if (!P.length) return [];
  const out: { skill_id: string; label: string; score: number }[] = [];
  vocab.forEach((v) => {
    const T = new Set(tokenize(`${v.label} ${v.synonyms.join(" ")}`).stems);
    const hit = P.filter((s) => T.has(s)).length;
    const score = Math.round((hit / P.length) * 100) / 100;
    if (score >= 0.5) out.push({ skill_id: v.skill_id, label: v.label, score });
  });
  return out.sort((x, y) => y.score - x.score || x.skill_id.localeCompare(y.skill_id));
}

// ---------- AI signals ----------
export interface AiLookup {
  model: string;
  hasGoal(goal: string | null): boolean;
  goal(goal: string | null, opportunityId: string, version: number): number | null;
  phrase(phrase: string): { skill_id: string; score: number }[] | null;
}

export function aiLookup(ai: AiSignalData | null): AiLookup | null {
  if (!ai) return null;
  return {
    model: ai.model || AI_MODEL,
    hasGoal: (goal) => Boolean(ai.goals[textKey(goal)]),
    goal: (goal, opportunityId, version) => {
      const v = ai.goals[textKey(goal)]?.[`${opportunityId}@${version}`];
      return typeof v === "number" ? v : null;
    },
    phrase: (phrase) => ai.phrases[phrase] ?? null,
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const r2 = (x: number) => Math.round(x * 100) / 100;

// ---------- listing helpers ----------
export function publishedVersion(listing: Listing): { version: number; record: ListingVersion } | null {
  if (!listing.approved_version) return null;
  const record = listing.versions[String(listing.approved_version)];
  return record ? { version: listing.approved_version, record } : null;
}

function findSkill(profile: Profile, skillId: string) {
  return profile.skills.find((s) => s.skill_id === skillId) ?? null;
}

// ---------- the evaluator ----------
export function evaluate(profile: Profile, listing: Listing, method: Method, vocab: VocabTerm[], ai: AiLookup | null): Recommendation {
  const V = new Map(vocab.map((v) => [v.skill_id, v]));
  const label = (id: string) => V.get(id)?.label ?? id;
  const w = method.weights;
  const embed = method.family === "ai" && Boolean(method.model);
  const params = method.params ?? AI_PARAMS;
  let usedFallback = false;
  const pub = publishedVersion(listing);
  const pv = profile.profile_version;

  const rec: Recommendation = {
    recommendation_id: "",
    student_id: profile.student_id,
    profile_version: pv,
    opportunity_id: listing.opportunity_id,
    opportunity_version: pub ? pub.version : null,
    method_version: method.method_version,
    method_family: method.family,
    listing: null,
    status: "excluded",
    status_reason: "",
    mandatory: [],
    desirable: [],
    interests: [],
    reasons: [],
    gaps: [],
    unknowns: [],
    ai_notes: [],
    ai_source: null,
    pref_points: 0,
  };
  const finish = (r: Recommendation): Recommendation => ({ ...r, recommendation_id: recordIdFor(r) });

  if (!pub) return finish({ ...rec, status_reason: "Not published by P03 (no approved version)" });
  const L = pub.record;
  const ov = pub.version;
  rec.listing = {
    title: L.title, employer: L.employer, city: L.city, work_arrangement: L.work_arrangement,
    start_date: L.start_date, end_date: L.end_date, sector: L.sector, role_family: L.role_family,
  };
  if (listing.listing_status !== "open") {
    const word = listing.listing_status === "withdrawn" ? "Withdrawn" : "Closed";
    return finish({ ...rec, status_reason: `${word} on ${listing.closed_on ?? "an unrecorded date"} (listing_status from P03)` });
  }

  const cite = (profileField: string, opportunityField: string) => ({
    profile_field: profileField, opportunity_field: opportunityField, profile_version: pv, opportunity_version: ov, method_version: method.method_version,
  });

  type Suggestion = { phrase: string; skill_id: string; score: number; via: "embedding" | "lexical" };
  const suggestions: Suggestion[] = [];
  if (method.family === "ai") {
    profile.unmapped_skills.forEach((phrase) => {
      const list = embed && ai ? ai.phrase(phrase) : null;
      if (list) {
        list.filter((x) => x.score >= params.suggest_min).slice(0, params.suggest_top)
          .forEach((x) => suggestions.push({ phrase, skill_id: x.skill_id, score: x.score, via: "embedding" }));
      } else {
        if (embed) usedFallback = true;
        suggestSkills(phrase, vocab).forEach((s) => suggestions.push({ phrase, skill_id: s.skill_id, score: s.score, via: "lexical" }));
      }
    });
  }
  const simWord = (s: Suggestion) => (s.via === "embedding" ? `AI similarity ${s.score}, ${method.model ?? AI_MODEL}` : `word overlap ${s.score}, simulated`);

  const reasonPool: { rank: number; text: string; c: ReturnType<typeof cite> }[] = [];
  let points = 0;

  // Mandatory conditions decide eligibility
  L.mandatory.forEach((c, i) => {
    const out: ConditionResult = { cond_id: `mandatory[${i}]`, kind: c.kind, label: "", state: "met", detail: "", input_present: true, profile_field: "", opportunity_field: "" };
    if (c.kind === "skill") {
      const s = findSkill(profile, c.skill_id);
      out.label = `${label(c.skill_id)} (${c.skill_id})`;
      out.skill_id = c.skill_id;
      out.profile_field = `skills[${c.skill_id}]`;
      out.opportunity_field = `mandatory[${c.skill_id}]`;
      if (!s) {
        out.state = "not_met";
        out.detail = `${label(c.skill_id)} is not on your profile v${pv}`;
        rec.gaps.push({ skill_id: c.skill_id, label: label(c.skill_id), requirement: "mandatory", current_source: "absent" });
      } else if (s.source === "reviewed" && s.evidence_id) {
        out.state = "met";
        out.evidence_id = s.evidence_id;
        out.detail = `Reviewed evidence ${s.evidence_id} (${s.review_date ?? "date not recorded"})`;
        reasonPool.push({ rank: 1, text: `Your reviewed ${label(c.skill_id)} (${s.evidence_id}) meets a mandatory requirement`, c: cite(out.profile_field, out.opportunity_field) });
      } else {
        out.state = "cannot_confirm";
        out.input_present = false;
        out.detail = `${c.skill_id} required; present on your profile as self-declared only`;
        rec.gaps.push({ skill_id: c.skill_id, label: label(c.skill_id), requirement: "mandatory", current_source: "self_declared" });
        rec.unknowns.push({ field: `skills[${c.skill_id}].evidence_id`, text: `No reviewed evidence for ${label(c.skill_id)} in profile v${pv}` });
      }
      const sg = suggestions.find((x) => x.skill_id === c.skill_id);
      if (sg && out.state !== "met") {
        rec.ai_notes.push({
          text: `"${sg.phrase}" may relate to ${c.skill_id} (${simWord(sg)}). Suggested, unconfirmed: it does not change this mandatory condition.`,
          field: "unmapped_skills", kind: "skill_suggestion", skill_id: c.skill_id, score: sg.score, via: sg.via,
        });
      }
    } else if (c.kind === "availability") {
      const a = profile.availability;
      out.label = "Available for the full placement period";
      out.profile_field = "availability";
      out.opportunity_field = "start_date/end_date";
      const missing = [...(!a.start ? ["availability.start"] : []), ...(!a.end ? ["availability.end"] : [])];
      if (missing.length) {
        out.state = "cannot_confirm";
        out.input_present = false;
        out.detail = `${missing.join(" and ")} absent from profile v${pv}`;
        rec.unknowns.push({ field: missing.join(", "), text: out.detail });
      } else if (a.start && a.end && L.start_date && L.end_date && a.start <= L.start_date && a.end >= L.end_date) {
        out.state = "met";
        out.detail = `You are available ${a.start} to ${a.end}; the role runs ${L.start_date} to ${L.end_date}`;
        reasonPool.push({ rank: 4, text: `Your availability covers the whole placement (${L.start_date} to ${L.end_date})`, c: cite("availability", "start_date/end_date") });
      } else {
        out.state = "not_met";
        out.detail = a.start && L.start_date && a.start > L.start_date
          ? `You become available ${a.start}; the role starts ${L.start_date}`
          : `You are available until ${a.end ?? "an unknown date"}; the role runs to ${L.end_date ?? "an unknown date"}`;
      }
    } else {
      const arr = profile.work_arrangements;
      out.label = `${c.arrangements.join(" or ")} work in ${c.city ?? "the listed city"}`;
      out.profile_field = "work_arrangements";
      out.opportunity_field = "work_arrangement";
      if (!arr.length) {
        out.state = "cannot_confirm";
        out.input_present = false;
        out.detail = `work_arrangements absent from profile v${pv}`;
        rec.unknowns.push({ field: "work_arrangements", text: out.detail });
      } else if (arr.some((x) => c.arrangements.includes(x))) {
        out.state = "met";
        out.detail = `You accept ${arr.join(" / ")} work`;
      } else {
        out.state = "not_met";
        out.detail = `Your profile accepts ${arr.join(" / ")} work only; this role is ${c.arrangements.join(" or ")} in ${c.city ?? "the listed city"}`;
      }
    }
    rec.mandatory.push(out);
  });

  // Desirable conditions are preferences: self-declared counts here
  L.desirable.forEach((c, i) => {
    if (c.kind !== "skill") return;
    const s = findSkill(profile, c.skill_id);
    const out: ConditionResult = {
      cond_id: `desirable[${i}]`, kind: "skill", skill_id: c.skill_id, label: `${label(c.skill_id)} (${c.skill_id})`, state: "not_met", detail: "",
      input_present: true, profile_field: `skills[${c.skill_id}]`, opportunity_field: `desirable[${c.skill_id}]`,
    };
    const sg = suggestions.find((x) => x.skill_id === c.skill_id);
    if (s) {
      out.state = "met";
      out.detail = s.source === "reviewed" ? `Reviewed (${s.evidence_id ?? "evidence"})` : "Self-declared: counts for preferences only";
      points += w.desirable_skill;
      reasonPool.push({ rank: 3, text: `${label(c.skill_id)} (${s.source === "reviewed" ? "reviewed" : "self-declared"}) matches a desirable skill`, c: cite(out.profile_field, out.opportunity_field) });
    } else if (sg && method.family === "ai") {
      const ws = w.suggested_skill ?? 0;
      out.state = "suggested";
      out.detail = `Suggested, unconfirmed: "${sg.phrase}" (${simWord(sg)})`;
      out.profile_field = "unmapped_skills";
      points += ws;
      rec.ai_notes.push({
        text: `"${sg.phrase}" suggested as ${c.skill_id} (${simWord(sg)}); counted at ${ws} point as a preference only`,
        field: "unmapped_skills", kind: "skill_suggestion", skill_id: c.skill_id, score: sg.score, via: sg.via,
      });
    } else {
      out.detail = "Not on your profile";
      rec.gaps.push({ skill_id: c.skill_id, label: label(c.skill_id), requirement: "desirable", current_source: "absent" });
    }
    rec.desirable.push(out);
  });

  // Interests the student chose
  const interests: { kind: Interest["kind"]; label: string; pval: string[]; oval: string | null; pf: string; of: string; weight: number }[] = [
    { kind: "sector", label: "Sector", pval: profile.sectors, oval: L.sector, pf: "sectors", of: "sector", weight: w.sector },
    { kind: "role", label: "Role", pval: profile.roles, oval: L.role_family, pf: "roles", of: "role_family", weight: w.role },
    { kind: "city", label: "Location", pval: profile.locations, oval: L.city, pf: "locations", of: "city", weight: w.city },
  ];
  interests.forEach((it) => {
    const matched = it.oval !== null && it.pval.includes(it.oval);
    rec.interests.push({ kind: it.kind, label: it.label, value: it.oval, matched, profile_field: it.pf, opportunity_field: it.of, known: it.pval.length > 0 });
    if (!matched) return;
    points += it.weight;
    const text = it.kind === "sector" ? `You chose ${it.oval} as a sector; this role is in ${it.oval}`
      : it.kind === "role" ? `You are looking for ${it.oval} roles; this is one`
      : `You listed ${it.oval} as a preferred location`;
    reasonPool.push({ rank: 2, text, c: cite(it.pf, it.of) });
  });

  // AI: meaning of the goal text against the job text (preference only)
  let aiSource: AiSource | null = null;
  if (method.family === "ai") {
    const cos = embed && ai ? ai.goal(profile.goals, listing.opportunity_id, ov) : null;
    const gw = w.goal_semantic ?? 0;
    if (cos !== null) {
      const fit = r2(clamp01((cos - params.floor) / (params.ceil - params.floor)));
      const add = r2(gw * fit);
      points += add;
      rec.ai_notes.push({
        text: `Goal text and job text are close in meaning: cosine ${cos}, fit ${fit} (+${add} points). Model ${method.model ?? AI_MODEL}, pretrained, not trained by us.`,
        field: "goals", kind: "goal_similarity", score: cos, fit, via: "embedding",
      });
      if (fit >= params.reason_min_fit) {
        reasonPool.push({ rank: 5, text: `Your goals are close in meaning to this job (AI similarity ${cos}, ${method.model ?? AI_MODEL})`, c: cite("goals", "description") });
      }
    } else {
      if (embed) usedFallback = true;
      const sim = textSimilarity(profile.goals, `${L.title} ${L.description ?? ""} ${L.sector ?? ""}`);
      if (sim.score > 0) {
        const add = r2(gw * sim.score);
        points += add;
        rec.ai_notes.push({
          text: `Goal text shares terms with the listing: ${sim.shared.join(", ")} (similarity ${sim.score}, +${add} points; word overlap, simulated${embed ? " fallback: no AI signal" : ""})`,
          field: "goals", kind: "goal_similarity", score: sim.score, via: "lexical",
        });
        reasonPool.push({ rank: 5, text: `Your goals mention ${sim.shared.slice(0, 3).join(", ")} (AI-assisted, simulated)`, c: cite("goals", "description") });
      }
    }
    aiSource = !embed ? "lexical" : usedFallback ? "lexical-fallback" : "embedding";
  }

  const reasons: Reason[] = reasonPool.sort((x, y) => x.rank - y.rank).slice(0, 3).map((r) => ({ text: r.text, ...r.c }));
  const notMet = rec.mandatory.filter((c) => c.state === "not_met");
  const unk = rec.mandatory.filter((c) => c.state === "cannot_confirm");
  const status: MatchStatus = notMet.length ? "not_eligible" : unk.length ? "cannot_confirm" : "eligible";
  const statusReason = notMet.length ? `Blocked by: ${notMet.map((c) => c.label).join("; ")}`
    : unk.length ? `Cannot confirm: ${unk.map((c) => c.label).join("; ")}`
    : rec.mandatory.length ? `All ${rec.mandatory.length} mandatory conditions met` : "This listing states no mandatory conditions";

  return finish({ ...rec, status, status_reason: statusReason, reasons, pref_points: r2(points), ai_source: aiSource });
}

/** Eligible first, then one thing to do, then not a fit, then closed; within a group, by interest points. */
export function rank(records: Recommendation[]): Recommendation[] {
  return records.slice().sort((a, b) =>
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.pref_points - a.pref_points || a.opportunity_id.localeCompare(b.opportunity_id));
}

// ---------- matching a student ----------
export function profileVersions(data: MatchData, studentId: string): Profile[] {
  return data.profiles.filter((p) => p.student_id === studentId).sort((a, b) => a.profile_version - b.profile_version);
}

export function latestProfile(data: MatchData, studentId: string): Profile | null {
  return profileVersions(data, studentId).at(-1) ?? null;
}

export function students(data: MatchData): { student_id: string; name: string }[] {
  const seen = new Map<string, string>();
  data.profiles.forEach((p) => { if (!seen.has(p.student_id)) seen.set(p.student_id, p.name); });
  return [...seen.entries()].map(([student_id, name]) => ({ student_id, name })).sort((a, b) => a.student_id.localeCompare(b.student_id));
}

/** Every listing evaluated against the student's newest profile version, best options first. */
export function matchStudent(data: MatchData, studentId: string, family: MethodFamily, profileVersion?: number): MatchResult | null {
  const profile = profileVersion === undefined
    ? latestProfile(data, studentId)
    : profileVersions(data, studentId).find((p) => p.profile_version === profileVersion) ?? null;
  if (!profile) return null;
  const method = methodFor(family);
  const ai = aiLookup(data.ai);
  return { profile, method, records: rank(data.listings.map((l) => evaluate(profile, l, method, data.vocabulary, ai))) };
}

/** Gaps a student could send to P06 skills training (mandatory first). */
export function gapsOf(r: Recommendation): Gap[] {
  return r.gaps.slice().sort((a, b) => (a.requirement === b.requirement ? 0 : a.requirement === "mandatory" ? -1 : 1));
}

export type { AiNote };
