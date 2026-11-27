/**
 * P04 rules: internships, biweekly reports, monthly meetings, faculty availability, the final grade
 * and supervisor (HR) feedback. Pure functions: each action takes the state, the actor and `now`,
 * and returns a new state or a message. Nothing here touches the browser.
 */
import {
  DAY,
  addDays,
  addMins,
  daysBetween,
  durationDays,
  fmtDate,
  ms,
  overlaps,
  parseGst,
  startOfDay,
} from "./time";
import {
  HR_RATINGS,
  type Actor,
  type Directory,
  type Grade,
  type HrComment,
  type HrRating,
  type Internship,
  type InternshipStatus,
  type Meeting,
  type MeetingStatus,
  type MonthStatus,
  type P04State,
  type Report,
  type ReportContent,
  type ReportStatus,
  type Result,
  type Slot,
} from "./types";

export const FACULTY = { id: "FAC-001", name: "Dr. Ahmed Saleh" } as const;
export const FACULTY_ACTOR: Actor = { role: "Faculty", name: FACULTY.name };
export const MEET_BASE = "https://meet.ipp-demo.example/";
export const OPEN_MEETING: MeetingStatus[] = ["Requested", "Invited", "Scheduled"];

const pad = (n: number) => String(n).padStart(3, "0");
const clone = (s: P04State): P04State => structuredClone(s);
const fail = (msg: string, errors?: Record<string, string>): Result =>
  errors ? { ok: false, msg, errors } : { ok: false, msg };
const done = (state: P04State, msg: string, id?: string): Result =>
  id ? { ok: true, state, msg, id } : { ok: true, state, msg };
const notAllowed = (status: string) =>
  `This action isn't allowed from the current status (${status}).`;

export const emptyState = (): P04State => ({
  version: 1,
  internships: [],
  reports: [],
  slots: [],
  meetings: [],
  grades: [],
  hr: [],
  counters: { plc: 0, rpt: 0, slot: 0, mtg: 0, grd: 0, hrc: 0 },
});

// ---------- Look-ups ----------

export const internshipById = (s: P04State, id: string) => s.internships.find((p) => p.id === id);
export const reportById = (s: P04State, id: string) => s.reports.find((r) => r.id === id);
export const meetingById = (s: P04State, id: string) => s.meetings.find((m) => m.id === id);
export const gradeOf = (s: P04State, id: string) => s.grades.find((g) => g.internshipId === id);
export const reportsOf = (s: P04State, id: string) =>
  s.reports.filter((r) => r.internshipId === id).sort((a, b) => a.number - b.number);
export const meetingsOf = (s: P04State, id: string) =>
  s.meetings.filter((m) => m.internshipId === id).sort((a, b) => ms(a.start) - ms(b.start));
export const hrOf = (s: P04State, id: string) =>
  s.hr.filter((c) => c.internshipId === id).sort((a, b) => ms(a.at) - ms(b.at));
export const internshipOfStudent = (s: P04State, studentId: string) =>
  [...s.internships].reverse().find((p) => p.studentId === studentId);
export const freeSlots = (s: P04State, now: number) =>
  s.slots
    .filter((x) => !x.deleted && x.status === "Free" && ms(x.start) > now)
    .sort((a, b) => ms(a.start) - ms(b.start));

// ---------- Internship records ----------

/** Months: month n runs from start + 30(n-1) days to start + 30n days; the last ends the day after the end date. */
export function monthsOf(p: Internship): { month: number; start: string; end: string }[] {
  const n = Math.ceil(p.days / 30);
  return Array.from({ length: n }, (_, i) => ({
    month: i + 1,
    start: addDays(p.start, 30 * i),
    end: i + 1 < n ? addDays(p.start, 30 * (i + 1)) : addDays(p.end, 1),
  }));
}

