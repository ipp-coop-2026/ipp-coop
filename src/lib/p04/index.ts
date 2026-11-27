/**
 * P04 (Faculty Review, Team 4) public API. Other teams import from "@/lib/p04" only.
 *
 *   import { useP04, internshipOfStudent, internshipStatus, resetP04 } from "@/lib/p04";
 *
 * P04 follows each intern after the placement is confirmed (a Launchpad application marked "Approved"):
 * a progress report every 2 weeks, one faculty meeting a month, supervisor (HR) feedback, and a final
 * Pass/Fail grade from the faculty advisor. Four rules-based AI helpers support faculty; they never decide.
 */
export { P04_KEY, directoryFrom, getP04, resetP04, run, useP04 } from "./store";
export { seedP04 } from "./seed";
export {
  FACULTY,
  FACULTY_ACTOR,
  OPEN_MEETING,
  addHrComment,
  addSlots,
  createInternship,
  deleteSlot,
  emptyState,
  freeSlots,
  gradeOf,
  gradeWarnings,
  hrOf,
  internshipById,
  internshipOfStudent,
  internshipStatus,
  inviteStudent,
  meetingAction,
  meetingStats,
  meetingsOf,
  monthOf,
  monthStatus,
  monthsOf,
  nextMeetingOf,
  nextReport,
  pendingRequests,
  readyToGrade,
  reportAction,
  reportById,
  reportStats,
  reportStatus,
  reportsOf,
  requestMeeting,
  reviewQueue,
  submitGrade,
  syncPlacements,
  validateReport,
  type ReportInput,
} from "./rules";
export { AI_KINDS, AI_NAME, generate, hashStr, riskOf, type AiAnswer, type AiKind, type RiskLevel } from "./ai";
export * from "./time";
export type * from "./types";
export { HR_RATINGS } from "./types";
