/** P01 Student profiles and internship interests (Team 1). Field names are the shared database's own. */
import type { ProfileSkillJson, WorkArrangement } from "@/lib/db";

export type ProfileStatus = "draft" | "submitted" | "clarification_requested" | "reviewed";
export type P01Role = "student" | "coordinator";
export type EvidenceOutcome =
  "pending" | "revision_requested" | "demonstrated" | "not_demonstrated";

/**
 * One skill on one profile version. A self-declared skill may carry the ID of evidence that is still
 * waiting for review; only `source` says whether it has been reviewed.
 */
export interface SkillEntry extends ProfileSkillJson {
  /** Who reviewed the evidence (P06). Null while the skill is self-declared. */
  reviewer: string | null;
}

/** What a student can edit. Everything else on a version is set by the workflow. */
export interface ProfileContent {
  goals: string;
  sectors: string[];
  roles: string[];
  locations: string[];
  work_arrangements: WorkArrangement[];
  available_from: string | null;
  available_to: string | null;
  skills: SkillEntry[];
  /** Free-text skills with no shared vocabulary term. Kept for review, never matched silently. */
  unmapped_skills: string[];
}

export interface ProfileVersion extends ProfileContent {
  student_id: string;
  full_name: string;
  programme: string;
  year: number;
  profile_version: number;
  status: ProfileStatus;
  change_note: string | null;
  coordinator_comment: string | null;
  published_at: string | null;
}

/** A P06 evidence record as P01 receives it. */
export interface EvidenceItem {
  evidence_id: string;
  student_id: string;
  skill_id: string;
  activity: string;
  review_outcome: EvidenceOutcome;
  reviewer: string | null;
  reviewed_at: string | null;
  /** Profile version that accepted it, if any. */
  accepted_in: number | null;
}

export interface AuditEvent {
  at: string;
  actor: P01Role | "P06 reviewer (stand-in)";
  action: string;
  profile_version: number | null;
}

/** A question the assistant could not answer, waiting for a person. */
export interface OpenQuestion {
  id: string;
  question: string;
  asked_at: string;
  answer: string | null;
  answered_at: string | null;
}

export interface P01State {
  student_id: string;
  versions: ProfileVersion[];
  evidence: EvidenceItem[];
  events: AuditEvent[];
  questions: OpenQuestion[];
}

/** A vocabulary term from the shared `skills` table. */
export interface Term {
  skill_id: string;
  label: string;
  synonyms: string[];
}

export type FieldErrors = Partial<Record<keyof ProfileContent, string>>;

/** A change the assistant proposes. The student applies it or ignores it. */
export interface ProfilePatch {
  goals?: string;
  add_sectors?: string[];
  add_roles?: string[];
  add_locations?: string[];
  work_arrangements?: WorkArrangement[];
  available_from?: string;
  available_to?: string;
  /** Free text; mapped to the shared vocabulary when applied, always as self-declared. */
  add_skills?: string[];
}