export function monthOf(p: Internship, iso: string): number | null {
  const day = startOfDay(iso);
  return monthsOf(p).find((m) => day >= ms(m.start) && day < ms(m.end))?.month ?? null;
}

/** Creates the internship and its report rows. A report every 14 days; the last one is due on the end date. */
export function createInternship(
  s: P04State,
  app: { id: string; studentId: string; listingId: string; companyId: string; duration: string },
  confirmedAt: string,
): P04State {
  const next = clone(s);
  const days = durationDays(app.duration);
  const start = new Date(startOfDay(confirmedAt)).toISOString();
  next.counters.plc++;
  const p: Internship = {
    id: `PLC-${pad(next.counters.plc)}`,
    applicationId: app.id,
    studentId: app.studentId,
    listingId: app.listingId,
    companyId: app.companyId,
    facultyId: FACULTY.id,
    start,
    end: addDays(start, days),
    days,
    confirmedAt,
  };
  next.internships.push(p);
  const n = Math.ceil(days / 14);
  for (let i = 1; i <= n; i++) {
    next.counters.rpt++;
    next.reports.push({
      id: `RPT-${pad(next.counters.rpt)}`,
      internshipId: p.id,
      number: i,
      periodStart: addDays(start, 14 * (i - 1)),
      due: i < n ? addDays(start, 14 * i) : p.end,
      status: "Not yet due",
      content: null,
      attachment: "",
      submittedAt: null,
      lastSubmittedAt: null,
      late: false,
      versions: [],
      facultyComment: "",
      reviewedAt: null,
      history: [],
    });
  }
  return next;
}

/**
 * Every Launchpad application marked "Approved" is a confirmed placement. Any approved application
 * without an internship gets one, starting today. Returns the same object when nothing changed.
 */
export function syncPlacements(
  s: P04State,
  apps: { id: string; studentId: string; listingId: string; status: string }[],
  listing: (id: string) => { companyId: string; duration: string } | undefined,
  now: number,
): P04State {
  let next = s;
  for (const a of apps) {
    if (a.status !== "Approved" || next.internships.some((p) => p.applicationId === a.id)) continue;
    const l = listing(a.listingId);
    if (!l) continue;
    next = createInternship(
      next,
      { ...a, companyId: l.companyId, duration: l.duration },
      new Date(now).toISOString(),
    );
  }
  return next;
}

export function internshipStatus(s: P04State, p: Internship, now: number): InternshipStatus {
  const g = gradeOf(s, p.id);
  if (g) return g.result === "Pass" ? "Graded – Pass" : "Graded – Fail";
  const today = startOfDay(now);
  if (today < ms(p.start)) return "Not started";
  if (today < ms(p.end)) return "In progress";
  return "Ended – awaiting grade";
}

export function reportStatus(s: P04State, r: Report, now: number): ReportStatus {
  if (r.status !== "Not yet due") return r.status;
  const today = startOfDay(now);
  if (today < ms(r.periodStart)) return "Not yet due";
  if (today <= ms(r.due)) return "Due";
  const p = internshipById(s, r.internshipId);
  return p && today > ms(p.end) ? "Missing" : "Overdue";
}

export function monthStatus(
  s: P04State,
  p: Internship,
  m: { month: number; end: string },
  now: number,
): MonthStatus {
  const list = s.meetings.filter((x) => x.internshipId === p.id && x.month === m.month);
  const has = (st: MeetingStatus) => list.some((x) => x.status === st);
  if (has("Completed")) return "Done";
  if (has("Scheduled")) return "Booked";
  if (startOfDay(now) >= ms(m.end)) return "Missed";
  if (has("Requested") || has("Invited")) return "Waiting";
  return "Not booked";
}

