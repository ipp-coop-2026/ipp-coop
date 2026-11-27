/** P04 (Faculty Review, Team 4) records. All synthetic. Students, listings and companies come from Launchpad (P02). */

export type Role = "Faculty" | "Student" | "Employer HR";

export interface Actor {
  role: Role;
  name: string;
  /** Launchpad student id, for the Student role */
  studentId?: string;
  /** Launchpad company id, for the Employer HR role */
  companyId?: string;
}

export interface HistoryEntry {
  from: string;
  to: string;
  role: Role;
  by: string;
  at: string;
  note: string;
}

/** One internship: created when a Launchpad application is Approved (the placement is confirmed). */
export interface Internship {
  id: string; // PLC-001
  applicationId: string;
  studentId: string;
  listingId: string;
  companyId: string;
  facultyId: string;
  start: string; // Gulf midnight on the confirmation day
  end: string; // start + duration
  days: number;
  confirmedAt: string;
}

export type InternshipStatus =
  | "Not started"
  | "In progress"
  | "Ended – awaiting grade"
  | "Graded – Pass"
  | "Graded – Fail";

export interface ReportContent {
  workedOn: string;
  learned: string;
  challenges: string;
  helpNeeded: string;
  nextPlan: string;
  hours: number | null;
}

/** Stored status. "Due", "Overdue" and "Missing" are worked out from the dates (see reportStatus). */
export type ReportStored = "Not yet due" | "Submitted" | "Changes requested" | "Reviewed";
export type ReportStatus = ReportStored | "Due" | "Overdue" | "Missing";

export interface ReportVersion {
  version: number;
  content: ReportContent;
  attachment: string;
  submittedAt: string;
  facultyComment: string;
}

export interface Report {
  id: string; // RPT-001
  internshipId: string;
  number: number;
  periodStart: string;
  due: string;
  status: ReportStored;
  content: ReportContent | null;
  attachment: string;
  submittedAt: string | null; // first submission
  lastSubmittedAt: string | null;
  late: boolean;
  versions: ReportVersion[];
  facultyComment: string;
  reviewedAt: string | null;
  history: HistoryEntry[];
}

export type SlotStatus = "Free" | "Held" | "Booked";

export interface Slot {
  id: string; // SLOT-001
  facultyId: string;
  start: string;
  end: string;
  status: SlotStatus;
  deleted: boolean;
}

export type MeetingStatus =
  | "Requested"
  | "Invited"
  | "Scheduled"
  | "Declined"
  | "Cancelled"
  | "Completed"
  | "Missed";

export interface Meeting {
  id: string; // MTG-001
  internshipId: string;
  month: number;
  start: string;
  end: string;
  slotId: string | null;
  origin: "Student request" | "Faculty invitation";
  agenda: string;
  status: MeetingStatus;
  videoLink: string;
  reason: string; // decline or cancel reason
  notes: string; // faculty notes when completed
  history: HistoryEntry[];
}

export type MonthStatus = "Done" | "Booked" | "Waiting" | "Not booked" | "Missed";

export interface Grade {
  id: string; // GRD-001
  internshipId: string;
  result: "Pass" | "Fail";
  reason: string;
  by: string;
  at: string;
  snapshot: {
    reportsRequired: number;
    reportsSubmitted: number;
    reportsReviewed: number;
    reportsLate: number;
    reportsMissing: number;
    meetingsDone: number;
    meetingsRequired: number;
    monthsMissed: number[];
  };
}

export const HR_RATINGS = ["On track", "Some concerns", "Serious concerns"] as const;
export type HrRating = (typeof HR_RATINGS)[number];

/** Workplace supervisor (HR) feedback. Only faculty see it. */
export interface HrComment {
  id: string; // HRC-001
  internshipId: string;
  companyId: string;
  author: string;
  rating: HrRating;
  comment: string;
  strengths: string;
  improve: string;
  at: string;
}

export interface P04State {
  version: 1;
  internships: Internship[];
  reports: Report[];
  slots: Slot[];
  meetings: Meeting[];
  grades: Grade[];
  hr: HrComment[];
  counters: { plc: number; rpt: number; slot: number; mtg: number; grd: number; hrc: number };
}

/** Names from Launchpad, so P04 never copies student, listing or company records. */
export interface Directory {
  studentName: (id: string) => string;
  listing: (id: string) =>
    | {
        title: string;
        city: string;
        mode: string;
        type: string;
        duration: string;
        summary: string;
        description: string;
        requirements: string[];
        required: string[];
        preferred: string[];
      }
    | undefined;
  company: (id: string) => { name: string; hr: string } | undefined;
}

export type Result =
  | { ok: true; state: P04State; msg: string; id?: string }
  | { ok: false; msg: string; errors?: Record<string, string> };
