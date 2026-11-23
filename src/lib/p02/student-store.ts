/**
 * The student's own profile and applications in Team 2's Launchpad flow (Profile → Opportunities → Apply →
 * Admin review). Saved in this browser until P01 (profiles) and P04 (applications) write them to the
 * shared database. All records are synthetic.
 */
import { useSyncExternalStore } from "react";
import { DEMO_APPLICATIONS } from "./demo-data";

export const STUDENT_KEY = "ipp-launchpad-v1";

export interface Profile {
  fullName: string;
  email: string;
  major: string;
  gradYear: string;
  skills: string[];
  bio: string;
}

export type AppStatus = "Submitted" | "Shortlisted" | "Approved" | "Rejected" | "Not placed";

export interface Application {
  id: string;
  student: string;
  email: string;
  opportunity_id: string;
  title: string;
  employer: string;
  appliedAt: string;
  status: AppStatus;
  /** true for the signed-in student's own applications */
  mine: boolean;
}

export interface StudentState {
  profile: Profile | null;
  applications: Application[];
}

export const EMPTY_PROFILE: Profile = {
  fullName: "",
  email: "",
  major: "",
  gradYear: "",
  skills: [],
  bio: "",
};
export const BIO_LIMIT = 320;

const seed = (): StudentState => ({ profile: null, applications: DEMO_APPLICATIONS });

// ---------- Pure rules (tested) ----------

export function validateProfile(p: Profile): Partial<Record<keyof Profile, string>> {
  const e: Partial<Record<keyof Profile, string>> = {};
  if (!p.fullName.trim()) e.fullName = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) e.email = "Enter your university email.";
  if (p.bio.length > BIO_LIMIT) e.bio = `Keep the bio under ${BIO_LIMIT} characters.`;
  return e;
}

/** Adds skills typed as "a, b" without duplicates (case-insensitive). */
export function addSkills(skills: string[], typed: string): string[] {
  const next = [...skills];
  for (const raw of typed.split(",")) {
    const s = raw.trim().slice(0, 40);
    if (s && !next.some((x) => x.toLowerCase() === s.toLowerCase())) next.push(s);
  }
  return next.slice(0, 20);
}

export function saveProfileTo(state: StudentState, p: Profile): StudentState {
  const errors = validateProfile(p);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const profile = { ...p, fullName: p.fullName.trim(), email: p.email.trim(), bio: p.bio.trim() };
  // Keep the name and email on the student's existing applications in step with the profile.
  const applications = state.applications.map((a) =>
    a.mine ? { ...a, student: profile.fullName, email: profile.email } : a,
  );
  return { profile, applications };
}

export function applyTo(
  state: StudentState,
  l: { id: string; title: string; employer: string },
  now = new Date(),
): StateWithId {
  if (!state.profile)
    throw new Error("Create your profile first. Companies see it when you apply.");
  if (state.applications.some((a) => a.mine && a.opportunity_id === l.id))
    throw new Error("You have already applied to this placement.");
  const max = state.applications.reduce(
    (m, a) => Math.max(m, Number(/(\d+)$/.exec(a.id)?.[1] ?? 0)),
    0,
  );
  const id = `LA-${String(max + 1).padStart(3, "0")}`;
  const app: Application = {
    id,
    student: state.profile.fullName,
    email: state.profile.email,
    opportunity_id: l.id,
    title: l.title,
    employer: l.employer,
    appliedAt: now.toISOString(),
    status: "Submitted",
    mine: true,
  };
  return { state: { ...state, applications: [app, ...state.applications] }, id };
}
type StateWithId = { state: StudentState; id: string };

export function decide(state: StudentState, id: string, status: AppStatus): StudentState {
  if (!state.applications.some((a) => a.id === id))
    throw new Error("That application was not found.");
  return {
    ...state,
    applications: state.applications.map((a) => (a.id === id ? { ...a, status } : a)),
  };
}

export const myApplications = (s: StudentState) => s.applications.filter((a) => a.mine);

export function counts(apps: Application[]) {
  return {
    submitted: apps.filter((a) => a.status === "Submitted").length,
    approved: apps.filter((a) => a.status === "Approved").length,
    rejected: apps.filter((a) => a.status === "Rejected").length,
  };
}

// ---------- Browser store ----------

let cache: StudentState | null = null;
const listeners = new Set<() => void>();

function load(): StudentState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STUDENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as StudentState) : null;
    cache = parsed && Array.isArray(parsed.applications) ? parsed : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

export function commitStudent(action: (s: StudentState) => StudentState): void {
  const next = action(load());
  cache = next;
  try {
    window.localStorage.setItem(STUDENT_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: keep the in-memory copy for this visit */
  }
  listeners.forEach((l) => l());
}

export function resetStudent(): void {
  commitStudent(() => seed());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** null during server rendering and before hydration. */
export function useStudent(): StudentState | null {
  return useSyncExternalStore(subscribe, load, () => null);
}
