/**
 * P04 AI helpers for faculty: internship brief, report summary, meeting prep and early warning.
 * Rules-based: each answer is written from the records in this app with fixed rules and templates,
 * so it works without a model key. Faculty make every decision; nothing here changes a record.
 *
 * Each generator returns the "thinking" steps it shows, the answer as light markdown and the records
 * it used, or `na` when there is nothing to work on. `variant` changes the wording, not the facts.
 */
import {
  FACULTY,
  companyOf,
  firstName,
  gradeOf,
  hrOf,
  internshipById,
  internshipStatus,
  meetingStats,
  meetingsOf,
  monthStatus,
  monthsOf,
  nextMeetingOf,
  reportById,
  reportStats,
  reportStatus,
  reportsOf,
  roleOf,
} from "./rules";
import { daysBetween, fmtDate, fmtTime, ms, plural } from "./time";
import type { Directory, Internship, InternshipStatus, P04State } from "./types";

export type AiKind = "brief" | "summary" | "prep" | "warn";
export type AiAnswer = { steps: string[]; text: string; sources: string[] } | { na: string };

export const AI_NAME = "IPP Assistant";

export const AI_KINDS: Record<AiKind, { title: string; intro: string; button: string }> = {
  brief: {
    title: "AI internship brief",
    intro: "Get a short introduction to the company and a summary of the role and its requirements.",
    button: "Generate brief",
  },
  summary: {
    title: "AI report summary",
    intro: "Summarise this report in three points and flag anything you should follow up.",
    button: "Summarise report",
  },
  prep: {
    title: "AI meeting prep",
    intro: "Get suggested questions and an agenda for the next monthly meeting, based on reports and supervisor feedback.",
    button: "Prepare meeting",
  },
  warn: {
    title: "AI early warning",
    intro: "Check reports, meetings and supervisor feedback for signs that an intern is struggling.",
    button: "Run check",
  },
};

// ---------- Text helpers ----------

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = <T>(arr: readonly T[], v: number): T => arr[v % arr.length]!;

const NONE_RX =
  /^\s*(none|nothing|n\/a|na|no|not right now|none (right now|at the moment|at this stage)|nothing (right now|at the moment))[\s.!]*$/i;
export const meaningful = (t: string | null | undefined) =>
  !!(t && t.trim() && !NONE_RX.test(t.trim()) && !/^none\b/i.test(t.trim()) && !/^nothing right now/i.test(t.trim()));
export const RISK_RX =
  /\b(late|behind|stuck|confus\w*|unclear|delay\w*|lost|problem\w*|difficult\w*|struggl\w*|owe|missing|missed|failed|overwhelm\w*|conflict\w*|by hand|no reply|not repl\w*)\b/i;

