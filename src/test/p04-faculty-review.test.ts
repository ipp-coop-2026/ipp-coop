import { describe, expect, it } from "vitest";
import { APPLICATIONS, COMPANIES, LISTINGS } from "@/lib/p02/data";
import {
  FACULTY_ACTOR,
  addHrComment,
  addSlots,
  dateInput,
  freeSlots,
  generate,
  gradeOf,
  internshipStatus,
  inviteStudent,
  meetingAction,
  meetingStats,
  reportAction,
  reportStats,
  reportStatus,
  reportsOf,
  requestMeeting,
  riskOf,
  seedP04,
  submitGrade,
  syncPlacements,
  type Actor,
  type Directory,
  type P04State,
  type Result,
} from "@/lib/p04";

// Fixed clock: Wednesday 25 Nov 2026, 12:00 Gulf time.
const NOW = Date.parse("2026-11-25T08:00:00Z");
const NAMES: Record<string, string> = {
  latifa: "Latifa Al Suwaidi",
  rashed: "Rashed Al Falasi",
  aisha: "Aisha Al Zaabi",
  hamad: "Hamad Al Blooshi",
};
const dir: Directory = {
  studentName: (id) => NAMES[id] ?? id,
  listing: (id) => LISTINGS.find((l) => l.id === id),
  company: (id) => COMPANIES.find((c) => c.id === id),
};
const ok = (r: Result): P04State => {
  if (!r.ok) throw new Error(r.msg);
  return r.state;
};
const byStudent = (s: P04State, id: string) => s.internships.find((p) => p.studentId === id)!;
const student = (id: string): Actor => ({ role: "Student", name: NAMES[id] ?? id, studentId: id });
const text = (a: ReturnType<typeof generate>) => ("na" in a ? a.na : a.text);
const content = {
  workedOn: "I built a small dashboard for the sales team and checked the numbers with my manager.",
  learned: "I learned how to write measures that compare this week with last week in Power BI.",
  challenges: "",
  helpNeeded: "",
  nextPlan: "Add filters for each community and share it with the team.",
  hours: "70",
  attachment: "",
};

describe("P04 seed and statuses", () => {
  const s = seedP04(NOW);
  it("builds three internships from Launchpad's approved applications", () => {
    const approved = APPLICATIONS.filter((a) => a.status === "Approved").map((a) => a.id).sort();
    expect(s.internships.map((p) => p.applicationId).sort()).toEqual(approved);
    expect(internshipStatus(s, byStudent(s, "latifa"), NOW)).toBe("Ended – awaiting grade");
    expect(internshipStatus(s, byStudent(s, "rashed"), NOW)).toBe("In progress");
    expect(internshipStatus(s, byStudent(s, "aisha"), NOW)).toBe("In progress");
  });
  it("creates a report every 14 days and months of 30 days", () => {
    const r = byStudent(s, "rashed");
    expect(reportsOf(s, r.id)).toHaveLength(8); // 16 weeks
    expect(meetingStats(s, r, NOW).required).toBe(4);
    expect(reportsOf(s, byStudent(s, "latifa").id)).toHaveLength(6); // "3 months" = 12 weeks
  });
  it("works out Due, Overdue and late reports from the dates", () => {
    const a = byStudent(s, "aisha");
    const st = reportsOf(s, a.id).map((r) => reportStatus(s, r, NOW));
    expect(st.slice(0, 5)).toEqual(["Reviewed", "Changes requested", "Overdue", "Submitted", "Due"]);
    expect(reportStats(s, a, NOW).late).toBe(1);
    expect(meetingStats(s, a, NOW).missedMonths).toEqual([2]);
  });
});

