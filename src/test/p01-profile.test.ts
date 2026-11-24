import { describe, expect, it } from "vitest";
import {
  acceptEvidence,
  addSkills,
  answerQuestion,
  applyPatch,
  approvals,
  askPerson,
  compareRows,
  contentOf,
  currentReviewed,
  diffVersions,
  exportVersion,
  fromFeedRow,
  latest,
  makeP01Seed,
  mapSkill,
  markReviewed,
  recordEvidenceOutcome,
  requestClarification,
  RuleError,
  saveDraft,
  SEED_ROWS,
  startRevision,
  submitProfile,
  toFeedRow,
  validateProfile,
  type P01State,
  type ProfileContent,
  type RuleCode,
  type Seen,
  type Term,
} from "@/lib/p01";
import { DEMO_DATA, mapListings, mapProfiles, matchStudent } from "@/lib/p05";
import type { OpportunityRow } from "@/lib/db";

const AT = "2026-11-24T06:00:00.000Z";
const TODAY = "2026-11-24";
const VOCAB: Term[] = [
  { skill_id: "SK-JIRA-01", label: "Jira work tracking", synonyms: ["jira"] },
  { skill_id: "SK-TAB-01", label: "Tableau", synonyms: ["tableau", "data visualisation"] },
  { skill_id: "SK-PY-01", label: "Python for data analysis", synonyms: ["python", "pandas"] },
];
const seen = (s: P01State): Seen => ({
  profile_version: latest(s).profile_version,
  status: latest(s).status,
});
const refused = (fn: () => unknown): RuleCode | "allowed" => {
  try {
    fn();
    return "allowed";
  } catch (e) {
    if (e instanceof RuleError) return e.code;
    throw e;
  }
};
const good = (s: P01State): ProfileContent => contentOf(latest(s));

const clarified = () =>
  requestClarification(
    makeP01Seed(),
    "coordinator",
    seen(makeP01Seed()),
    "Which airline question do you want to answer?",
    AT,
  );
const draft = () => {
  const s = clarified();
  return startRevision(s, "student", seen(s), AT);
};
const submitted = () => {
  const s = draft();
  return submitProfile(
    s,
    "student",
    seen(s),
    { ...good(s), goals: "Find out which ground-handling steps delay departures most often." },
    "Clearer goal",
    AT,
  );
};
const reviewed = () => {
  const s = submitted();
  return markReviewed(s, "coordinator", seen(s), AT);
};
const demonstrated = () =>
  recordEvidenceOutcome(reviewed(), "E-JIRA-01", "demonstrated", "P06 reviewer (stand-in)", AT);

describe("P01 acceptance 1: draft, submit, clarify, revise", () => {
  it("walks Layla's profile through every state and keeps the comment visible", () => {
    const s = clarified();
    expect(latest(s).status).toBe("clarification_requested");
    const d = startRevision(s, "student", seen(s), AT);
    expect(latest(d)).toMatchObject({
      profile_version: 4,
      status: "draft",
      coordinator_comment: "Which airline question do you want to answer?",
    });
    expect(latest(submitted())).toMatchObject({
      profile_version: 4,
      status: "submitted",
      change_note: "Clearer goal",
    });
    expect(latest(reviewed())).toMatchObject({ profile_version: 4, status: "reviewed" });
  });
  it("saves an incomplete draft without checking it", () => {
    const s = draft();
    expect(latest(saveDraft(s, "student", seen(s), { ...good(s), goals: "" }, AT)).goals).toBe("");
  });
  it("needs a comment the student can act on", () => {
    const s = makeP01Seed();
    expect(refused(() => requestClarification(s, "coordinator", seen(s), "ok?", AT))).toBe(
      "invalid",
    );
  });
  it("needs a change note on every later version", () => {
    const s = draft();
    expect(refused(() => submitProfile(s, "student", seen(s), good(s), " ", AT))).toBe("invalid");
  });
  it("logs who did what on which version", () => {
    expect(
      reviewed()
        .events.slice(-4)
        .map((e) => `${e.actor}:${e.profile_version}`),
    ).toEqual(["coordinator:3", "student:4", "student:4", "coordinator:4"]);
  });
});

