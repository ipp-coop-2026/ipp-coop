import { describe, expect, it } from "vitest";
import { cleanRequest, fallback, faqMatch, NO_ANSWER, parseModel } from "@/lib/p02/ai-core";
import { LISTINGS, SKILLS, STUDENTS } from "@/lib/p02/data";
import { matchOne, recommend } from "@/lib/p02/match";
import {
  apply,
  deleteListing,
  EMPTY_PROFILE,
  openListings,
  postListing,
  saveProfile,
  seed,
  setAppStatus,
  updateListing,
  validateListing,
} from "@/lib/p02/store";

const NOW = new Date("2026-11-23T12:00:00Z");
const aisha = STUDENTS.find((s) => s.id === "aisha")!;

describe("Launchpad data", () => {
  it("matches Team 2's deck: 13 open listings, 18 standard skills, only standard skills used", () => {
    expect(openListings(seed(), NOW)).toHaveLength(13);
    expect(SKILLS).toHaveLength(18);
    const used = LISTINGS.flatMap((l) => [...l.required, ...l.preferred]);
    expect(used.filter((s) => !SKILLS.includes(s))).toEqual([]);
  });
});

describe("matching", () => {
  it("ranks Aisha's top match as the Computer Vision Intern, with reasons", () => {
    const top = recommend(aisha, openListings(seed(), NOW), 3, NOW);
    expect(top[0]!.listingId).toBe("cv-intern-falcon");
    expect(top[0]!.score).toBe(67);
    expect(top[0]!.required.find((r) => r.skill === "Computer Vision")!.has).toBe(false);
    expect(top).toHaveLength(3);
  });
  it("checks year and deadline separately from the score", () => {
    const noor = STUDENTS.find((s) => s.id === "noor")!;
    const m = matchOne(
      noor,
      LISTINGS.find((l) => l.id === "da-coop-gulf")!,
      NOW,
    );
    expect(m.yearOk).toBe(false);
    expect(m.deadlineOpen).toBe(true);
  });
});

describe("student flow", () => {
  it("needs a profile, blocks duplicates and low years", () => {
    const s0 = seed();
    expect(() => apply(s0, "bi-intern-gulf", NOW)).toThrow(/profile first/);
    const s1 = saveProfile(s0, {
      ...EMPTY_PROFILE,
      name: "Susan Test",
      email: "s@university.example",
      year: "1",
    });
    expect(() => apply(s1, "bi-intern-gulf", NOW)).toThrow(/year 2/);
    const s2 = saveProfile(s1, { ...s1.profile!, year: "3" });
    const s3 = apply(s2, "bi-intern-gulf", NOW);
    expect(() => apply(s3, "bi-intern-gulf", NOW)).toThrow(/already applied/);
    expect(setAppStatus(s3, s3.applications[0]!.id, "Shortlisted").applications[0]!.status).toBe(
      "Shortlisted",
    );
  });
});

describe("employer flow", () => {
  const input = {
    title: "Data Intern",
    city: "Dubai",
    type: "Internship" as const,
    mode: "Remote" as const,
    duration: "12 weeks",
    minYear: 2,
    deadline: "2027-03-01",
    required: ["SQL"],
    preferred: [],
    summary: "",
    description: "Help the analytics team clean data and build weekly dashboards.",
    requirements: [],
  };
  it("posts as Pending Review, edits back to Pending Review, deletes with its applications", () => {
    expect(Object.keys(validateListing({ ...input, title: "", required: [] }))).toEqual([
      "title",
      "required",
    ]);
    const s1 = postListing(seed(), input, NOW);
    expect(s1.listings[0]!.status).toBe("Pending Review");
    expect(s1.listings[0]!.companyId).toBe("gulf-insight");
    const s2 = updateListing(
      {
        ...s1,
        listings: s1.listings.map((l, i) => (i === 0 ? { ...l, status: "Approved" as const } : l)),
      },
      s1.listings[0]!.id,
      { ...input, title: "Data Intern 2" },
    );
    expect(s2.listings[0]!.status).toBe("Pending Review");
    const s3 = deleteListing(seed(), "bi-intern-gulf");
    expect(s3.applications.some((a) => a.listingId === "bi-intern-gulf")).toBe(false);
  });
});