export function reportStats(s: P04State, p: Internship, now: number) {
  const rs = reportsOf(s, p.id);
  const st = rs.map((r) => reportStatus(s, r, now));
  const pick = (want: ReportStatus[]) => rs.filter((_, i) => want.includes(st[i] ?? "Not yet due"));
  return {
    total: rs.length,
    submitted: rs.filter((r) => r.submittedAt).length,
    reviewed: pick(["Reviewed"]).length,
    late: rs.filter((r) => r.late).length,
    missing: pick(["Missing", "Overdue"]),
    waiting: pick(["Submitted"]),
    changes: pick(["Changes requested"]),
  };
}

export function meetingStats(s: P04State, p: Internship, now: number) {
  const months = monthsOf(p);
  const st = months.map((m) => monthStatus(s, p, m, now));
  return {
    done: st.filter((x) => x === "Done").length,
    required: months.length,
    missedMonths: months.filter((_, i) => st[i] === "Missed").map((m) => m.month),
  };
}

export const nextReport = (s: P04State, p: Internship, now: number) =>
  reportsOf(s, p.id).find((r) => !r.submittedAt && reportStatus(s, r, now) !== "Missing");

export const reviewQueue = (s: P04State, now: number) =>
  s.reports
    .filter((r) => reportStatus(s, r, now) === "Submitted")
    .sort((a, b) => ms(a.lastSubmittedAt ?? "") - ms(b.lastSubmittedAt ?? ""));
export const pendingRequests = (s: P04State) =>
  s.meetings.filter((m) => m.status === "Requested").sort((a, b) => ms(a.start) - ms(b.start));
export const readyToGrade = (s: P04State, now: number) =>
  s.internships.filter((p) => internshipStatus(s, p, now) === "Ended – awaiting grade");
export const nextMeetingOf = (s: P04State, p: Internship, now: number) =>
  meetingsOf(s, p.id).find((m) => OPEN_MEETING.includes(m.status) && ms(m.end) >= now);

// ---------- Shared checks ----------

function ownerCheck(p: Internship, a: Actor, role: "Faculty" | "Student"): string | null {
  if (a.role !== role)
    return role === "Student"
      ? "Only the student can do this."
      : "Only the assigned faculty advisor can do this.";
  if (role === "Student" && a.studentId !== p.studentId)
    return "You can only change your own internship.";
  return null;
}

function lenError(v: string, min: number, max: number, emptyMsg: string): string | null {
  if (!v) return emptyMsg;
  if (v.length < min) return `Write at least ${min} characters (${v.length} so far).`;
  if (v.length > max) return `Keep this to ${max} characters or fewer (${v.length} now).`;
  return null;
}

const log = (
  obj: { history: { from: string; to: string; role: Actor["role"]; by: string; at: string; note: string }[] },
  from: string,
  to: string,
  a: Actor,
  at: string,
  note: string,
) => obj.history.push({ from, to, role: a.role, by: a.name, at, note });

// ---------- Reports ----------

export type ReportInput = Record<
  "workedOn" | "learned" | "challenges" | "helpNeeded" | "nextPlan" | "hours" | "attachment",
  string
>;

export function validateReport(c: ReportInput): Record<string, string> {
  const e: Record<string, string> = {};
  const req: [keyof ReportInput, string, number, number][] = [
    ["workedOn", "What I worked on", 30, 1000],
    ["learned", "What I learned", 30, 1000],
    ["nextPlan", "Plan for the next 2 weeks", 20, 500],
  ];
  for (const [k, label, min, max] of req) {
    const m = lenError(c[k].trim(), min, max, `Please fill in "${label}".`);
    if (m) e[k] = m;
  }
  for (const k of ["challenges", "helpNeeded"] as const)
    if (c[k].trim().length > 1000) e[k] = "Keep this to 1000 characters or fewer.";
  const h = c.hours.trim();
  if (h !== "" && (!/^\d+(\.\d+)?$/.test(h) || Number(h) > 120))
    e["hours"] = "Enter a number from 0 to 120.";
  return e;
}

