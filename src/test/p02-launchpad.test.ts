import { describe, expect, it } from "vitest";
import { durationLabel, filterListings, kindOf, toListing } from "@/lib/p02/listings";
import {
  addSkills,
  applyTo,
  counts,
  decide,
  myApplications,
  saveProfileTo,
  validateProfile,
  EMPTY_PROFILE,
  type StudentState,
} from "@/lib/p02/student-store";
import { modeForPath } from "@/components/AppShell";

const row = {
  opportunity_id: "OP-100",
  version: 2,
  employer_id: "EMP-1",
  employer: "Acme",
  title: "Data Intern",
  sector: null,
  role_family: null,
  city: "Dubai",
  work_arrangement: "hybrid" as const,
  start_date: "2027-02-01",
  end_date: "2027-05-01",
  description: "Synthetic",
  tasks: ["Clean data"],
  submission_status: "submitted",
  approved_version: 2,
  listing_status: "open" as const,
  published_at: null,
  closed_on: null,
  mandatory: [
    { kind: "skill" as const, skill_id: "SK-SQL-01" },
    { kind: "availability" as const, skill_id: null },
    {
      kind: "arrangement" as const,
      skill_id: null,
      arrangements: ["hybrid" as const],
      city: "Dubai",
    },
  ],
  desirable: [{ kind: "skill" as const, skill_id: "SK-PBI-01" }],
};

describe("listings from the shared database", () => {
  it("maps a row to plain words", () => {
    const l = toListing(
      row,
      new Map([
        ["SK-SQL-01", "SQL"],
        ["SK-PBI-01", "Power BI"],
      ]),
    );
    expect(l.skills).toEqual(["SQL", "Power BI"]);
    expect(l.requirements).toEqual([
      "SQL",
      "Available for the full placement dates",
      "Can work hybrid in Dubai",
    ]);
    expect(l.niceToHave).toEqual(["Power BI"]);
    expect(l.arrangement).toBe("Hybrid");
    expect(l.duration).toBe("13 weeks");
    expect(l.kind).toBe("Internship");
  });
  it("labels long placements as co-op and handles missing dates", () => {
    expect(kindOf("2027-01-01", "2027-07-01")).toBe("Co-op");
    expect(durationLabel(null, "2027-01-01")).toBe("");
    expect(durationLabel("2027-01-01", "2027-07-01")).toBe("6 months");
  });
  it("filters by text, city and type", () => {
    const l = toListing(row, new Map([["SK-SQL-01", "SQL"]]));
    expect(filterListings([l], { q: "sql", city: "", kind: "" })).toHaveLength(1);
    expect(filterListings([l], { q: "", city: "Abu Dhabi", kind: "" })).toHaveLength(0);
    expect(filterListings([l], { q: "", city: "", kind: "Co-op" })).toHaveLength(0);
  });
});

describe("student profile and applications", () => {
  const empty: StudentState = { profile: null, applications: [] };
  const profile = {
    ...EMPTY_PROFILE,
    fullName: "Aisha Al Zaabi",
    email: "aisha@university.example",
  };
  it("requires a name and a valid email, and dedupes skills", () => {
    expect(Object.keys(validateProfile(EMPTY_PROFILE))).toEqual(["fullName", "email"]);
    expect(addSkills(["SQL"], "sql, Python ,  ,python")).toEqual(["SQL", "Python"]);
  });
  it("blocks applying without a profile and applying twice", () => {
    const l = { id: "OP-100", title: "Data Intern", employer: "Acme" };
    expect(() => applyTo(empty, l)).toThrow(/profile first/);
    const s1 = saveProfileTo(empty, profile);
    const { state: s2, id } = applyTo(s1, l);
    expect(myApplications(s2)).toHaveLength(1);
    expect(() => applyTo(s2, l)).toThrow(/already applied/);
    const s3 = decide(s2, id, "Approved");
    expect(counts(s3.applications)).toEqual({ submitted: 0, approved: 1, rejected: 0 });
  });
});

describe("view as switch", () => {
  it("admin pages switch to admin, student pages to student, shared pages keep the last view", () => {
    expect(modeForPath("/admin/shared")).toBe("admin");
    expect(modeForPath("/opportunities/OP-1", "admin")).toBe("student");
    expect(modeForPath("/desk", "admin")).toBe("admin");
    expect(modeForPath("/employer")).toBe("student");
  });
});