describe("AI tasks", () => {
  it("answers from the approved FAQ and refuses anything else", () => {
    expect(faqMatch("Who approves my placement?")?.a).toMatch(/AI never approves/);
    expect(fallback({ task: "chat", text: "Can I bring my pet?" }).text).toBe(NO_ANSWER);
  });
  it("rejects unknown tasks and keeps suggested skills on the standard list", () => {
    expect(cleanRequest({ task: "approve" })).toBeNull();
    const a = parseModel({ task: "suggest_skills" }, "Python, Kubernetes, sql, Excel", "m");
    expect(a.items).toEqual(["Python", "SQL", "Excel"]);
    expect(
      fallback({ task: "questions", context: { title: "BI Intern", required: ["SQL"] } }).items!
        .length,
    ).toBeGreaterThan(1);
  });
});

describe("Team 3 review inside Launchpad", () => {
  const all = ["completeness", "supervision", "timing", "tasks", "learning"];
  it("keeps Group 2's one-click approve and reject, needs a reason only to request changes, logs REV IDs", async () => {
    const { reviewListing, latestReview } = await import("@/lib/p02/store");
    const s0 = seed();
    const a = reviewListing(s0, "cloud-data-intern", "Approved", { checks: all.slice(0, 4) });
    expect(latestReview(a, "cloud-data-intern")!.reason).toMatch(/4 of 5 checks/);
    expect(
      latestReview(reviewListing(s0, "cloud-data-intern", "Declined"), "cloud-data-intern")!.reason,
    ).toMatch(/Rejected/);
    expect(() =>
      reviewListing(s0, "cloud-data-intern", "Changes Requested", { reason: "" }),
    ).toThrow(/reason/);
    const s1 = reviewListing(s0, "cloud-data-intern", "Changes Requested", {
      reason: "Please name the supervisor.",
    });
    expect(s1.listings.find((l) => l.id === "cloud-data-intern")!.status).toBe("Changes Requested");
    expect(latestReview(s1, "cloud-data-intern")!.id).toBe("REV-0001");
  });
  it("an employer fix becomes version 2 with history, back in the queue", async () => {
    const { reviewListing } = await import("@/lib/p02/store");
    const s1 = reviewListing(seed(), "cloud-data-intern", "Changes Requested", {
      reason: "Please name the supervisor.",
    });
    const l = s1.listings.find((x) => x.id === "cloud-data-intern")!;
    const s2 = updateListing(
      s1,
      l.id,
      { ...l, description: `${l.description} Supervisor: Dr. Example, Data Lead.` },
      NOW,
    );
    const v2 = s2.listings.find((x) => x.id === l.id)!;
    expect(v2.version).toBe(2);
    expect(v2.status).toBe("Pending Review");
    expect(v2.history).toHaveLength(2);
    expect(s2.reviews.at(-1)!.decision).toBe("Resubmitted");
    const s3 = reviewListing(s2, l.id, "Approved", { checks: all });
    expect(s3.listings.find((x) => x.id === l.id)!.status).toBe("Approved");
  });
});

describe("view follows the page", () => {
  it("maps addresses to views and leaves shared pages alone", async () => {
    const { viewForPath } = await import("@/lib/p02/store");
    expect(viewForPath("/employer/applicants/x")).toBe("employer");
    expect(viewForPath("/admin/desk")).toBe("admin");
    expect(viewForPath("/opportunities/da-coop-gulf")).toBe("student");
    expect(viewForPath("/desk")).toBeNull();
    expect(viewForPath("/")).toBeNull();
  });
});