const toContent = (c: ReportInput): ReportContent => ({
  workedOn: c.workedOn.trim(),
  learned: c.learned.trim(),
  challenges: c.challenges.trim(),
  helpNeeded: c.helpNeeded.trim(),
  nextPlan: c.nextPlan.trim(),
  hours: c.hours.trim() === "" ? null : Number(c.hours),
});

type ReportAction = "submit" | "revise" | "review" | "requestChanges";
const REPORT_RULES: Record<ReportAction, { from: ReportStatus[]; to: Report["status"]; role: "Faculty" | "Student" }> = {
  submit: { from: ["Due", "Overdue", "Missing"], to: "Submitted", role: "Student" },
  revise: { from: ["Changes requested"], to: "Submitted", role: "Student" },
  review: { from: ["Submitted"], to: "Reviewed", role: "Faculty" },
  requestChanges: { from: ["Submitted"], to: "Changes requested", role: "Faculty" },
};

export function reportAction(
  s: P04State,
  reportId: string,
  action: ReportAction,
  a: Actor,
  now: number,
  extra: { content?: ReportInput; comment?: string } = {},
): Result {
  const rule = REPORT_RULES[action];
  const r0 = reportById(s, reportId);
  const p = r0 && internshipById(s, r0.internshipId);
  if (!r0 || !p) return fail("Report not found.");
  const who = ownerCheck(p, a, rule.role);
  if (who) return fail(who);
  if (gradeOf(s, p.id)) return fail("This internship is graded and closed, so nothing more can change.");
  const from = reportStatus(s, r0, now);
  if (!rule.from.includes(from)) return fail(notAllowed(from));
  const next = clone(s);
  const r = reportById(next, reportId)!;
  const iso = new Date(now).toISOString();
  const comment = (extra.comment ?? "").trim();
  let note = "";
  let msg = "";
  if (action === "submit" || action === "revise") {
    const input = extra.content;
    if (!input) return fail("Please fill in the report.");
    const errors = validateReport(input);
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);
    if (action === "revise") {
      if (r.content && r.lastSubmittedAt)
        r.versions.push({
          version: r.versions.length + 1,
          content: r.content,
          attachment: r.attachment,
          submittedAt: r.lastSubmittedAt,
          facultyComment: r.facultyComment,
        });
      note = `Revised and resubmitted. Version ${r.versions.length} kept.`;
      msg = `Report ${r.number} resubmitted. Your advisor will review it again.`;
    } else {
      r.submittedAt = iso;
      r.late = startOfDay(now) > ms(r.due);
      note = r.late ? `Submitted late (due ${fmtDate(r.due)}).` : "Submitted on time.";
      msg = `Report ${r.number} submitted. Your advisor will review it.`;
    }
    r.content = toContent(input);
    if (input.attachment.trim()) r.attachment = input.attachment.trim();
    r.lastSubmittedAt = iso;
  }
  if (action === "requestChanges") {
    if (!comment) return fail("Please enter a comment.", { comment: "Please enter a comment so the student knows what to change." });
    r.facultyComment = comment;
    note = `Changes requested: ${comment}`;
    msg = `Changes requested on Report ${r.number}.`;
  }
  if (action === "review") {
    r.facultyComment = comment;
    r.reviewedAt = iso;
    note = comment ? `Reviewed. Comment: ${comment}` : "Reviewed. No comment.";
    msg = `Report ${r.number} marked reviewed.`;
  }
  r.status = rule.to;
  log(r, from, rule.to, a, iso, note);
  return done(next, msg, r.id);
}

// ---------- Faculty availability ----------

function facultyBusy(s: P04State, start: string, end: string, ignoreSlot: string | null = null) {
  return (
    s.slots.some((x) => !x.deleted && x.id !== ignoreSlot && overlaps(start, end, x.start, x.end)) ||
    s.meetings.some(
      (m) =>
        (OPEN_MEETING.includes(m.status) || m.status === "Completed") &&
        m.slotId !== ignoreSlot &&
        overlaps(start, end, m.start, m.end),
    )
  );
}

