/**
 * P01 hand-off contract (v1). Versions leave P01 in exactly the row shape of the shared database's
 * `profile_feed` view, so P05 and P04 read one format whether it comes from the app or the database.
 *
 * Rules: only submitted or reviewed versions leave P01; `evidence_id` and `review_date` are set only on
 * reviewed skills (a reference still waiting for review stays inside P01); unknown dates are null.
 */
import type { ProfileRow } from "@/lib/db";
import { RuleError } from "./rules";
import type { EvidenceItem, P01State, ProfileVersion } from "./types";

export const CONTRACT_VERSION = "p01-profile/1";

export function toFeedRow(v: ProfileVersion): ProfileRow {
  if (v.status !== "submitted" && v.status !== "reviewed")
    throw new RuleError(
      "status",
      `Version ${v.profile_version} is ${v.status.replace("_", " ")}. Only submitted or reviewed versions are handed over.`,
    );
  return {
    student_id: v.student_id,
    full_name: v.full_name,
    programme: v.programme,
    year: v.year,
    profile_version: v.profile_version,
    status: v.status,
    goals: v.goals,
    sectors: [...v.sectors],
    roles: [...v.roles],
    locations: [...v.locations],
    work_arrangements: [...v.work_arrangements],
    available_from: v.available_from,
    available_to: v.available_to,
    change_note: v.change_note,
    published_at: v.published_at,
    skills: [...v.skills]
      .sort((a, b) => a.skill_id.localeCompare(b.skill_id))
      .map((s) =>
        s.source === "reviewed"
          ? {
              skill_id: s.skill_id,
              source: s.source,
              evidence_id: s.evidence_id,
              review_date: s.review_date,
            }
          : { skill_id: s.skill_id, source: s.source, evidence_id: null, review_date: null },
      ),
    unmapped_skills: [...v.unmapped_skills],
  };
}

export function fromFeedRow(
  r: ProfileRow,
  reviewerOf: (evidenceId: string) => string | null = () => null,
): ProfileVersion {
  return {
    student_id: r.student_id,
    full_name: r.full_name,
    programme: r.programme ?? "",
    year: r.year ?? 1,
    profile_version: r.profile_version,
    status: r.status,
    goals: r.goals ?? "",
    sectors: r.sectors ?? [],
    roles: r.roles ?? [],
    locations: r.locations ?? [],
    work_arrangements: r.work_arrangements ?? [],
    available_from: r.available_from,
    available_to: r.available_to,
    skills: (r.skills ?? []).map((s) => ({
      ...s,
      reviewer: s.evidence_id ? reviewerOf(s.evidence_id) : null,
    })),
    unmapped_skills: r.unmapped_skills ?? [],
    change_note: r.change_note,
    coordinator_comment: null,
    published_at: r.published_at,
  };
}

/** Fields that differ between two feed rows for the same version. Empty means they agree. */
export function compareRows(a: ProfileRow, b: ProfileRow): string[] {
  const keys: (keyof ProfileRow)[] = [
    "student_id",
    "full_name",
    "programme",
    "year",
    "profile_version",
    "goals",
    "sectors",
    "roles",
    "locations",
    "work_arrangements",
    "available_from",
    "available_to",
    "skills",
    "unmapped_skills",
  ];
  const canon = (k: keyof ProfileRow, r: ProfileRow) =>
    JSON.stringify(
      k === "skills"
        ? [...r.skills]
            .sort((x, y) => x.skill_id.localeCompare(y.skill_id))
            .map((s) => [s.skill_id, s.source, s.evidence_id ?? null, s.review_date ?? null])
        : (r[k] ?? null),
    );
  return keys.filter((k) => canon(k, a) !== canon(k, b));
}

export interface ProfileExport {
  contract: typeof CONTRACT_VERSION;
  profile: ProfileRow;
  evidence: Pick<
    EvidenceItem,
    "evidence_id" | "skill_id" | "review_outcome" | "reviewer" | "reviewed_at"
  >[];
}

/** The mock export from the P01 brief: student ID, version, goals, availability and skill evidence status. */
export function exportVersion(s: P01State, version: number): ProfileExport {
  const v = s.versions.find((x) => x.profile_version === version);
  if (!v) throw new RuleError("not_found", `Version ${version} was not found.`);
  const row = toFeedRow(v);
  const used = new Set(row.skills.map((x) => x.evidence_id).filter((x): x is string => !!x));
  return {
    contract: CONTRACT_VERSION,
    profile: row,
    evidence: s.evidence
      .filter((e) => used.has(e.evidence_id) && e.student_id === v.student_id)
      .map(({ evidence_id, skill_id, review_outcome, reviewer, reviewed_at }) => ({
        evidence_id,
        skill_id,
        review_outcome,
        reviewer,
        reviewed_at,
      })),
  };
}
