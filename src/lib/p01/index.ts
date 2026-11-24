/**
 * P01 Student profiles and internship interests: public API for other modules (docs/ARCHITECTURE.md, rule 2).
 *
 *   import { currentReviewed, exportVersion, toFeedRow, useP01 } from "@/lib/p01";
 */
export * from "./types";
export * from "./rules";
export {
  CONTRACT_VERSION,
  compareRows,
  exportVersion,
  fromFeedRow,
  toFeedRow,
  type ProfileExport,
} from "./contract";
export { makeP01Seed, SEED_ROWS } from "./seed";
export { P01_KEY, resetP01, setP01, updateP01, useP01 } from "./store";
export {
  buildFacts,
  describePatch,
  findDates,
  ELSEWHERE,
  HANDOFF,
  parseAssistant,
  parsePatch,
  rulesReply,
  sanitizePatch,
  STARTERS,
  type AssistantFacts,
  type AssistantReply,
  type AssistantTurn,
} from "./assistant";
