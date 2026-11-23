import { describe, expect, it } from "vitest";
import { addOpportunity, makeSeed, searchApprovedOpportunities } from "@/lib/ipp-store";
import {
  addRule,
  decisionLog,
  decline,
  declinedListings,
  latestChangeRequest,
  reconcile,
  recordFor,
  removeRule,
  requestChanges,
  reviewQueue,
  type Combined,
} from "@/lib/p03/review";
import { buildPrompt, cleanInput, parseReply } from "@/lib/p03/ai-review-core";

function start(): { c: Combined; id: string } {
  const r = addOpportunity(makeSeed(), {
    organization_name: "Harbor Health",
    title: "Research Assistant Intern",
    description: "Synthetic: unpaid, no tasks listed.",
    location: "Abu Dhabi",
    work_mode: "Hybrid",
    duration: "12 weeks",
  });
  return { c: { ipp: r.data, p03: { records: {}, events: [] } }, id: r.opportunity.opportunity_id };
}

describe("P03 decline", () => {
  it("needs a reason, leaves the queue, stays hidden from students, and is logged", () => {
    const { c, id } = start();
    expect(() => decline(c, id, "")).toThrow(/reason/);
    const d = decline(c, id, "This is not an internship: no tasks or supervisor.", {
      ai_assisted: true,
    });
    expect(recordFor(d, id).review_status).toBe("Declined");
    expect(reviewQueue(d).map((i) => i.opportunity.opportunity_id)).not.toContain(id);
    expect(declinedListings(d).map((i) => i.opportunity.opportunity_id)).toContain(id);
    expect(searchApprovedOpportunities(d.ipp, "").map((o) => o.opportunity_id)).not.toContain(id);
    const e = latestChangeRequest(d, id)!;
    expect(e.type).toBe("Declined");
    expect(e.ai_assisted).toBe(true);
    expect(e.review_id).toMatch(/^REV-\d{4}$/);
    expect(decisionLog(d)[0]!.type).toBe("Declined");
  });
  it("cannot decline something already sent back", () => {
    const { c, id } = start();
    const sent = requestChanges(c, id, "Please list the tasks.");
    expect(() => decline(sent, id, "No longer wanted.")).toThrow(/not Pending Review/);
  });
});

describe("P03 review rules", () => {
  it("adds, numbers and removes rules, and reconcile keeps them", () => {
    const { c } = start();
    expect(() => addRule(c, "short")).toThrow(/full sentence/);
    const one = addRule(c, "Unpaid placements must say so in the title.");
    const two = addRule(one, "Overseas placements must state who covers travel.");
    expect(two.p03.rules!.map((r) => r.rule_id)).toEqual(["RULE-001", "RULE-002"]);
    expect(reconcile(two).p03.rules).toHaveLength(2);
    expect(removeRule(two, "RULE-001").p03.rules!.map((r) => r.rule_id)).toEqual(["RULE-002"]);
  });
});

describe("AI reviewer input and output handling", () => {
  it("cleans input, clips long fields and keeps employer text inside the submission tag", () => {
    expect(cleanInput(null)).toBeNull();
    expect(cleanInput({ submission: { title: "", description: "" } })).toBeNull();
    const input = cleanInput({
      submission: { title: "Intern", description: "x".repeat(5000), organization: "Acme" },
      rules: ["Unpaid placements must say so.", ""],
    })!;
    expect(input.submission.description).toHaveLength(3000);
    expect(input.rules).toEqual(["Unpaid placements must say so."]);
    const { system, user } = buildPrompt(input);
    expect(system).toContain("Unpaid placements must say so.");
    expect(user.startsWith("<submission>")).toBe(true);
  });
  it("parses a reply and treats unknown statuses as a judgement call", () => {
    const r: { checks: Record<string, { status: string }> } = parseReply(
      'Here: {"checks":{"completeness":{"status":"ok","note":"All there."},"supervision":{"status":"maybe"}},"rule_flags":[],"summary":"s","draft_reason":""}',
    );
    expect(r.checks["completeness"]?.status).toBe("ok");
    expect(r.checks["supervision"]?.status).toBe("judgement");
    expect(r.checks["learning"]?.status).toBe("judgement");
    expect(() => parseReply("no json here")).toThrow();
  });
});

describe("AI reviewer reply repair", () => {
  it("salvages a cut-off reply and one with a stray quote", () => {
    const cut =
      '{"checks":{"completeness":{"status":"ok","note":"All fields."},"supervision":{"status":"problem","note":"No supervisor named."},"timing":{"status":"ok","note":"12 weeks"}},"rule_flags":[],"summary":"Mostly complete.","draft_reason":"Please name the superv';
    const r: { checks: Record<string, { status: string }>; summary: string } = parseReply(cut);
    expect(r.checks["supervision"]?.status).toBe("problem");
    expect(r.checks["learning"]?.status).toBe("judgement");
    expect(r.summary).toBe("Mostly complete.");
    const quote =
      '{"checks":{"tasks":{"status":"ok","note":"Lists "real" tasks."}},"rule_flags":[],"summary":"Fine.","draft_reason":""}';
    const q: { summary: string } = parseReply(quote);
    expect(q.summary).toBe("Fine.");
  });
});