export function addSlots(
  s: P04State,
  a: Actor,
  now: number,
  d: { date: string; time: string; length: string; repeat: string },
): Result {
  if (a.role !== "Faculty") return fail("Only faculty can set availability.");
  const errors: Record<string, string> = {};
  const start = parseGst(d.date, d.time);
  const len = Number(d.length);
  const reps = Number(d.repeat || "1");
  if (!d.date) errors["date"] = "Please choose a date.";
  if (!d.time) errors["time"] = "Please choose a start time.";
  else if (start && ms(start) <= now) errors["time"] = "Choose a time in the future.";
  if (len !== 30 && len !== 60) errors["length"] = "Choose 30 or 60 minutes.";
  if (!(reps >= 1 && reps <= 8)) errors["repeat"] = "Choose between 1 and 8 weeks.";
  if (Object.keys(errors).length || !start) return fail("Please fix the highlighted fields.", errors);
  const list = Array.from({ length: reps }, (_, i) => {
    const st = addDays(start, 7 * i);
    return [st, addMins(st, len)] as const;
  });
  if (list.some(([st, en]) => facultyBusy(s, st, en)))
    return fail("This time overlaps another slot or meeting.", { time: "This time overlaps another slot or meeting." });
  const next = clone(s);
  for (const [st, en] of list) {
    next.counters.slot++;
    next.slots.push({ id: `SLOT-${pad(next.counters.slot)}`, facultyId: FACULTY.id, start: st, end: en, status: "Free", deleted: false });
  }
  return done(next, reps > 1 ? `${reps} free slots added.` : "Free slot added.");
}

export function deleteSlot(s: P04State, a: Actor, slotId: string): Result {
  const x = s.slots.find((y) => y.id === slotId && !y.deleted);
  if (!x) return fail("Slot not found.");
  if (a.role !== "Faculty") return fail("Only the faculty member who owns this slot can delete it.");
  if (x.status !== "Free") return fail(`Only free slots can be deleted. This slot is ${x.status}.`);
  const next = clone(s);
  next.slots.find((y) => y.id === slotId)!.deleted = true;
  return done(next, "Free slot deleted.");
}

// ---------- Meetings ----------

const setSlot = (s: P04State, id: string | null, to: Slot["status"]) => {
  const x = id ? s.slots.find((y) => y.id === id) : undefined;
  if (x) x.status = to;
};

export function requestMeeting(
  s: P04State,
  a: Actor,
  now: number,
  d: { slotId: string; agenda: string },
): Result {
  if (a.role !== "Student" || !a.studentId) return fail("Only the student can request a meeting.");
  const p = internshipOfStudent(s, a.studentId);
  if (!p) return fail("This section opens once your placement is confirmed.");
  const slot = s.slots.find((x) => x.id === d.slotId && !x.deleted);
  if (!slot) return fail("This time slot is no longer available.");
  if (slot.status !== "Free") return fail("This time slot is no longer free. Please pick another one.");
  return newMeeting(s, a, now, p, slot.start, slot.end, slot, "Student request", d.agenda);
}

