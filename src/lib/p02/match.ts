/**
 * Match scores between a student and a listing, used for "Recommended for you" and for employers'
 * applicant ranking. Rules, not a model: the score is the share of required skills the student has;
 * preferred skills and work mode break ties. Year of study and the deadline are checked separately and never
 * hidden inside the score. A score is a suggestion; a person approves every placement.
 */
import type { Listing, Student } from "./data";

export interface SkillCheck {
  skill: string;
  has: boolean;
}

export interface Match {
  listingId: string;
  score: number; // 0-100
  required: SkillCheck[];
  preferred: SkillCheck[];
  yearOk: boolean;
  deadlineOpen: boolean;
  modeFit: boolean | null;
  /** 0-1, preferred skills and work mode; used only to order equal scores */
  tie: number;
}

const norm = (s: string) => s.trim().toLowerCase();

export function matchOne(student: Student, l: Listing, today = new Date()): Match {
  const mine = new Set(student.skills.map(norm));
  const required = l.required.map((skill) => ({ skill, has: mine.has(norm(skill)) }));
  const preferred = l.preferred.map((skill) => ({ skill, has: mine.has(norm(skill)) }));
  const share = (xs: SkillCheck[]) => (xs.length ? xs.filter((x) => x.has).length / xs.length : 0);
  const modeFit = student.mode ? student.mode === l.mode : null;
  // Score = share of required skills met (as in Team 2's tests: Aisha, 2 of 3, 67%).
  // Preferred skills and work mode only break ties.
  const tie = 0.6 * share(preferred) + 0.4 * (modeFit === null ? 0.5 : modeFit ? 1 : 0);
  return {
    listingId: l.id,
    score: Math.round(share(required) * 100),
    tie,
    required,
    preferred,
    yearOk: !student.year || student.year >= l.minYear,
    deadlineOpen: l.deadline >= today.toISOString().slice(0, 10),
    modeFit,
  };
}

/** Top N listings for a student: eligible ones first, then by score. */
export function recommend(
  student: Student,
  listings: Listing[],
  n = 3,
  today = new Date(),
): Match[] {
  return listings
    .map((l) => matchOne(student, l, today))
    .filter((m) => m.score > 0)
    .sort(
      (a, b) =>
        Number(b.yearOk && b.deadlineOpen) - Number(a.yearOk && a.deadlineOpen) ||
        b.score - a.score ||
        b.tie - a.tie,
    )
    .slice(0, n);
}

/** True when the student has filled in enough for recommendations. */
export const canRecommend = (s: Student | null): s is Student =>
  !!s && s.skills.length > 0 && !!s.major;
