/** Types of the P05 matching engine (ported from Team 5's prototype, engine.js). */

export type SkillSource = "self_declared" | "reviewed";
export type MethodFamily = "rules" | "ai";
export type MatchStatus = "eligible" | "cannot_confirm" | "not_eligible" | "excluded";
export type ConditionState = "met" | "not_met" | "cannot_confirm" | "suggested";
export type AiSource = "embedding" | "lexical" | "lexical-fallback";

export interface VocabTerm {
  skill_id: string;
  label: string;
  synonyms: string[];
}

export interface ProfileSkill {
  skill_id: string;
  source: SkillSource;
  evidence_id: string | null;
  review_date: string | null;
}

/** One immutable profile version (P01). */
export interface Profile {
  student_id: string;
  name: string;
  profile_version: number;
  published_at: string | null;
  change_note: string | null;
  goals: string | null;
  sectors: string[];
  roles: string[];
  locations: string[];
  work_arrangements: string[];
  availability: { start: string | null; end: string | null };
  skills: ProfileSkill[];
  unmapped_skills: string[];
}

export type Condition =
  | { kind: "skill"; skill_id: string }
  | { kind: "availability" }
  | { kind: "arrangement"; arrangements: string[]; city: string | null };

export interface ListingVersion {
  title: string;
  employer: string;
  city: string | null;
  work_arrangement: string | null;
  start_date: string | null;
  end_date: string | null;
  sector: string | null;
  role_family: string | null;
  description: string | null;
  mandatory: Condition[];
  desirable: Condition[];
}

/** A published opportunity (P03) with every version P02 submitted. Only `approved_version` is ever matched. */
export interface Listing {
  opportunity_id: string;
  approved_version: number | null;
  listing_status: "open" | "closed" | "withdrawn";
  closed_on: string | null;
  versions: Record<string, ListingVersion>;
}

export interface Evidence {
  evidence_id: string;
  student_id: string;
  skill_id: string;
  activity: string;
  outcome: string;
  reviewer: string | null;
  review_date: string | null;
}

/** Real outputs of the gte-small embedding model, keyed by textKey(goal) and "OP-028@2". */
export interface AiSignalData {
  model: string;
  source: "live" | "precomputed";
  goals: Record<string, Record<string, number>>;
  phrases: Record<string, { skill_id: string; score: number }[]>;
}

export interface MatchData {
  vocabulary: VocabTerm[];
  profiles: Profile[];
  listings: Listing[];
  evidence: Evidence[];
  ai: AiSignalData | null;
}

export interface Weights {
  sector: number;
  role: number;
  city: number;
  desirable_skill: number;
  goal_semantic?: number;
  suggested_skill?: number;
}

export interface AiParams {
  floor: number;
  ceil: number;
  suggest_min: number;
  suggest_top: number;
  reason_min_fit: number;
}

export interface Method {
  method_version: string;
  family: MethodFamily;
  label: string;
  note: string;
  weights: Weights;
  model?: string;
  params?: AiParams;
}

export interface ConditionResult {
  cond_id: string;
  kind: Condition["kind"];
  label: string;
  state: ConditionState;
  detail: string;
  input_present: boolean;
  profile_field: string;
  opportunity_field: string;
  skill_id?: string;
  evidence_id?: string;
}

export interface Reason {
  text: string;
  profile_field: string;
  opportunity_field: string;
  profile_version: number;
  opportunity_version: number;
  method_version: string;
}

export interface Interest {
  kind: "sector" | "role" | "city";
  label: string;
  value: string | null;
  matched: boolean;
  profile_field: string;
  opportunity_field: string;
  known: boolean;
}

export interface Gap {
  skill_id: string;
  label: string;
  requirement: "mandatory" | "desirable";
  current_source: "absent" | "self_declared";
}

export interface AiNote {
  text: string;
  field: string;
  kind: "skill_suggestion" | "goal_similarity";
  score: number;
  via: "embedding" | "lexical";
  skill_id?: string;
  fit?: number;
}

export interface Recommendation {
  recommendation_id: string;
  student_id: string;
  profile_version: number;
  opportunity_id: string;
  opportunity_version: number | null;
  method_version: string;
  method_family: MethodFamily;
  listing: Omit<ListingVersion, "mandatory" | "desirable" | "description"> | null;
  status: MatchStatus;
  status_reason: string;
  mandatory: ConditionResult[];
  desirable: ConditionResult[];
  interests: Interest[];
  reasons: Reason[];
  gaps: Gap[];
  unknowns: { field: string; text: string }[];
  ai_notes: AiNote[];
  ai_source: AiSource | null;
  pref_points: number;
}

export interface MatchResult {
  profile: Profile;
  method: Method;
  records: Recommendation[];
}