export function inviteStudent(
  s: P04State,
  a: Actor,
  now: number,
  d: { internshipId: string; date: string; time: string; length: string; agenda: string },
): Result {
  if (a.role !== "Faculty") return fail("Only faculty can invite a student.");
  const errors: Record<string, string> = {};
  const p = internshipById(s, d.internshipId);
  if (!p) errors["internshipId"] = "Please choose a student.";
  if (!d.date) errors["date"] = "Please choose a date.";
  if (!d.time) errors["time"] = "Please choose a time.";
  const len = Number(d.length);
  if (len !== 30 && len !== 60) errors["length"] = "Choose 30 or 60 minutes.";
  const agendaErr = lenError(d.agenda.trim(), 10, 300, "Please enter an agenda.");
  if (agendaErr) errors["agenda"] = agendaErr;
  const start = parseGst(d.date, d.time);
  if (Object.keys(errors).length || !p || !start) return fail("Please fix the highlighted fields.", errors);
  if (internshipStatus(s, p, now) !== "In progress")
    return fail("You can only invite students whose internship is in progress.", {
      internshipId: "You can only invite students whose internship is in progress.",
    });
  const end = addMins(start, len);
  const slot =
    s.slots.find((x) => !x.deleted && x.status === "Free" && x.start === start && x.end === end) ?? null;
  if (facultyBusy(s, start, end, slot?.id ?? null))
    return fail("This time overlaps another slot or meeting.", { time: "This time overlaps another slot or meeting." });
  return newMeeting(s, a, now, p, start, end, slot, "Faculty invitation", d.agenda);
}

function newMeeting(
  s: P04State,
  a: Actor,
  now: number,
  p: Internship,
  start: string,
  end: string,
  slot: Slot | null,
  origin: Meeting["origin"],
  agendaRaw: string,
): Result {
  const agenda = agendaRaw.trim();
  const agendaErr = lenError(agenda, 10, 300, "Please enter an agenda.");
  if (agendaErr) return fail(agendaErr, { agenda: agendaErr });
  if (gradeOf(s, p.id)) return fail("This internship is graded and closed, so nothing more can change.");
  if (ms(start) <= now)
    return origin === "Student request"
      ? fail("Past slots can't be chosen.")
      : fail("Choose a time in the future.", { time: "Choose a time in the future." });
  const month = monthOf(p, start);
  if (!month)
    return fail(`This time is outside the internship dates (${fmtDate(p.start)} to ${fmtDate(p.end)}).`);
  if (s.meetings.some((x) => x.internshipId === p.id && x.month === month && OPEN_MEETING.includes(x.status)))
    return fail(
      origin === "Student request"
        ? "You already have a meeting booked or waiting for this month."
        : `This student already has a meeting booked or waiting for Month ${month}.`,
    );
  const next = clone(s);
  next.counters.mtg++;
  const iso = new Date(now).toISOString();
  const m: Meeting = {
    id: `MTG-${pad(next.counters.mtg)}`,
    internshipId: p.id,
    month,
    start,
    end,
    slotId: slot?.id ?? null,
    origin,
    agenda,
    status: origin === "Student request" ? "Requested" : "Invited",
    videoLink: "",
    reason: "",
    notes: "",
    history: [],
  };
  setSlot(next, m.slotId, "Held");
  log(m, "(new)", m.status, a, iso, `${origin === "Student request" ? "Requested from a free slot." : "Invitation sent."} Agenda: ${agenda}`);
  next.meetings.push(m);
  return done(
    next,
    origin === "Student request" ? "Meeting requested. Your advisor will accept or decline it." : "Invitation sent to the student.",
    m.id,
  );
}

type MeetingAction = "accept" | "decline" | "cancel" | "complete" | "missed";
const MEETING_RULES: Record<MeetingAction, { from: MeetingStatus[]; to: MeetingStatus }> = {
  accept: { from: ["Requested", "Invited"], to: "Scheduled" },
  decline: { from: ["Requested", "Invited"], to: "Declined" },
  cancel: { from: ["Requested", "Invited", "Scheduled"], to: "Cancelled" },
  complete: { from: ["Scheduled"], to: "Completed" },
  missed: { from: ["Scheduled"], to: "Missed" },
};

