/**
 * P05 AI-assisted matching: public API for other modules (docs/ARCHITECTURE.md, module rule 2).
 *
 *   import { matchStudent, loadMatchData, DEMO_DATA } from "@/lib/p05";
 *   const { data } = await loadMatchData();                // shared database
 *   const result = matchStudent(data, "COOP-B001", "ai");  // ranked, explained results
 *
 * Results are decision support: they never confirm a placement, and the AI never changes who can apply.
 */
export {
  AI_MODEL,
  AI_PARAMS,
  METHODS,
  aiLookup,
  evaluate,
  gapsOf,
  latestProfile,
  matchStudent,
  methodFor,
  profileVersions,
  publishedVersion,
  rank,
  recommendationId,
  recordIdFor,
  students,
  textKey,
} from "./engine";
export { aiSourceText, fmtDate, requirementText, rowLine, skillName, verdict, whyLines, type Tone } from "./explain";
export { DEMO_DATA } from "./fixtures";
export { loadMatchData, mapEvidence, mapListings, mapProfiles, mapVocabulary, withAiSignals, type LiveSource } from "./source";
export type * from "./types";
