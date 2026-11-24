/**
 * Starting records for the P01 demo. Versions 2 and 3 are copies of Layla Hassan's rows in the shared
 * database's `profile_feed` (read 24 Nov 2026). E-JIRA-01 is a declared stand-in for P06: it is not in
 * the shared database, where the binder's thread keeps Jira self-declared.
 */
import type { ProfileRow } from "@/lib/db";
import { fromFeedRow } from "./contract";
import type { EvidenceItem, P01State } from "./types";

export const SEED_ROWS: ProfileRow[] = [
  {
    student_id: "COOP-B001",
    full_name: "Layla Hassan",
    programme: "BSc Data Science",
    year: 3,
    profile_version: 2,
    status: "submitted",
    goals: "Learn how airline operations data drives on-time performance.",
    sectors: ["aviation"],
    roles: ["data analyst"],
    locations: ["Dubai"],
    work_arrangements: ["on-site", "hybrid"],
    available_from: "2027-01-15",
    available_to: "2027-06-30",
    change_note: "First submitted profile",
    published_at: "2026-10-02",
    skills: [
      { skill_id: "SK-PY-01", source: "self_declared", evidence_id: null, review_date: null },
      {
        skill_id: "SK-SQL-01",
        source: "reviewed",
        evidence_id: "E-SQL-07",
        review_date: "2026-10-12",
      },
    ],
    unmapped_skills: [],
  },
  {
    student_id: "COOP-B001",
    full_name: "Layla Hassan",
    programme: "BSc Data Science",
    year: 3,
    profile_version: 3,
    status: "submitted",
    goals:
      "Learn how airline operations data drives on-time performance and build aviation analytics dashboards in Dubai.",
    sectors: ["aviation", "logistics"],
    roles: ["data analyst", "operations analyst"],
    locations: ["Dubai"],
    work_arrangements: ["on-site", "hybrid"],
    available_from: "2027-01-15",
    available_to: "2027-06-30",
    change_note: "Added Jira and Power BI (self-declared); Python reviewed by P06",
    published_at: "2026-10-21",
    skills: [
      { skill_id: "SK-COM-01", source: "self_declared", evidence_id: null, review_date: null },
      { skill_id: "SK-JIRA-01", source: "self_declared", evidence_id: null, review_date: null },
      { skill_id: "SK-PBI-01", source: "self_declared", evidence_id: null, review_date: null },
      {
        skill_id: "SK-PY-01",
        source: "reviewed",
        evidence_id: "E-PY-02",
        review_date: "2026-10-15",
      },
      {
        skill_id: "SK-SQL-01",
        source: "reviewed",
        evidence_id: "E-SQL-07",
        review_date: "2026-10-12",
      },
    ],
    unmapped_skills: [],
  },
];

const P06 = "P06 reviewer (synthetic)";
export const SEED_EVIDENCE: EvidenceItem[] = [
  {
    evidence_id: "E-SQL-07",
    student_id: "COOP-B001",
    skill_id: "SK-SQL-01",
    activity: "SQL practice set: flight delays",
    review_outcome: "demonstrated",
    reviewer: P06,
    reviewed_at: "2026-10-12",
    accepted_in: 2,
  },
  {
    evidence_id: "E-PY-02",
    student_id: "COOP-B001",
    skill_id: "SK-PY-01",
    activity: "pandas notebook: on-time performance",
    review_outcome: "demonstrated",
    reviewer: P06,
    reviewed_at: "2026-10-15",
    accepted_in: 3,
  },
  {
    evidence_id: "E-JIRA-01",
    student_id: "COOP-B001",
    skill_id: "SK-JIRA-01",
    activity: "Jira practice board: create, assign and update work items",
    review_outcome: "pending",
    reviewer: null,
    reviewed_at: null,
    accepted_in: null,
  },
  {
    evidence_id: "E-PBI-11",
    student_id: "COOP-B002",
    skill_id: "SK-PBI-01",
    activity: "Power BI dashboard: freight delays",
    review_outcome: "demonstrated",
    reviewer: P06,
    reviewed_at: "2026-11-18",
    accepted_in: null,
  },
];

export function makeP01Seed(): P01State {
  const reviewer = (id: string) =>
    SEED_EVIDENCE.find((e) => e.evidence_id === id)?.reviewer ?? null;
  const versions = SEED_ROWS.map((r) => fromFeedRow(r, reviewer)).map((v) =>
    v.profile_version === 3
      ? // Layla attached E-JIRA-01 to her self-declared Jira skill. It is a reference, not a review.
        {
          ...v,
          skills: v.skills.map((s) =>
            s.skill_id === "SK-JIRA-01" ? { ...s, evidence_id: "E-JIRA-01" } : s,
          ),
        }
      : v,
  );
  return {
    student_id: "COOP-B001",
    versions,
    evidence: SEED_EVIDENCE.map((e) => ({ ...e })),
    events: [
      {
        at: "2026-10-02T08:00:00.000Z",
        actor: "student",
        action: "Submitted version 2",
        profile_version: 2,
      },
      {
        at: "2026-10-21T08:00:00.000Z",
        actor: "student",
        action: "Submitted version 3",
        profile_version: 3,
      },
    ],
    questions: [],
  };
}