describe("P01 acceptance 2: required fields and date ranges", () => {
  const c = good(makeP01Seed());
  it("accepts a complete profile", () => expect(validateProfile(c, TODAY)).toEqual({}));
  it.each([
    ["goals", { goals: "  " }],
    ["goals", { goals: "Too short" }],
    ["sectors", { sectors: [] }],
    ["roles", { roles: [] }],
    ["locations", { locations: [] }],
    ["work_arrangements", { work_arrangements: [] }],
    ["available_from", { available_from: null }],
    ["available_to", { available_to: null }],
    ["available_to", { available_to: "2027-01-15" }],
    ["available_to", { available_from: "2026-01-01", available_to: "2026-02-01" }],
    ["available_from", { available_from: "2027-02-30" }],
    ["skills", { skills: [] }],
  ] as [keyof ProfileContent, Partial<ProfileContent>][])("reports %s", (field, patch) => {
    expect(validateProfile({ ...c, ...patch }, TODAY)[field]).toBeTruthy();
  });
  it("prevents submission and leaves the draft as it was", () => {
    const s = draft();
    expect(
      refused(() =>
        submitProfile(
          s,
          "student",
          seen(s),
          { ...good(s), available_to: "2026-12-01" },
          "New dates",
          AT,
        ),
      ),
    ).toBe("invalid");
    expect(latest(s).status).toBe("draft");
  });
});

describe("P01 acceptance 3: self-declared until evidence is reviewed", () => {
  const jira = (s: P01State) => latest(s).skills.find((x) => x.skill_id === "SK-JIRA-01")!;
  it("keeps Jira self-declared with its evidence reference through the review", () => {
    expect(jira(reviewed())).toMatchObject({
      source: "self_declared",
      evidence_id: "E-JIRA-01",
      reviewer: null,
    });
  });
  it.each(["pending", "revision_requested", "not_demonstrated"] as const)(
    "refuses %s evidence",
    (outcome) => {
      const s =
        outcome === "pending"
          ? reviewed()
          : recordEvidenceOutcome(reviewed(), "E-JIRA-01", outcome, "P06 reviewer (stand-in)", AT);
      expect(refused(() => acceptEvidence(s, "coordinator", "E-JIRA-01", AT))).toBe("evidence");
      expect(jira(s).source).toBe("self_declared");
    },
  );
  it("records who and when, and keeps the original evidence ID", () => {
    const s = acceptEvidence(demonstrated(), "coordinator", "E-JIRA-01", AT);
    expect(latest(s)).toMatchObject({ profile_version: 5, status: "reviewed" });
    expect(jira(s)).toEqual({
      skill_id: "SK-JIRA-01",
      source: "reviewed",
      evidence_id: "E-JIRA-01",
      review_date: TODAY,
      reviewer: "P06 reviewer (stand-in)",
    });
    expect(
      s.versions
        .find((v) => v.profile_version === 4)!
        .skills.find((x) => x.skill_id === "SK-JIRA-01")!.source,
    ).toBe("self_declared");
  });
  it("refuses another student's evidence, repeats, missing records and evidence without a reviewer", () => {
    const s = acceptEvidence(demonstrated(), "coordinator", "E-JIRA-01", AT);
    expect(refused(() => acceptEvidence(s, "coordinator", "E-PBI-11", AT))).toBe("evidence");
    expect(refused(() => acceptEvidence(s, "coordinator", "E-JIRA-01", AT))).toBe("evidence");
    expect(refused(() => acceptEvidence(s, "coordinator", "E-NONE-01", AT))).toBe("not_found");
    const unsigned = {
      ...demonstrated(),
      evidence: demonstrated().evidence.map((e) =>
        e.evidence_id === "E-JIRA-01" ? { ...e, reviewer: null } : e,
      ),
    };
    expect(refused(() => acceptEvidence(unsigned, "coordinator", "E-JIRA-01", AT))).toBe(
      "evidence",
    );
  });
  it("does not change a profile that is being edited or reviewed", () => {
    const s = recordEvidenceOutcome(
      submitted(),
      "E-JIRA-01",
      "demonstrated",
      "P06 reviewer (stand-in)",
      AT,
    );
    expect(refused(() => acceptEvidence(s, "coordinator", "E-JIRA-01", AT))).toBe("status");
  });
  it("a student cannot mark a skill as reviewed by editing it", () => {
    const s = draft();
    const forged = good(s).skills.map((x) => ({
      ...x,
      source: "reviewed" as const,
      evidence_id: "E-FAKE-01",
      review_date: TODAY,
      reviewer: "me",
    }));
    const after = latest(
      saveDraft(
        s,
        "student",
        seen(s),
        {
          ...good(s),
          skills: [
            ...forged,
            {
              skill_id: "SK-TAB-01",
              source: "reviewed",
              evidence_id: "E-FAKE-02",
              review_date: TODAY,
              reviewer: "me",
            },
          ],
        },
        AT,
      ),
    );
    expect(after.skills.filter((x) => x.source === "reviewed").map((x) => x.evidence_id)).toEqual([
      "E-PY-02",
      "E-SQL-07",
    ]);
  });
});

