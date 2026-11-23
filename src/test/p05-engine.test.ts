/**
 * P05 acceptance tests, ported from Team 5's prototype (tests D1–D8, M1, M2, R1, R2, A1–A3, S1, L1).
 * They run on the demo slice, which is identical to the same records in the shared database.
 */
import { describe, expect, it } from "vitest";
import * as P05 from "@/lib/p05";
import { DEMO_DATA, mapListings, mapProfiles, matchStudent, type MatchData, type Recommendation } from "@/lib/p05";
import type { OpportunityRow, ProfileRow } from "@/lib/db";

const STUDENTS = ["COOP-B001", "COOP-B002", "COOP-B003", "COOP-B004", "COOP-B005", "COOP-B006"];
const NO_AI: MatchData = { ...DEMO_DATA, ai: null };

function rec(student: string, opp: string, family: "rules" | "ai" = "rules", data: MatchData = DEMO_DATA, version?: number): Recommendation {
  const res = matchStudent(data, student, family, version);
  const r = res?.records.find((x) => x.opportunity_id === opp);
  if (!r) throw new Error(`no result for ${student} × ${opp}`);
  return r;
}
const all = (family: "rules" | "ai") => STUDENTS.flatMap((s) => matchStudent(DEMO_DATA, s, family)?.records ?? []);
const cond = (r: Recommendation, pred: (c: Recommendation["mandatory"][number]) => boolean) => {
  const c = [...r.mandatory, ...r.desirable].find(pred);
  if (!c) throw new Error("condition not found");
  return c;
};

describe("P05 planted data problems", () => {
  it("D1: a missing end date is 'cannot confirm', not 'not eligible'", () => {
    const r = rec("COOP-B002", "OP-027");
    const c = cond(r, (x) => x.kind === "availability");
    expect(c.state).toBe("cannot_confirm");
    expect(c.detail).toMatch(/availability\.end/);
    expect(r.status).toBe("cannot_confirm");
  });

  it("D2: a self-declared skill satisfies a preference, never a requirement", () => {
    expect(cond(rec("COOP-B003", "OP-027"), (x) => x.cond_id.startsWith("desirable") && x.skill_id === "SK-JIRA-01").state).toBe("met");
    expect(cond(rec("COOP-B003", "OP-028"), (x) => x.cond_id.startsWith("mandatory") && x.skill_id === "SK-JIRA-01").state).toBe("cannot_confirm");
  });

  it("D3: a free-text skill stays unmapped; the AI suggestion is labelled unconfirmed", () => {
    const profile = P05.latestProfile(DEMO_DATA, "COOP-B004")!;
    expect(profile.unmapped_skills).toContain("agile board hygiene");
    expect(profile.skills.some((s) => s.skill_id === "SK-JIRA-01")).toBe(false);
    expect(cond(rec("COOP-B004", "OP-028"), (x) => x.skill_id === "SK-JIRA-01").state).toBe("not_met");
    const ai = rec("COOP-B004", "OP-028", "ai");
    expect(cond(ai, (x) => x.skill_id === "SK-JIRA-01").state).toBe("not_met");
    expect(ai.ai_notes.some((n) => n.skill_id === "SK-JIRA-01" && /unconfirmed/i.test(n.text))).toBe(true);
  });

  it("D4: a listing with no requirements is open to everyone and never reads 'no match'", () => {
    STUDENTS.forEach((s) => {
      const r = rec(s, "OP-029");
      expect(r.status).toBe("eligible");
      expect(r.status_reason).toMatch(/no mandatory conditions/);
    });
  });

  it("D5: a closed listing is excluded with its date and listed last", () => {
    const records = matchStudent(DEMO_DATA, "COOP-B001", "rules")!.records;
    const r = records.find((x) => x.opportunity_id === "OP-030")!;
    expect(r.status).toBe("excluded");
    expect(r.status_reason).toMatch(/Closed on 2026-11-01/);
    expect(records.at(-1)?.opportunity_id).toBe("OP-030");
  });

  it("D6: only the approved version of a listing is ever cited", () => {
    const recs = [...all("rules"), ...all("ai")].filter((r) => r.opportunity_id === "OP-031");
    expect(recs.length).toBeGreaterThan(0);
    recs.forEach((r) => {
      expect(r.opportunity_version).toBe(2);
      r.reasons.forEach((x) => expect(x.opportunity_version).toBe(2));
    });
  });

  it("D8: a remote-only student and an on-site job is a genuine 'not a fit'", () => {
    const r = rec("COOP-B006", "OP-026");
    expect(cond(r, (x) => x.kind === "arrangement").state).toBe("not_met");
    expect(r.status).toBe("not_eligible");
  });
});

