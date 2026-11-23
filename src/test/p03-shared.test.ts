import { describe, expect, it, vi } from "vitest";
import {
  byStage,
  deriveItems,
  sharedChanges,
  sharedHints,
  stageCounts,
  type VersionRow,
} from "@/lib/p03/shared-review";
import { apply, nextReviewId, validate, WriteRefused } from "@/lib/p03/shared-write";

const v = (id: string, version: number, extra: Partial<VersionRow> = {}): VersionRow => ({
  opportunity_id: id,
  version,
  employer_id: "EMP-1",
  title: `Role ${id}`,
  sector: "tech",
  role_family: "data",
  city: "Abu Dhabi",
  work_arrangement: "hybrid",
  start_date: "2027-02-01",
  end_date: "2027-05-01",
  description: "Synthetic",
  tasks: ["Clean data"],
  supervisor_name: "Dr. Example",
  submission_status: "submitted",
  submitted_at: `2026-11-1${version}T10:00:00Z`,
  ...extra,
});
const rev = (
  id: string,
  version: number,
  decision: "approved" | "clarification_requested" | "declined",
  at = "2026-11-18T00:00:00Z",
) => ({
  review_id: `REV-0${version}${id.slice(-2)}`,
  opportunity_id: id,
  version,
  decision,
  reviewer: "R",
  reason: "x",
  decided_at: at,
});

const snap = {
  employers: [{ employer_id: "EMP-1", name: "Acme" }],
  versions: [
    v("OP-101", 1),
    v("OP-102", 1),
    v("OP-102", 2, { submission_status: "resubmitted", title: "New title" }),
    v("OP-103", 1),
    v("OP-104", 1),
    v("OP-105", 1),
    v("OP-106", 1, { submission_status: "withdrawn" }),
    v("OP-107", 1),
  ],
  reviews: [
    rev("OP-102", 1, "clarification_requested"),
    rev("OP-103", 1, "approved"),
    rev("OP-104", 1, "approved"),
    rev("OP-105", 1, "declined"),
    rev("OP-107", 1, "clarification_requested"),
  ],
  listings: [
    {
      opportunity_id: "OP-104",
      approved_version: 1,
      listing_status: "open" as const,
      published_at: "2026-11-18",
      closed_on: null,
    },
  ],
};

describe("shared review: stages", () => {
  const items = deriveItems(snap);
  const stage = (id: string) => items.find((i) => i.id === id)!.stage;
  it("puts each opportunity at its latest version in the right stage", () => {
    expect(stage("OP-101")).toBe("pending");
    expect(stage("OP-102")).toBe("pending"); // resubmitted v2 has no decision yet
    expect(stage("OP-103")).toBe("ready_to_publish");
    expect(stage("OP-104")).toBe("open");
    expect(stage("OP-105")).toBe("declined");
    expect(stage("OP-106")).toBe("withdrawn");
    expect(stage("OP-107")).toBe("waiting_employer");
    expect(stageCounts(items).pending).toBe(2);
  });
  it("keeps the previous version for the diff and sorts the queue oldest first", () => {
    const op102 = items.find((i) => i.id === "OP-102")!;
    expect(sharedChanges(op102.previous!, op102.latest)).toEqual([
      { field: "Title", before: "Role OP-102", after: "New title" },
    ]);
    expect(byStage(items, "pending").map((i) => i.id)).toEqual(["OP-101", "OP-102"]);
  });
});

describe("shared review: checklist hints", () => {
  it("flags a missing supervisor, tasks and bad dates", () => {
    const h = sharedHints(
      v("OP-1", 1, { supervisor_name: "TBC", tasks: [], end_date: "2027-01-01" }),
    );
    expect(h.supervision.ok).toBe(false);
    expect(h.tasks.ok).toBe(false);
    expect(h.timing.ok).toBe(false);
    expect(h.learning.ok).toBeNull();
    expect(sharedHints(v("OP-1", 1)).completeness.ok).toBe(true);
  });
});

describe("shared writes: validation", () => {
  const ok = {
    action: "decide",
    opportunity_id: "OP-999",
    version: 2,
    decision: "clarification_requested",
    reason: "Please add tasks.",
  };
  it("is off without a key and keeps the sandbox and protected rules", () => {
    expect(() => validate(ok, "off")).toThrow(/switched off/);
    expect(() => validate({ ...ok, opportunity_id: "OP-150" }, "sandbox")).toThrow(/sandbox/);
    expect(() => validate({ ...ok, opportunity_id: "OP-028" }, "all")).toThrow(/protected/);
    expect(validate({ ...ok, opportunity_id: "OP-150" }, "all").opportunity_id).toBe("OP-150");
  });
  it("needs all five checks to approve and a reason otherwise", () => {
    expect(() =>
      validate({ ...ok, decision: "approved", checks: ["completeness"] }, "sandbox"),
    ).toThrow(/Tick every check/);
    expect(() => validate({ ...ok, reason: "" }, "sandbox")).toThrow(/reason/);
    const all = ["completeness", "supervision", "timing", "tasks", "learning"];
    expect(
      validate({ ...ok, decision: "approved", checks: all, reason: "" }, "sandbox").action,
    ).toBe("decide");
  });
  it("numbers reviews after the highest real ID, ignoring sandbox IDs", () => {
    expect(nextReviewId(["REV-0375", "REV-0012", "REV-9999", "REV-9998"])).toBe("REV-0376");
  });
});

describe("shared writes: apply re-reads the database first", () => {
  it("refuses a decision on a stale version", async () => {
    const f = vi.fn(async (url: string) => {
      const body = String(url).includes("opportunity_versions")
        ? [{ version: 3, submission_status: "resubmitted" }]
        : [];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    await expect(
      apply(
        {
          action: "decide",
          opportunity_id: "OP-999",
          version: 2,
          decision: "declined",
          reason: "No",
          checks: [],
        },
        f as unknown as typeof fetch,
      ),
    ).rejects.toThrow(WriteRefused);
  });
});