describe("P01 acceptance 4: export and hand-off contract", () => {
  it("keeps student ID, version, goals, availability and skill evidence status", () => {
    const out = exportVersion(acceptEvidence(demonstrated(), "coordinator", "E-JIRA-01", AT), 5);
    expect(out.contract).toBe("p01-profile/1");
    expect(out.profile).toMatchObject({
      student_id: "COOP-B001",
      profile_version: 5,
      available_from: "2027-01-15",
      available_to: "2027-06-30",
      status: "reviewed",
    });
    expect(out.profile.skills).toContainEqual({
      skill_id: "SK-JIRA-01",
      source: "reviewed",
      evidence_id: "E-JIRA-01",
      review_date: TODAY,
    });
    expect(out.evidence.map((e) => e.evidence_id).sort()).toEqual([
      "E-JIRA-01",
      "E-PY-02",
      "E-SQL-07",
    ]);
  });
  it("never hands over drafts or clarification requests", () => {
    expect(refused(() => toFeedRow(latest(draft())))).toBe("status");
    expect(refused(() => toFeedRow(latest(clarified())))).toBe("status");
  });
  it("sends evidence IDs only for reviewed skills", () => {
    expect(toFeedRow(latest(reviewed())).skills.find((x) => x.skill_id === "SK-JIRA-01")).toEqual({
      skill_id: "SK-JIRA-01",
      source: "self_declared",
      evidence_id: null,
      review_date: null,
    });
  });
  it("round-trips the class database's rows without losing a field", () => {
    for (const row of SEED_ROWS) expect(compareRows(toFeedRow(fromFeedRow(row)), row)).toEqual([]);
  });
  it("names the fields that differ", () => {
    expect(
      compareRows(SEED_ROWS[0]!, { ...SEED_ROWS[0]!, goals: "Other", available_to: null }),
    ).toEqual(["goals", "available_to"]);
  });
});

describe("P05 reads P01 versions through the contract", () => {
  const OP_028: OpportunityRow = {
    opportunity_id: "OP-028",
    version: 2,
    employer_id: "EMP-003",
    employer: "Emirates Group",
    title: "Aviation Analytics Intern",
    sector: "aviation",
    role_family: "data analyst",
    city: "Dubai",
    work_arrangement: "hybrid",
    start_date: "2027-02-01",
    end_date: "2027-05-31",
    description: "",
    tasks: [],
    submission_status: "submitted",
    approved_version: 2,
    listing_status: "open",
    published_at: "2026-10-14",
    closed_on: null,
    mandatory: [
      { kind: "skill", skill_id: "SK-SQL-01" },
      { kind: "skill", skill_id: "SK-JIRA-01" },
      { kind: "availability", skill_id: null },
      { kind: "arrangement", skill_id: null, arrangements: ["hybrid", "on-site"], city: "Dubai" },
    ],
    desirable: [],
  };
  const result = (s: P01State, n: number) =>
    matchStudent(
      {
        vocabulary: DEMO_DATA.vocabulary,
        profiles: mapProfiles([toFeedRow(s.versions.find((v) => v.profile_version === n)!)]),
        listings: mapListings([OP_028]),
        evidence: [],
        ai: null,
      },
      "COOP-B001",
      "rules",
    )!.records[0]!.status;
  it("moves OP-028 from cannot confirm to eligible only after Jira evidence is accepted", () => {
    const s = acceptEvidence(demonstrated(), "coordinator", "E-JIRA-01", AT);
    expect(
      [3, 4, 5].map((n) =>
        result(
          {
            ...s,
            versions: s.versions.map((v) =>
              v.profile_version === 3 ? { ...v, status: "submitted" } : v,
            ),
          },
          n,
        ),
      ),
    ).toEqual(["cannot_confirm", "cannot_confirm", "eligible"]);
  });
});