const firstSentence = (t: string) => (/^[\s\S]*?[.!?](\s|$)/.exec(t.trim())?.[0] ?? t).trim();
export function shorten(t: string, max = 20): string {
  const s = firstSentence(t).replace(/[.!?]$/, "");
  const w = s.split(/\s+/).filter(Boolean);
  return w.length > max ? `${w.slice(0, max).join(" ").replace(/[,;:]$/, "")}…` : s;
}
/** "I moved… so I can…" → "Aisha moved… so they can…" */
export function third(t: string, name: string): string {
  const s = t
    .replace(/^I’m\b|^I'm\b/, `${name} is`)
    .replace(/^I\b/, name)
    .replace(/^My\b/, `${name}’s`);
  return s
    .replace(/\bI’m\b|\bI'm\b/g, "they’re")
    .replace(/\bI\b/g, "they")
    .replace(/\bmy\b/g, "their")
    .replace(/\bMy\b/g, "Their")
    .replace(/\bme\b/g, "them")
    .replace(/\bmyself\b/g, "themselves");
}
const sentence = (t: string) => {
  const s = t.trim();
  return s && !/[.!?…]$/.test(s) ? `${s}.` : s;
};
const wordCount = (c: Record<string, unknown>) =>
  Object.values(c)
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

/** Short, generic descriptions of Launchpad's synthetic companies. */
const COMPANY_TEXT: Record<string, [string, string]> = {
  "gulf-insight": ["a data and analytics company", "It helps teams turn their numbers into reports and decisions."],
  "falcon-ai": ["an applied AI lab", "Its teams take machine learning models from data all the way to working products."],
  "dune-software": ["a software company", "It builds web and cloud products, so code quality and teamwork shape the daily work."],
  "aldar-digital": ["a digital studio for real estate", "It builds dashboards and reports that sales and pricing teams use every week."],
  "noor-labs": ["a software lab", "It builds web products for clients, with small teams and short release cycles."],
  "oasis-media": ["a media group", "Its teams plan campaigns and measure how audiences respond."],
  "green-dunes": ["an energy company", "It works on sustainability projects where data helps plan and track energy use."],
  "hikma-health": ["a health technology company", "It builds patient-facing apps, so privacy and simple, calm design matter a lot."],
  "falcon-capital": ["an investment firm", "Its analysts research companies and markets and present clear recommendations."],
  "reem-robotics": ["a robotics company", "It builds and tests robots, so software, hardware and safety work closely together."],
  "dune-talent": ["a talent and recruitment firm", "It helps companies find and hire people, so communication and organisation are key."],
};

// ---------- 1. Internship brief ----------

export function aiBrief(s: P04State, dir: Directory, id: string, v: number, now: number): AiAnswer {
  const p = internshipById(s, id);
  if (!p) return { na: "This internship could not be found." };
  const l = dir.listing(p.listingId);
  const co = dir.company(p.companyId);
  if (!l || !co) return { na: "The listing for this internship could not be found." };
  const name = firstName(dir, p.studentId);
  const text = COMPANY_TEXT[p.companyId] ?? ["an organisation that hosts interns", "It works with the university through the co-op programme."];
  const reqs = l.requirements.slice(0, 4);
  const skills = [...l.required, ...l.preferred].slice(0, 5);
  const nRep = reportsOf(s, p.id).length;
  const steps = [
    `Reading placement record ${p.id} for ${dir.studentName(p.studentId)}`,
    `Looking up ${co.name} (${l.city})`,
    `Reading the role: ${l.title}, ${l.duration}, ${l.mode}`,
    `Pulling ${plural(reqs.length, "requirement")} and ${plural(skills.length, "key skill")}`,
    "Writing a short brief for the faculty advisor",
  ];
  const t: string[] = ["## About the company"];
  t.push(
    pick(
      [`**${co.name}** is ${text[0]} in ${l.city}. ${text[1]}`, `${co.name} is ${text[0]} based in ${l.city}. ${text[1]}`],
      v,
    ),
    "",
    "## The role",
    pick(
      [
        `${name} joins as **${l.title}** for ${l.duration} (${l.type.toLowerCase()}, ${l.mode.toLowerCase()}, ${l.city}). `,
        `The placement is a ${l.duration} **${l.title}** ${l.type.toLowerCase()}, ${l.mode.toLowerCase()} in ${l.city}. `,
      ],
      v,
    ) + sentence(firstSentence(l.description)),
    pick([`In short: ${sentence(l.summary)}`, `Main goal: ${sentence(l.summary)}`], v),
    "",
  );
  if (reqs.length) {
    t.push("## Key requirements");
    for (const r of reqs) t.push(`- ${r}`);
    t.push("");
  }
  if (skills.length) {
    t.push(
      "## What to look for in reports",
      pick(
        [
          `Watch for evidence of **${skills.join(", ")}** in ${name}’s reports and the supervisor’s comments.`,
          `Good reports should show growth in **${skills.join(", ")}**. Ask about these in the monthly meetings.`,
        ],
        v,
      ),
      "",
    );
  }
  t.push(
    "## At a glance",
    `- ${fmtDate(p.start)} to ${fmtDate(p.end)} (${Math.round(p.days / 7)} weeks), status: ${internshipStatus(s, p, now)}`,
    `- ${plural(nRep, "progress report")} and ${plural(monthsOf(p).length, "monthly meeting")} expected`,
    `- Workplace supervisor: ${co.hr}`,
  );
  return { steps, text: t.join("\n"), sources: [`Placement ${p.id}`, `Listing “${l.title}”`, co.name] };
}

// ---------- 2. Report summary ----------

export function aiReportSummary(s: P04State, dir: Directory, id: string, v: number): AiAnswer {
  const r = reportById(s, id);
  if (!r) return { na: "This report could not be found." };
  if (!r.content) return { na: "Nothing to summarise yet. This report has not been submitted." };
  const p = internshipById(s, r.internshipId)!;
  const name = firstName(dir, p.studentId);
  const c = r.content;
  const prev = reportsOf(s, p.id)
    .filter((x) => x.number < r.number && x.content)
    .pop();
  const words = wordCount({ ...c });
  const steps = [
    `Reading Report ${r.number} from ${dir.studentName(p.studentId)} (${words} words)`,
    `Checking timing: due ${fmtDate(r.due)}, first submitted ${r.submittedAt ? fmtDate(r.submittedAt) : "–"}`,
    prev ? `Comparing with Report ${prev.number}` : "No earlier report to compare with",
    "Looking for blockers and requests for help",
    "Summarising in three points",
  ];
  const flags: string[] = [];
  if (r.late && r.submittedAt)
    flags.push(`[!] Submitted ${plural(Math.max(1, daysBetween(r.due, r.submittedAt)), "day")} after the due date.`);
  if (meaningful(c.helpNeeded)) flags.push(`[!] Asks for help: “${shorten(c.helpNeeded, 18)}”`);
  if (meaningful(c.challenges) && RISK_RX.test(c.challenges))
    flags.push(`[!] Challenge to follow up: ${sentence(shorten(third(c.challenges, name), 22))}`);
  if (c.hours !== null) {
    if (c.hours < 30) flags.push(`[!] Only ${c.hours} hours logged in two weeks. Check the workload.`);
    else if (c.hours > 90) flags.push(`[!] ${c.hours} hours in two weeks. Check the student is not overloaded.`);
  }
  if (words < 60) flags.push("[!] Little detail. You may want to ask for more.");
  if (r.versions.length) flags.push(`[ok] Revised after your comments (version ${r.versions.length + 1}).`);
  if (!flags.some((f) => f.startsWith("[!]")))
    flags.push(`[ok] ${pick(["No problems spotted in this report.", "Nothing worrying in this report."], v)}`);
  const t = [
    "## Summary",
    `- **Worked on:** ${sentence(shorten(third(c.workedOn, name), 22))}`,
    `- **Learned:** ${sentence(shorten(third(c.learned, name), 22))}`,
    `- **Next:** ${sentence(shorten(third(c.nextPlan, name), 20))}`,
    "",
    "## Flags",
    ...flags.map((f) => `- ${f}`),
  ];
  const parts = [
    pick(
      [
        `Thanks, ${name}. This is a clear update.`,
        `Thank you, ${name}. Good progress in this period.`,
        `Thanks, ${name}, I can see what you worked on.`,
      ],
      v,
    ),
  ];
  if (meaningful(c.helpNeeded)) parts.push("Let’s talk about your question in our next meeting.");
  if (r.late) parts.push("Please tell me early if a deadline is at risk.");
  if (words < 60) parts.push("Please add more detail on what you learned.");
  if (parts.length === 1) parts.push(pick(["Keep linking your work to your learning goals.", "Keep it up."], v));
  t.push("", "## Suggested comment", `> ${parts.join(" ")}`, "", "_Draft only. Edit it before you send it._");
  return {
    steps,
    text: t.join("\n"),
    sources: [`Report ${r.number} (${r.id})`, ...(prev ? [`Report ${prev.number}`] : [])],
  };
}

// ---------- 3. Meeting prep ----------

export function aiPrep(s: P04State, dir: Directory, id: string, v: number, now: number): AiAnswer {
  const p = internshipById(s, id);
  if (!p) return { na: "This internship could not be found." };
  if (gradeOf(s, p.id)) return { na: "This internship has been graded, so there are no more meetings to prepare." };
  const name = firstName(dir, p.studentId);
  const company = companyOf(dir, p);
  const st = internshipStatus(s, p, now);
  const next = nextMeetingOf(s, p, now);
  const done = meetingsOf(s, p.id).filter((m) => m.status === "Completed");
  const lastDone = done[done.length - 1];
  const reps = reportsOf(s, p.id).filter((r) => r.content);
  const latest = reps[reps.length - 1];
  const hrs = hrOf(s, p.id);
  const lastHr = hrs[hrs.length - 1];
  const rs = reportStats(s, p, now);
  const mst = meetingStats(s, p, now);
  const daysLeft = daysBetween(now, p.end);
  const steps = [
    `Finding the next meeting: ${next ? `${fmtDate(next.start)}, ${fmtTime(next.start)} (${next.status.toLowerCase()})` : "none booked yet"}`,
    reps.length ? `Reading the last ${plural(Math.min(2, reps.length), "report")}` : "No reports submitted yet",
    hrs.length ? `Reading ${plural(hrs.length, "supervisor comment")}` : "No supervisor feedback yet",
    "Checking report and meeting history",
    `Drafting questions for ${name}`,
  ];
  const t = [
    "## Since the last meeting",
    `- ${lastDone ? `Last meeting: ${fmtDate(lastDone.start)} (Month ${lastDone.month}).` : `This will be the first meeting with ${name}.`}`,
  ];
  if (reps.length)
    t.push(
      `- Reports: ${rs.submitted} of ${rs.total} submitted, ${rs.reviewed} reviewed${rs.late ? `, ${rs.late} late` : ""}${rs.missing.length ? `, ${rs.missing.length} missing or overdue` : ""}.`,
    );
  if (lastHr) t.push(`- Supervisor: ${lastHr.rating.toLowerCase()} (${fmtDate(lastHr.at)}). “${shorten(lastHr.comment, 18)}”`);
  if (next) t.push(`- ${name}’s agenda: “${next.agenda}”`);
  if (st === "Ended – awaiting grade")
    t.push(`- The internship ended on ${fmtDate(p.end)}. Use this as a final check-in before you grade.`);
  const q: string[] = [];
  if (!reps.length)
    q.push(
      `How were your first days at ${company}? What surprised you?`,
      "What are your three learning goals for this internship?",
      "Who is your day-to-day supervisor, and how often do you meet?",
    );
  if (latest?.content && meaningful(latest.content.helpNeeded))
    q.push(`In Report ${latest.number} you asked: “${shorten(latest.content.helpNeeded, 16)}”. What would help most?`);
  if (rs.changes.length)
    q.push(`Report ${rs.changes.map((r) => r.number).join(", ")} still needs the changes I asked for. When can you send them?`);
  const firstMissing = rs.missing[0];
  if (firstMissing)
    q.push(
      `Report ${rs.missing.map((r) => r.number).join(", ")} is ${rs.missing.length > 1 ? "missing" : reportStatus(s, firstMissing, now).toLowerCase()}. What is getting in the way?`,
    );
  else if (rs.late)
    q.push(pick(["Some reports came in late. What would help you hand them in on time?", "How can we make the report deadlines easier to meet?"], v));
  if (mst.missedMonths.length)
    q.push(`We missed the Month ${mst.missedMonths.join(", ")} meeting. How can we make sure we meet every month?`);
  if (lastHr && lastHr.rating !== "On track" && lastHr.improve)
    q.push(`Your supervisor noted: “${shorten(lastHr.improve, 16)}”. How do you see it?`);
  if (lastHr && lastHr.rating === "On track" && lastHr.strengths)
    q.push(`Your supervisor praised this: “${shorten(lastHr.strengths, 14)}”. Where would you like to grow next?`);
  if (latest?.content && st === "In progress") q.push(`Your plan: “${shorten(latest.content.nextPlan, 14)}”. What could stop you?`);
  if (st === "Ended – awaiting grade") q.push("Looking back, what are the two most important things you learned in this internship?");
  if (daysLeft <= 21 && daysLeft >= 0) q.push(`With ${plural(daysLeft, "day")} left, how are you preparing your handover and final reflection?`);
  q.push(pick(["How does your current work link to your course learning outcomes?", "What is one skill you have grown most in so far?"], v));
  const uniq = q.filter((x, i) => q.indexOf(x) === i).slice(0, 4);
  t.push("", "## Suggested questions", ...uniq.map((x, i) => `${i + 1}. ${x}`));
  const focus =
    rs.changes.length || rs.missing.length
      ? "Missing and pending reports"
      : lastHr && lastHr.rating !== "On track"
        ? "Supervisor feedback"
        : st === "Ended – awaiting grade"
          ? "Final reflection on the internship"
          : latest
            ? "Latest report and next two weeks"
            : "Learning goals";
  t.push("", "## Suggested agenda (30 min)", "- Check-in (5 min)", `- ${focus} (15 min)`, "- Agree next steps and the next meeting date (10 min)");
  return {
    steps,
    text: t.join("\n"),
    sources: [plural(Math.min(2, reps.length), "report"), plural(hrs.length, "supervisor comment"), plural(done.length, "past meeting")],
  };
}

// ---------- 4. Early warning ----------

export type RiskLevel = "Needs attention" | "Watch" | "On track" | "Too early to tell";
const RISK_ORDER: Record<RiskLevel, number> = { "Needs attention": 0, Watch: 1, "On track": 2, "Too early to tell": 3 };

/** A simple, explainable score. Each reason adds points; the level comes from the total. */
export function riskOf(s: P04State, p: Internship, now: number): { score: number; level: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const add = (n: number, why: string) => {
    score += n;
    reasons.push(why);
  };
  const st = internshipStatus(s, p, now);
  const days = daysBetween(p.start, now);
  const reps = reportsOf(s, p.id);
  for (const r of reps) {
    const rst = reportStatus(s, r, now);
    if (rst === "Missing") add(3, `Report ${r.number} is missing.`);
    else if (rst === "Overdue") add(2, `Report ${r.number} is overdue (due ${fmtDate(r.due)}).`);
    if (rst === "Changes requested") {
      const h = r.history.filter((x) => x.to === "Changes requested").pop();
      const d = h ? daysBetween(h.at, now) : 0;
      if (d >= 7) add(2, `Report ${r.number} has waited ${d} days for the changes you asked for.`);
    }
  }
  const late = reps.filter((r) => r.late).length;
  if (late) add(late, `${plural(late, "report")} submitted late.`);
  for (const n of meetingStats(s, p, now).missedMonths) add(2, `Month ${n} meeting was missed.`);
  const cur = monthsOf(p).find((m) => now >= ms(m.start) && now < ms(m.end));
  if (cur && st === "In progress" && monthStatus(s, p, cur, now) === "Not booked" && daysBetween(cur.start, now) >= 15)
    add(1, `No meeting booked yet for Month ${cur.month}.`);
  const hrs = hrOf(s, p.id);
  const last = hrs[hrs.length - 1];
  const prevHr = hrs[hrs.length - 2];
  if (last?.rating === "Serious concerns")
    add(4, `Supervisor has serious concerns (${fmtDate(last.at)}): “${shorten(last.comment, 16)}”`);
  else if (last?.rating === "Some concerns")
    add(2, `Supervisor has some concerns (${fmtDate(last.at)}): “${shorten(last.comment, 16)}”`);
  else if (last && prevHr && prevHr.rating !== "On track") {
    score = Math.max(0, score - 1);
    reasons.push("Supervisor feedback has improved to on track.");
  }
  if (!hrs.length && days >= 28 && st === "In progress") add(1, `No supervisor feedback after ${days} days.`);
  const latest = reps.filter((r) => r.content).pop()?.content;
  if (latest) {
    const ch = meaningful(latest.challenges) && RISK_RX.test(latest.challenges);
    const help = meaningful(latest.helpNeeded) && RISK_RX.test(latest.helpNeeded);
    if (ch || help) add(1, `Latest report mentions a problem: “${shorten(ch ? latest.challenges : latest.helpNeeded, 14)}”`);
  }
  const early = st === "Not started" || days < 14;
  const level: RiskLevel = early && score < 2 ? "Too early to tell" : score >= 5 ? "Needs attention" : score >= 2 ? "Watch" : "On track";
  if (!reasons.length)
    reasons.push(early ? "The internship has just started. No reports are due yet." : "Reports, meetings and supervisor feedback all look fine.");
  return { score, level, reasons };
}

function nextStepFor(level: RiskLevel, name: string, st: InternshipStatus): string {
  const ended = st === "Ended – awaiting grade";
  if (level === "Needs attention")
    return ended
      ? `Look at these points carefully before you grade ${name}. Consider asking the supervisor for a short call.`
      : `Invite ${name} to a meeting this week and contact the workplace supervisor.`;
  if (level === "Watch") return ended ? "Check these points in the grading summary before you decide." : "Raise these points at the next monthly meeting.";
  if (level === "Too early to tell") return "Check again after the first report is due.";
  return "No action needed now.";
}

/** `id` is an internship id, or "all" for every active internship of this faculty member. */
export function aiWarn(s: P04State, dir: Directory, id: string, v: number, now: number): AiAnswer {
  const all = id === "all";
  const list = all
    ? s.internships.filter((p) => p.facultyId === FACULTY.id && !gradeOf(s, p.id))
    : s.internships.filter((p) => p.id === id);
  const first = list[0];
  if (!first) return { na: all ? "There are no active internships to check." : "This internship could not be found." };
  if (!all && gradeOf(s, first.id)) return { na: "This internship has been graded. The early warning is only for active internships." };
  const scored = list
    .map((p) => ({ p, ...riskOf(s, p, now) }))
    .sort((a, b) => RISK_ORDER[a.level] - RISK_ORDER[b.level] || b.score - a.score);
  const nRep = list.reduce((n, p) => n + reportsOf(s, p.id).length, 0);
  const nMtg = list.reduce((n, p) => n + meetingsOf(s, p.id).length, 0);
  const nHr = list.reduce((n, p) => n + hrOf(s, p.id).length, 0);
  const steps = [
    all ? `Scanning ${plural(list.length, "active internship")}` : `Loading ${dir.studentName(first.studentId)}’s internship (${first.id})`,
    `Checking ${plural(nRep, "report")} for late, missing or pending work`,
    `Checking ${plural(nMtg, "meeting")} against the monthly plan`,
    `Reading ${plural(nHr, "supervisor comment")}`,
    all ? "Ranking interns by risk" : "Weighing the signals",
  ];
  const t: string[] = [];
  if (all) {
    const need = scored.filter((x) => x.level === "Needs attention").length;
    const watch = scored.filter((x) => x.level === "Watch").length;
    const parts = [
      need ? `${plural(need, "intern")} ${need === 1 ? "needs" : "need"} attention` : "",
      watch ? `${plural(watch, "intern")} should be watched` : "",
    ].filter(Boolean);
    t.push(
      "## Overview",
      parts.length
        ? pick([`Out of ${plural(list.length, "active internship")}, ${parts.join(" and ")}.`, `${parts.join(" and ")}, out of ${plural(list.length, "active internship")}.`], v)
            .replace(/^./, (c) => c.toUpperCase())
        : `All ${plural(list.length, "active internship")} look on track.`,
      "",
    );
  }
  for (const x of scored) {
    const name = dir.studentName(x.p.studentId);
    t.push(`${all ? "###" : "##"} ${name} {{badge:${x.level}}}`);
    if (all) t.push(`_${roleOf(dir, x.p)}, ${companyOf(dir, x.p)} · ${internshipStatus(s, x.p, now)}_`);
    for (const r of x.reasons) t.push(`- ${r}`);
    t.push(
      `**Suggested next step:** ${nextStepFor(x.level, name.split(" ")[0] ?? name, internshipStatus(s, x.p, now))}${all ? ` {{link:${x.p.id}:Open internship}}` : ""}`,
      "",
    );
  }
  t.push("_The score uses late or missing reports, missed meetings, supervisor ratings and words like “late” or “stuck” in reports. It supports your judgement and does not replace it._");
  return {
    steps,
    text: t.join("\n"),
    sources: [plural(list.length, "internship"), plural(nRep, "report"), plural(nMtg, "meeting"), plural(nHr, "supervisor comment")],
  };
}

export function generate(kind: AiKind, s: P04State, dir: Directory, id: string, v: number, now: number): AiAnswer {
  if (kind === "brief") return aiBrief(s, dir, id, v, now);
  if (kind === "summary") return aiReportSummary(s, dir, id, v);
  if (kind === "prep") return aiPrep(s, dir, id, v, now);
  return aiWarn(s, dir, id, v, now);
}