describe("P04 reports", () => {
  it("lets only the student submit, then faculty review or ask for changes", () => {
    let s = seedP04(NOW);
    const a = byStudent(s, "aisha");
    const r5 = reportsOf(s, a.id)[4]!;
    expect(reportAction(s, r5.id, "submit", student("rashed"), NOW, { content }).ok).toBe(false);
    expect(reportAction(s, r5.id, "submit", student("aisha"), NOW, { content: { ...content, workedOn: "Too short" } }).ok).toBe(false);
    s = ok(reportAction(s, r5.id, "submit", student("aisha"), NOW, { content }));
    expect(reportStatus(s, reportsOf(s, a.id)[4]!, NOW)).toBe("Submitted");
    const noComment = reportAction(s, r5.id, "requestChanges", FACULTY_ACTOR, NOW, { comment: "" });
    expect(noComment.ok).toBe(false);
    s = ok(reportAction(s, r5.id, "requestChanges", FACULTY_ACTOR, NOW, { comment: "Add the numbers." }));
    s = ok(reportAction(s, r5.id, "revise", student("aisha"), NOW, { content: { ...content, hours: "72" } }));
    const after = reportsOf(s, a.id)[4]!;
    expect(after.versions).toHaveLength(1);
    s = ok(reportAction(s, r5.id, "review", FACULTY_ACTOR, NOW));
    expect(reportStatus(s, reportsOf(s, a.id)[4]!, NOW)).toBe("Reviewed");
    expect(reportAction(s, r5.id, "review", FACULTY_ACTOR, NOW).ok).toBe(false);
  });
  it("does not open a report before its period", () => {
    const s = seedP04(NOW);
    const r8 = reportsOf(s, byStudent(s, "rashed").id)[7]!;
    const res = reportAction(s, r8.id, "submit", student("rashed"), NOW, { content });
    expect(res.ok ? "" : res.msg).toMatch(/Not yet due/);
  });
});

describe("P04 meetings and calendar", () => {
  it("books a free slot, blocks a second one in the same month, and refuses overlaps", () => {
    let s = seedP04(NOW);
    const slot = freeSlots(s, NOW)[0]!;
    s = ok(requestMeeting(s, student("aisha"), NOW, { slotId: slot.id, agenda: "Catch up on Report 2 and Report 3." }));
    const second = freeSlots(s, NOW)[0]!;
    const again = requestMeeting(s, student("aisha"), NOW, { slotId: second.id, agenda: "Another meeting this month." });
    expect(again.ok ? "" : again.msg).toMatch(/already have a meeting/);
    const clash = addSlots(s, FACULTY_ACTOR, NOW, { date: dateInput(slot.start), time: "10:00", length: "30", repeat: "1" });
    expect(clash.ok).toBe(false);
    const id = s.meetings[s.meetings.length - 1]!.id;
    s = ok(meetingAction(s, id, "accept", FACULTY_ACTOR, NOW));
    const m = s.meetings.find((x) => x.id === id)!;
    expect(m.status).toBe("Scheduled");
    expect(m.videoLink).toContain(id);
    expect(meetingAction(s, id, "complete", FACULTY_ACTOR, NOW, { notes: "Too early to mark this." }).ok).toBe(false);
  });
  it("lets faculty invite only students who are in progress", () => {
    const s = seedP04(NOW);
    const res = inviteStudent(s, FACULTY_ACTOR, NOW, {
      internshipId: byStudent(s, "latifa").id,
      date: dateInput(NOW + 2 * 86_400_000),
      time: "12:00",
      length: "30",
      agenda: "Final check-in before the grade.",
    });
    expect(res.ok).toBe(false);
  });
});