describe("access, version and status rules", () => {
  it("students cannot review and coordinators cannot edit", () => {
    const s = makeP01Seed();
    expect(refused(() => markReviewed(s, "student", seen(s), AT))).toBe("access");
    expect(
      refused(() => requestClarification(s, "student", seen(s), "Please explain this.", AT)),
    ).toBe("access");
    expect(refused(() => acceptEvidence(demonstrated(), "student", "E-JIRA-01", AT))).toBe(
      "access",
    );
    const d = draft();
    expect(refused(() => saveDraft(d, "coordinator", seen(d), good(d), AT))).toBe("access");
    expect(refused(() => submitProfile(d, "coordinator", seen(d), good(d), "x", AT))).toBe(
      "access",
    );
  });
  it("locks a submitted version for the student", () => {
    const s = makeP01Seed();
    expect(refused(() => saveDraft(s, "student", seen(s), good(s), AT))).toBe("status");
    expect(refused(() => startRevision(s, "student", seen(s), AT))).toBe("status");
  });
  it("refuses actions on an out-of-date page", () => {
    const old = seen(makeP01Seed());
    expect(refused(() => markReviewed(clarified(), "coordinator", old, AT))).toBe("stale");
    expect(
      refused(() =>
        saveDraft(
          submitted(),
          "student",
          { profile_version: 4, status: "draft" },
          good(submitted()),
          AT,
        ),
      ),
    ).toBe("stale");
  });
  it("keeps one open draft and never edits older versions", () => {
    const s = draft();
    expect(refused(() => startRevision(s, "student", seen(s), AT))).toBe("status");
    expect(reviewed().versions.slice(0, 1)).toEqual(makeP01Seed().versions.slice(0, 1));
  });
  it("other teams get the newest reviewed version, even while a newer draft is open", () => {
    const s = reviewed();
    const d = startRevision(s, "student", seen(s), AT);
    expect(currentReviewed(makeP01Seed())).toBeNull();
    expect(currentReviewed(d)!.profile_version).toBe(4);
  });
  it("does not change its input", () => {
    const s = makeP01Seed();
    const before = JSON.stringify(s);
    requestClarification(s, "coordinator", seen(s), "Which airline question?", AT);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("skills, changes and open questions", () => {
  it("maps known terms and keeps unknown ones as written", () => {
    expect(mapSkill(" JIRA ", VOCAB)?.skill_id).toBe("SK-JIRA-01");
    expect(mapSkill("juggling", VOCAB)).toBeNull();
    const c = addSkills(
      { ...good(makeP01Seed()), skills: [] },
      ["pandas", "python", "Juggling", "juggling"],
      VOCAB,
    );
    expect(c.skills.map((x) => [x.skill_id, x.source])).toEqual([["SK-PY-01", "self_declared"]]);
    expect(c.unmapped_skills).toEqual(["Juggling"]);
  });
  it("applies a proposal to the form only", () => {
    const c = applyPatch(
      good(makeP01Seed()),
      {
        available_from: "2027-02-01",
        add_skills: ["Tableau"],
        add_sectors: ["Aviation", "energy"],
      },
      VOCAB,
    );
    expect(c.available_from).toBe("2027-02-01");
    expect(c.sectors).toEqual(["aviation", "logistics", "energy"]);
    expect(c.skills.find((x) => x.skill_id === "SK-TAB-01")?.source).toBe("self_declared");
  });
  it("shows the coordinator only what changed", () => {
    const s = submitted();
    expect(diffVersions(s.versions[1]!, latest(s), (id) => id).map((d) => d.field)).toEqual([
      "Learning goal",
    ]);
  });
  it("lists what people still decide", () => {
    expect(approvals(makeP01Seed()).map((a) => a.state)).toEqual(["waiting", "waiting", "later"]);
    expect(approvals(reviewed())[0]!.state).toBe("done");
  });
  it("sends unanswered questions to a person once, and only a coordinator answers", () => {
    let s = askPerson(makeP01Seed(), "Is there parking?", AT);
    s = askPerson(s, "is there parking?", AT);
    expect(s.questions).toHaveLength(1);
    expect(refused(() => answerQuestion(s, "student", "Q-001", "Yes", AT))).toBe("access");
    s = answerQuestion(s, "coordinator", "Q-001", "Ask the host company.", AT);
    expect(s.questions[0]!.answer).toBe("Ask the host company.");
    expect(refused(() => answerQuestion(s, "coordinator", "Q-001", "Again", AT))).toBe("status");
  });
});