export function meetingAction(
  s: P04State,
  meetingId: string,
  action: MeetingAction,
  a: Actor,
  now: number,
  extra: { reason?: string; notes?: string } = {},
): Result {
  const rule = MEETING_RULES[action];
  const m0 = meetingById(s, meetingId);
  const p = m0 && internshipById(s, m0.internshipId);
  if (!m0 || !p) return fail("Meeting not found.");
  if (a.role !== "Student" && a.role !== "Faculty")
    return fail("Only the student or the assigned faculty advisor can change this meeting.");
  const who = ownerCheck(p, a, a.role);
  if (who) return fail(who);
  if ((action === "complete" || action === "missed") && a.role !== "Faculty")
    return fail("Only the assigned faculty advisor can record the meeting outcome.");
  if (gradeOf(s, p.id)) return fail("This internship is graded and closed, so nothing more can change.");
  if (!rule.from.includes(m0.status)) return fail(notAllowed(m0.status));
  if (action === "accept" || action === "decline") {
    const responder = m0.status === "Requested" ? "Faculty" : "Student";
    if (a.role !== responder)
      return fail(
        m0.status === "Requested"
          ? "Only the faculty advisor can respond to a meeting request."
          : "Only the student can respond to an invitation.",
      );
  }
  if (action === "accept" && ms(m0.start) <= now)
    return fail("This meeting time has passed, so it can't be accepted. Cancel it and pick a new time.");
  if ((action === "complete" || action === "missed") && now < ms(m0.start))
    return fail("Available after the meeting starts.");
  const reason = (extra.reason ?? "").trim();
  const notes = (extra.notes ?? "").trim();
  if ((action === "decline" || action === "cancel") && !reason)
    return fail("Please enter a reason.", { reason: "Please enter a reason." });
  if (action === "complete") {
    const e = lenError(notes, 10, 1000, "Please add short notes about the meeting.");
    if (e) return fail(e, { notes: e });
  }
  const next = clone(s);
  const m = meetingById(next, meetingId)!;
  const iso = new Date(now).toISOString();
  const from = m.status;
  let note = "";
  let msg = "";
  if (action === "accept") {
    m.videoLink = MEET_BASE + m.id;
    setSlot(next, m.slotId, "Booked");
    note = "Accepted. Video link created.";
    msg = "Meeting scheduled. The video link is ready.";
  }
  if (action === "decline" || action === "cancel") {
    m.reason = reason;
    setSlot(next, m.slotId, "Free");
    note = `Reason: ${reason}`;
    msg = action === "decline" ? "Declined." : "Meeting cancelled.";
  }
  if (action === "complete") {
    m.notes = notes;
    note = "Meeting completed. Notes recorded by faculty.";
    msg = "Meeting marked completed.";
  }
  if (action === "missed") {
    note = "Marked as missed.";
    msg = "Meeting marked missed.";
  }
  m.status = rule.to;
  log(m, from, rule.to, a, iso, note);
  return done(next, msg, m.id);
}

// ---------- Final grade ----------

export function gradeErrors(d: { result: string; reason: string }): Record<string, string> {
  const e: Record<string, string> = {};
  if (d.result !== "Pass" && d.result !== "Fail") e["result"] = "Choose Pass or Fail.";
  const reason = d.reason.trim();
  if (reason.length < 20)
    e["reason"] = reason
      ? `Write a reason of at least 20 characters (${reason.length} so far).`
      : "Please enter a reason of at least 20 characters.";
  return e;
}

export function submitGrade(
  s: P04State,
  internshipId: string,
  a: Actor,
  now: number,
  d: { result: string; reason: string },
): Result {
  const p = internshipById(s, internshipId);
  if (!p) return fail("Internship not found.");
  const who = ownerCheck(p, a, "Faculty");
  if (who) return fail(who);
  if (gradeOf(s, p.id)) return fail("This internship already has a grade. Grades are final once submitted.");
  if (startOfDay(now) < ms(p.end)) return fail(`Grading opens on ${fmtDate(p.end)}.`);
  const errors = gradeErrors(d);
  if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);
  const rs = reportStats(s, p, now);
  const mst = meetingStats(s, p, now);
  const next = clone(s);
  next.counters.grd++;
  const g: Grade = {
    id: `GRD-${pad(next.counters.grd)}`,
    internshipId: p.id,
    result: d.result === "Pass" ? "Pass" : "Fail",
    reason: d.reason.trim(),
    by: a.name,
    at: new Date(now).toISOString(),
    snapshot: {
      reportsRequired: rs.total,
      reportsSubmitted: rs.submitted,
      reportsReviewed: rs.reviewed,
      reportsLate: rs.late,
      reportsMissing: rs.missing.length,
      meetingsDone: mst.done,
      meetingsRequired: mst.required,
      monthsMissed: mst.missedMonths,
    },
  };
  next.grades.push(g);
  return done(next, `${g.result} grade submitted and locked.`, g.id);
}