describe("P05 measures and repeatability", () => {
  it("M1: every reason names the profile field, the job field and all three versions", () => {
    const reasons = [...all("rules"), ...all("ai")].flatMap((r) => r.reasons);
    expect(reasons.length).toBeGreaterThan(0);
    reasons.forEach((x) => {
      expect(x.profile_field && x.opportunity_field && x.profile_version && x.opportunity_version && x.method_version).toBeTruthy();
    });
  });

  it("M2: unknown or self-declared input is never shown as met", () => {
    const checks = [...all("rules"), ...all("ai")].flatMap((r) => r.mandatory);
    expect(checks.filter((c) => !c.input_present).length).toBeGreaterThan(0);
    expect(checks.filter((c) => !c.input_present && c.state === "met")).toHaveLength(0);
  });

  it("R1: the same inputs always give the same record IDs", () => {
    const a = matchStudent(DEMO_DATA, "COOP-B001", "rules")!.records.map((r) => r.recommendation_id).sort();
    const b = matchStudent(DEMO_DATA, "COOP-B001", "rules")!.records.map((r) => r.recommendation_id).sort();
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it("R2: a changed availability date changes the result, and the record ID", () => {
    const v3 = rec("COOP-B005", "OP-031", "rules", DEMO_DATA, 3);
    const v4 = rec("COOP-B005", "OP-031", "rules", DEMO_DATA, 4);
    expect(cond(v3, (x) => x.kind === "availability").state).toBe("not_met");
    expect(cond(v4, (x) => x.kind === "availability").state).toBe("met");
    expect([v3.status, v4.status]).toEqual(["not_eligible", "eligible"]);
    expect(v3.recommendation_id).not.toBe(v4.recommendation_id);
  });
});

describe("P05 AI method limits", () => {
  it("A1: the AI never changes who can apply", () => {
    STUDENTS.forEach((s) => {
      const rules = matchStudent(DEMO_DATA, s, "rules")!.records;
      const ai = matchStudent(DEMO_DATA, s, "ai")!.records;
      rules.forEach((r) => {
        const a = ai.find((x) => x.opportunity_id === r.opportunity_id)!;
        expect(a.status).toBe(r.status);
        expect(a.mandatory.map((c) => c.state)).toEqual(r.mandatory.map((c) => c.state));
      });
    });
  });

  it("A2: AI scores come from the model and say so; without them the result says 'simulated'", () => {
    const withAi = rec("COOP-B004", "OP-029", "ai");
    const noAi = rec("COOP-B004", "OP-029", "ai", NO_AI);
    expect(withAi.ai_source).toBe("embedding");
    expect(withAi.ai_notes.find((n) => n.kind === "goal_similarity")?.text).toMatch(/gte-small/);
    expect(noAi.ai_source).toBe("lexical-fallback");
    expect(noAi.ai_notes.find((n) => n.kind === "goal_similarity")?.text).toMatch(/simulated/);
    expect(withAi.recommendation_id).not.toBe(noAi.recommendation_id);
  });

  it("A3: AI skill suggestions are unconfirmed preferences, never requirements", () => {
    const recs = all("ai");
    recs.forEach((r) => {
      expect(r.mandatory.some((c) => c.state === "suggested")).toBe(false);
      r.desirable.filter((c) => c.state === "suggested").forEach((c) => expect(c.detail).toMatch(/unconfirmed/i));
    });
    const jira = rec("COOP-B004", "OP-028", "ai").ai_notes.find((n) => n.skill_id === "SK-JIRA-01");
    expect(jira?.via).toBe("embedding");
    expect(jira?.score).toBeGreaterThanOrEqual(P05.AI_PARAMS.suggest_min);
  });

  it("S1: opportunities are ranked for students only; nothing ranks students for an employer", () => {
    expect(Object.keys(P05).filter((n) => /rankStudents|candidate/i.test(n))).toHaveLength(0);
  });
});

describe("P05 shared database mapping", () => {
  it("L1: profile_feed and opportunity_feed rows rebuild the demo records exactly", () => {
    const prof = DEMO_DATA.profiles.find((p) => p.student_id === "COOP-B001" && p.profile_version === 3)!;
    const listing = DEMO_DATA.listings.find((l) => l.opportunity_id === "OP-028")!;
    const v = listing.versions["2"]!;
    const prow: ProfileRow = {
      student_id: prof.student_id, full_name: prof.name, programme: null, year: null, profile_version: 3, status: "submitted", goals: prof.goals,
      sectors: prof.sectors, roles: prof.roles, locations: prof.locations, work_arrangements: prof.work_arrangements as ProfileRow["work_arrangements"],
      available_from: prof.availability.start, available_to: prof.availability.end, change_note: prof.change_note, published_at: prof.published_at,
      skills: prof.skills, unmapped_skills: prof.unmapped_skills,
    };
    const db = (c: (typeof v.mandatory)[number]) => ({
      kind: c.kind, skill_id: c.kind === "skill" ? c.skill_id : null,
      arrangements: c.kind === "arrangement" ? (c.arrangements as ("on-site" | "hybrid" | "remote")[]) : null, city: c.kind === "arrangement" ? c.city : null,
    });
    const orow: OpportunityRow = {
      opportunity_id: "OP-028", version: 2, employer_id: "EMP-003", employer: v.employer, title: v.title, sector: v.sector, role_family: v.role_family,
      city: v.city, work_arrangement: v.work_arrangement as OpportunityRow["work_arrangement"], start_date: v.start_date, end_date: v.end_date,
      description: v.description, tasks: [], submission_status: "resubmitted", approved_version: 2, listing_status: "open", published_at: "2026-10-14",
      closed_on: null, mandatory: v.mandatory.map(db), desirable: v.desirable.map(db),
    };
    expect(mapProfiles([prow])[0]).toEqual(prof);
    expect(mapListings([orow])[0]).toEqual(listing);
  });
});