describe("P04 grade and supervisor feedback", () => {
  it("locks one Pass or Fail grade with a reason of 20+ characters", () => {
    let s = seedP04(NOW);
    const l = byStudent(s, "latifa");
    expect(submitGrade(s, l.id, FACULTY_ACTOR, NOW, { result: "Pass", reason: "Good" }).ok).toBe(false);
    expect(submitGrade(s, byStudent(s, "rashed").id, FACULTY_ACTOR, NOW, { result: "Pass", reason: "Strong work across the whole internship." }).ok).toBe(false);
    s = ok(submitGrade(s, l.id, FACULTY_ACTOR, NOW, { result: "Pass", reason: "Strong work across the whole internship." }));
    expect(gradeOf(s, l.id)?.result).toBe("Pass");
    expect(internshipStatus(s, l, NOW)).toBe("Graded – Pass");
    expect(submitGrade(s, l.id, FACULTY_ACTOR, NOW, { result: "Fail", reason: "Changing my mind about this one." }).ok).toBe(false);
  });
  it("takes HR feedback only from the intern's own company", () => {
    const s = seedP04(NOW);
    const r = byStudent(s, "rashed");
    const d = { rating: "Serious concerns", comment: "Rashed missed two deadlines this week.", strengths: "", improve: "" };
    expect(addHrComment(s, r.id, { role: "Employer HR", name: "X", companyId: "gulf-insight" }, NOW, d).ok).toBe(false);
    expect(addHrComment(s, r.id, { role: "Employer HR", name: "Omar Al Nuaimi", companyId: "falcon-ai" }, NOW, { ...d, comment: "short" }).ok).toBe(false);
    const after = ok(addHrComment(s, r.id, { role: "Employer HR", name: "Omar Al Nuaimi", companyId: "falcon-ai" }, NOW, d));
    expect(riskOf(after, r, NOW).level).toBe("Needs attention");
  });
});

describe("P04 placements from Launchpad", () => {
  it("starts an internship when an application becomes Approved, once", () => {
    const s = seedP04(NOW);
    const apps = APPLICATIONS.map((a) => (a.id === "app-03" ? { ...a, status: "Approved" as const } : a));
    const listing = (id: string) => LISTINGS.find((l) => l.id === id);
    const s2 = syncPlacements(s, apps, listing, NOW);
    const h = byStudent(s2, "hamad");
    expect(h.companyId).toBe("gulf-insight");
    expect(reportsOf(s2, h.id)).toHaveLength(6);
    expect(syncPlacements(s2, apps, listing, NOW)).toBe(s2);
    expect(syncPlacements(s, APPLICATIONS, listing, NOW)).toBe(s);
    expect(riskOf(s2, h, NOW).level).toBe("Too early to tell");
  });
});

describe("P04 AI helpers (rules-based)", () => {
  const s = seedP04(NOW);
  it("ranks interns: Aisha needs attention, Rashed to watch, Latifa on track", () => {
    expect(riskOf(s, byStudent(s, "aisha"), NOW).level).toBe("Needs attention");
    expect(riskOf(s, byStudent(s, "rashed"), NOW).level).toBe("Watch");
    expect(riskOf(s, byStudent(s, "latifa"), NOW).level).toBe("On track");
    const all = text(generate("warn", s, dir, "all", 0, NOW));
    expect(all.indexOf("Aisha")).toBeLessThan(all.indexOf("Rashed"));
    expect(all.indexOf("Rashed")).toBeLessThan(all.indexOf("Latifa"));
  });
  it("writes a brief, a report summary and meeting prep from the records", () => {
    const brief = text(generate("brief", s, dir, byStudent(s, "rashed").id, 0, NOW));
    expect(brief).toContain("Falcon AI Labs");
    expect(brief).toContain("Machine Learning Co-op");
    const r4 = reportsOf(s, byStudent(s, "aisha").id)[3]!;
    const sum = text(generate("summary", s, dir, r4.id, 0, NOW));
    expect(sum).toContain("Submitted 3 days after the due date");
    expect(sum).toContain("Suggested comment");
    const empty = reportsOf(s, byStudent(s, "aisha").id)[2]!;
    expect(text(generate("summary", s, dir, empty.id, 0, NOW))).toMatch(/Nothing to summarise/);
    const prep = text(generate("prep", s, dir, byStudent(s, "aisha").id, 0, NOW));
    expect(prep).toMatch(/still needs the changes/);
  });
  it("regenerate changes the wording but not the facts", () => {
    const id = byStudent(s, "latifa").id;
    const a = text(generate("brief", s, dir, id, 0, NOW));
    const b = text(generate("brief", s, dir, id, 1, NOW));
    expect(a).not.toBe(b);
    expect(b).toContain("Hikma Health Tech");
  });
});
