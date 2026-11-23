import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  getAiSignals: vi.fn(),
  scoreGoalLive: vi.fn(),
  suggestSkillsLive: vi.fn(),
}));
vi.mock("@/lib/db", async (importOriginal) => ({ ...(await importOriginal<object>()), ...db }));

import { DEMO_DATA, latestProfile, matchStudent, textKey, withAiSignals, type AiSignalData } from "@/lib/p05";

const empty: AiSignalData = { model: "Supabase/gte-small", source: "live", goals: {}, phrases: {} };

describe("P05 AI signals from the shared database", () => {
  beforeEach(() => {
    db.getAiSignals.mockReset();
    db.scoreGoalLive.mockReset();
    db.suggestSkillsLive.mockReset();
  });

  it("uses stored embeddings when the goal is known", async () => {
    const profile = latestProfile(DEMO_DATA, "COOP-B001")!;
    db.getAiSignals.mockResolvedValue({ model: "Supabase/gte-small", goal_embedded: true, goal: { "OP-028@2": 0.9117 }, phrases: {} });
    const next = await withAiSignals(empty, profile);
    expect(next.goals[textKey(profile.goals)]).toEqual({ "OP-028@2": 0.9117 });
    expect(db.scoreGoalLive).not.toHaveBeenCalled();
    expect(empty.goals).toEqual({}); // the input is not changed
  });

  it("scores a goal written after the seed live, then ranks with the real model", async () => {
    const profile = { ...latestProfile(DEMO_DATA, "COOP-B001")!, student_id: "COOP-P001", goals: "A goal another team wrote today", unmapped_skills: ["airside safety awareness"] };
    db.getAiSignals.mockResolvedValue({ model: "Supabase/gte-small", goal_embedded: false, goal: {}, phrases: {} });
    db.scoreGoalLive.mockResolvedValue({ "OP-028@2": 0.88, "OP-026@1": 0.93 });
    db.suggestSkillsLive.mockResolvedValue([{ skill_id: "SK-AVN-01", label: "Aviation operations domain", similarity: 0.828, suggested: false }]);
    const ai = await withAiSignals(empty, profile);
    expect(db.scoreGoalLive).toHaveBeenCalledWith("A goal another team wrote today", undefined);
    expect(ai.phrases["airside safety awareness"]).toEqual([{ skill_id: "SK-AVN-01", score: 0.828 }]);
    const data = { ...DEMO_DATA, profiles: [...DEMO_DATA.profiles, profile], ai };
    const r = matchStudent(data, "COOP-P001", "ai")!.records.find((x) => x.opportunity_id === "OP-028")!;
    expect(r.ai_source).toBe("embedding");
  });

  it("keeps the labelled fallback when the live model cannot be reached", async () => {
    const profile = { ...latestProfile(DEMO_DATA, "COOP-B001")!, goals: "Another new goal" };
    db.getAiSignals.mockResolvedValue({ model: "Supabase/gte-small", goal_embedded: false, goal: {}, phrases: {} });
    db.scoreGoalLive.mockRejectedValue(new Error("offline"));
    const ai = await withAiSignals(empty, profile);
    expect(ai.goals[textKey("Another new goal")]).toBeUndefined();
  });
});