/** Warnings shown before grading. They never block the grade. */
export function gradeWarnings(s: P04State, p: Internship, now: number): string[] {
  const rs = reportStats(s, p, now);
  const mst = meetingStats(s, p, now);
  const w: string[] = [];
  const unreviewed = rs.submitted - rs.reviewed;
  if (unreviewed > 0) w.push(`${unreviewed} submitted ${unreviewed === 1 ? "report is" : "reports are"} not reviewed yet.`);
  if (rs.missing.length) w.push(`${rs.missing.length} ${rs.missing.length === 1 ? "report is" : "reports are"} missing.`);
  if (rs.late) w.push(`${rs.late} ${rs.late === 1 ? "report was" : "reports were"} submitted late.`);
  for (const n of mst.missedMonths) w.push(`Month ${n} meeting was missed.`);
  return w;
}

// ---------- Supervisor (HR) feedback ----------

export function hrErrors(d: { rating: string; comment: string; strengths: string; improve: string }) {
  const e: Record<string, string> = {};
  if (!HR_RATINGS.includes(d.rating as HrRating)) e["rating"] = "Please choose a rating.";
  const c = d.comment.trim();
  if (c.length < 20) e["comment"] = "Please write at least 20 characters.";
  else if (c.length > 1000) e["comment"] = "Please keep it under 1000 characters.";
  if (d.strengths.length > 500) e["strengths"] = "Please keep it under 500 characters.";
  if (d.improve.length > 500) e["improve"] = "Please keep it under 500 characters.";
  return e;
}

export function addHrComment(
  s: P04State,
  internshipId: string,
  a: Actor,
  now: number,
  d: { rating: string; comment: string; strengths: string; improve: string },
): Result {
  const p = internshipById(s, internshipId);
  if (!p || a.role !== "Employer HR" || a.companyId !== p.companyId)
    return fail("This intern is not placed with your organisation.");
  if (gradeOf(s, p.id)) return fail("This internship has been graded, so feedback is closed.");
  if (internshipStatus(s, p, now) === "Not started") return fail("Feedback opens when the internship starts.");
  const errors = hrErrors(d);
  if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);
  const next = clone(s);
  next.counters.hrc++;
  const c: HrComment = {
    id: `HRC-${pad(next.counters.hrc)}`,
    internshipId: p.id,
    companyId: p.companyId,
    author: a.name,
    rating: d.rating as HrRating,
    comment: d.comment.trim(),
    strengths: d.strengths.trim(),
    improve: d.improve.trim(),
    at: new Date(now).toISOString(),
  };
  next.hr.push(c);
  return done(next, `Feedback sent to ${FACULTY.name}.`, c.id);
}

// ---------- Names ----------

export const firstName = (dir: Directory, studentId: string) =>
  dir.studentName(studentId).split(" ")[0] ?? "";
export const roleOf = (dir: Directory, p: Internship) => dir.listing(p.listingId)?.title ?? p.listingId;
export const companyOf = (dir: Directory, p: Internship) => dir.company(p.companyId)?.name ?? p.companyId;
export const daysIn = (p: Internship, now: number) => daysBetween(p.start, now);
export { DAY };
