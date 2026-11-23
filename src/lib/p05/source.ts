/**
 * Maps the shared database's rows into the engine's data shape, so the engine does not care where data
 * comes from. All functions return new objects; nothing passed in is changed.
 */
import {
  getAiSignals,
  getDemonstratedEvidence,
  getOpportunityFeed,
  getProfileFeed,
  getSkills,
  scoreGoalLive,
  suggestSkillsLive,
  type DbOptions,
  type EvidenceRow,
  type OpportunityRow,
  type ProfileRow,
  type SkillRow,
} from "@/lib/db";
import { AI_MODEL, textKey } from "./engine";
import type { AiSignalData, Condition, Evidence, Listing, MatchData, Profile, VocabTerm } from "./types";

export function mapVocabulary(rows: SkillRow[]): VocabTerm[] {
  return rows.map((r) => ({ skill_id: r.skill_id, label: r.label, synonyms: r.synonyms ?? [] }))
    .sort((a, b) => a.skill_id.localeCompare(b.skill_id));
}

export function mapProfiles(rows: ProfileRow[]): Profile[] {
  return rows.map((r) => ({
    student_id: r.student_id,
    name: r.full_name,
    profile_version: r.profile_version,
    published_at: r.published_at,
    change_note: r.change_note,
    goals: r.goals,
    sectors: r.sectors ?? [],
    roles: r.roles ?? [],
    locations: r.locations ?? [],
    work_arrangements: r.work_arrangements ?? [],
    availability: { start: r.available_from, end: r.available_to },
    skills: (r.skills ?? []).map((s) => ({ skill_id: s.skill_id, source: s.source, evidence_id: s.evidence_id ?? null, review_date: s.review_date ?? null })),
    unmapped_skills: r.unmapped_skills ?? [],
  }));
}

function mapCondition(c: OpportunityRow["mandatory"][number]): Condition | null {
  if (c.kind === "skill") return c.skill_id ? { kind: "skill", skill_id: c.skill_id } : null;
  if (c.kind === "availability") return { kind: "availability" };
  return { kind: "arrangement", arrangements: c.arrangements ?? [], city: c.city ?? null };
}

const conditions = (list: OpportunityRow["mandatory"]): Condition[] =>
  (list ?? []).map(mapCondition).filter((c): c is Condition => c !== null);

/** Groups opportunity_feed rows (one per version) into listings with every version. */
export function mapListings(rows: OpportunityRow[]): Listing[] {
  const byId = new Map<string, Listing>();
  rows.forEach((r) => {
    const prev = byId.get(r.opportunity_id);
    const version = {
      title: r.title, employer: r.employer, city: r.city, work_arrangement: r.work_arrangement, start_date: r.start_date, end_date: r.end_date,
      sector: r.sector, role_family: r.role_family, description: r.description, mandatory: conditions(r.mandatory), desirable: conditions(r.desirable),
    };
    byId.set(r.opportunity_id, {
      opportunity_id: r.opportunity_id,
      approved_version: r.approved_version,
      listing_status: r.listing_status,
      closed_on: r.closed_on ?? null,
      versions: { ...(prev?.versions ?? {}), [String(r.version)]: version },
    });
  });
  return [...byId.values()].sort((a, b) => a.opportunity_id.localeCompare(b.opportunity_id));
}

export function mapEvidence(rows: EvidenceRow[]): Evidence[] {
  return rows.map((r) => ({
    evidence_id: r.evidence_id, student_id: r.student_id, skill_id: r.skill_id, activity: r.activity,
    outcome: r.review_outcome, reviewer: r.reviewer, review_date: r.reviewed_at,
  }));
}

export interface LiveSource {
  mode: "live";
  loadedAt: string;
  counts: { students: number; listings: number; skills: number };
}

/** Everything P05 reads, from the shared database. Throws SharedDbError if it cannot be reached. */
export async function loadMatchData(opts?: DbOptions): Promise<{ data: MatchData; source: LiveSource }> {
  const [skills, profiles, listings, evidence] = await Promise.all([
    getSkills(opts), getProfileFeed(undefined, opts), getOpportunityFeed(opts), getDemonstratedEvidence(undefined, opts),
  ]);
  const data: MatchData = {
    vocabulary: mapVocabulary(skills),
    profiles: mapProfiles(profiles),
    listings: mapListings(listings),
    evidence: mapEvidence(evidence),
    ai: { model: AI_MODEL, source: "live", goals: {}, phrases: {} },
  };
  if (!data.profiles.length || !data.listings.length) throw new Error("The shared database returned no profiles or listings");
  return {
    data,
    source: {
      mode: "live",
      loadedAt: new Date().toISOString(),
      counts: { students: new Set(data.profiles.map((p) => p.student_id)).size, listings: data.listings.length, skills: data.vocabulary.length },
    },
  };
}

/**
 * AI signals for one profile, merged into a copy of `current`. Stored embeddings first (rpc/ai_signals);
 * text written after the seed, for example by another team, is scored live by the ai-suggest function.
 */
export async function withAiSignals(current: AiSignalData, profile: Profile, opts?: DbOptions): Promise<AiSignalData> {
  const key = textKey(profile.goals);
  const phrases = profile.unmapped_skills.filter((p) => !current.phrases[p]);
  if (current.goals[key] && !phrases.length) return current;
  const res = await getAiSignals(profile.goals ?? "", phrases, opts);
  const goals = { ...current.goals };
  const found = { ...current.phrases, ...res.phrases };
  if (res.goal_embedded) goals[key] = res.goal;
  else if (profile.goals) {
    try { goals[key] = await scoreGoalLive(profile.goals, opts); } catch { /* keeps the labelled fallback */ }
  }
  await Promise.all(phrases.filter((p) => !found[p]).slice(0, 3).map(async (p) => {
    try {
      const list = await suggestSkillsLive(p, opts);
      found[p] = list.map((s) => ({ skill_id: s.skill_id, score: s.similarity }));
    } catch { /* phrase stays without a suggestion */ }
  }));
  return { ...current, goals, phrases: found };
}
