/**
 * Launchpad state (Team 2's flow): the current view, the signed-in student's profile, listings,
 * applications and the AI review log. Saved in this browser for the demo. All records are synthetic.
 */
import { useSyncExternalStore } from "react";
import {
  APPLICATIONS,
  LISTINGS,
  STUDENTS,
  type Application,
  type AppStatus,
  type Listing,
  type Student,
  type WorkMode,
} from "./data";

export const LAUNCHPAD_KEY = "ipp-launchpad-v2";
export type View = "student" | "employer" | "admin";
export type AiKind = "Chatbot" | "Matching" | "Employer AI";

export interface AiLogEntry {
  id: string;
  kind: AiKind;
  title: string;
  detail: string;
  /** true when a language model wrote it; false when it came from rules or a template */
  model: boolean;
  at: string;
}

export interface Profile {
  name: string;
  email: string;
  major: string;
  year: string;
  gradYear: string;
  city: string;
  mode: "" | WorkMode;
  interest: string;
  skills: string[];
  bio: string;
}

/** Team 3 (P03) listing review decision, kept in the decision log. IDs follow the shared database (REV-0001). */
export interface ListingReview {
  id: string;
  listingId: string;
  version: number;
  decision: "Approved" | "Changes Requested" | "Declined" | "Resubmitted" | "Closed";
  reason: string;
  checks: string[];
  aiAssisted: boolean;
  by: string;
  at: string;
}

export interface ReviewRule {
  id: string;
  text: string;
  at: string;
}

export const REVIEWER = "Sara Ahmed, Careers coordinator";
export const P03_CHECKS = ["completeness", "supervision", "timing", "tasks", "learning"] as const;

export interface LaunchpadState {
  view: View;
  companyId: string;
  demoProfile: string;
  profile: Profile | null;
  listings: Listing[];
  applications: Application[];
  aiLog: AiLogEntry[];
  reviews: ListingReview[];
  rules: ReviewRule[];
}

export const EMPTY_PROFILE: Profile = {
  name: "",
  email: "",
  major: "",
  year: "",
  gradYear: "",
  city: "",
  mode: "",
  interest: "",
  skills: [],
  bio: "",
};
export const BIO_LIMIT = 320;
export const ME = "me";

export const seed = (): LaunchpadState => ({
  view: "student",
  companyId: "gulf-insight",
  demoProfile: "me",
  profile: null,
  listings: LISTINGS,
  applications: APPLICATIONS,
  aiLog: [],
  reviews: [],
  rules: [],
});

// ---------- Pure helpers (tested) ----------

/**
 * The view a page belongs to, from its address. The address is the source of truth: Back, links and
 * typed URLs switch the view instead of showing an "… only" notice. Shared pages return null.
 */
export function viewForPath(path: string): View | null {
  if (path === "/p03/employer" || path === "/p04/employer" || path.startsWith("/employer"))
    return "employer";
  if (path === "/p04/student") return "student";
  if (
    path.startsWith("/admin") ||
    path.startsWith("/p03") ||
    path.startsWith("/p05") ||
    path.startsWith("/p04") ||
    path === "/p01/coordinator"
  )
    return "admin";
  if (
    ["/profile", "/opportunities", "/applications", "/matches", "/student", "/p01/profile"].some(
      (p) => path === p || path.startsWith(`${p}/`),
    )
  )
    return "student";
  return null;
}

export function meAsStudent(p: Profile | null): Student | null {
  if (!p) return null;
  return {
    id: ME,
    name: p.name,
    email: p.email,
    major: p.major,
    year: Number(p.year) || 0,
    skills: p.skills,
    ...(p.mode ? { mode: p.mode } : {}),
    ...(p.city ? { city: p.city } : {}),
    ...(p.interest ? { interest: p.interest } : {}),
  };
}

export function studentById(s: LaunchpadState, id: string): Student | null {
  return id === ME ? meAsStudent(s.profile) : (STUDENTS.find((x) => x.id === id) ?? null);
}

export const openListings = (s: LaunchpadState, today = new Date()) =>
  s.listings.filter(
    (l) => l.status === "Approved" && l.deadline >= today.toISOString().slice(0, 10),
  );

export function validateProfile(p: Profile): Partial<Record<keyof Profile, string>> {
  const e: Partial<Record<keyof Profile, string>> = {};
  if (!p.name.trim()) e.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) e.email = "Enter your university email.";
  if (p.bio.length > BIO_LIMIT) e.bio = `Keep the bio under ${BIO_LIMIT} characters.`;
  return e;
}

export function addTags(tags: string[], typed: string, max = 20): string[] {
  const next = [...tags];
  for (const raw of typed.split(",")) {
    const t = raw.trim().slice(0, 40);
    if (t && !next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t);
  }
  return next.slice(0, max);
}

const nextId = (prefix: string, ids: string[]) =>
  `${prefix}-${String(ids.reduce((m, id) => Math.max(m, Number(/(\d+)$/.exec(id)?.[1] ?? 0)), 0) + 1).padStart(2, "0")}`;

export function saveProfile(s: LaunchpadState, p: Profile): LaunchpadState {
  const e = validateProfile(p);
  if (Object.keys(e).length) throw new Error(Object.values(e)[0]);
  return { ...s, profile: { ...p, name: p.name.trim(), email: p.email.trim(), bio: p.bio.trim() } };
}

export function apply(s: LaunchpadState, listingId: string, now = new Date()): LaunchpadState {
  const me = meAsStudent(s.profile);
  if (!me) throw new Error("Create your profile first. Companies see it when you apply.");
  const l = s.listings.find((x) => x.id === listingId);
  if (!l || l.status !== "Approved") throw new Error("This placement is not open.");
  if (l.deadline < now.toISOString().slice(0, 10))
    throw new Error("The application deadline has passed.");
  if (me.year && me.year < l.minYear)
    throw new Error(`This placement needs year ${l.minYear} or above.`);
  if (s.applications.some((a) => a.studentId === ME && a.listingId === listingId))
    throw new Error("You have already applied to this placement.");
  const app: Application = {
    id: nextId(
      "app",
      s.applications.map((a) => a.id),
    ),
    studentId: ME,
    listingId,
    appliedAt: now.toISOString(),
    status: "Submitted",
  };
  return { ...s, applications: [app, ...s.applications] };
}

export function setAppStatus(s: LaunchpadState, id: string, status: AppStatus): LaunchpadState {
  if (!s.applications.some((a) => a.id === id)) throw new Error("That application was not found.");
  return { ...s, applications: s.applications.map((a) => (a.id === id ? { ...a, status } : a)) };
}

export function setListingStatus(
  s: LaunchpadState,
  id: string,
  status: Listing["status"],
): LaunchpadState {
  return { ...s, listings: s.listings.map((l) => (l.id === id ? { ...l, status } : l)) };
}

export function deleteListing(s: LaunchpadState, id: string): LaunchpadState {
  return {
    ...s,
    listings: s.listings.filter((l) => l.id !== id),
    applications: s.applications.filter((a) => a.listingId !== id),
  };
}

export type ListingInput = Omit<Listing, "id" | "status" | "createdAt" | "companyId">;

export function validateListing(f: ListingInput): Partial<Record<keyof ListingInput, string>> {
  const e: Partial<Record<keyof ListingInput, string>> = {};
  if (!f.title.trim()) e.title = "Enter a title.";
  if (!f.city.trim()) e.city = "Enter a location.";
  if (!f.duration.trim()) e.duration = "Enter a duration.";
  if (!f.minYear) e.minYear = "Choose the minimum year.";
  if (!f.deadline) e.deadline = "Choose the application deadline.";
  if (!f.required.length) e.required = "Add at least one required skill.";
  if (f.description.trim().length < 30)
    e.description = "Write a description of at least 30 characters.";
  return e;
}

export function postListing(s: LaunchpadState, f: ListingInput, now = new Date()): LaunchpadState {
  const e = validateListing(f);
  if (Object.keys(e).length) throw new Error(Object.values(e)[0]);
  const slug = f.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const id = `${slug}-${now.getTime().toString(36)}`;
  const listing: Listing = {
    ...f,
    id,
    companyId: s.companyId,
    status: "Pending Review",
    createdAt: now.toISOString(),
  };
  return { ...s, listings: [listing, ...s.listings] };
}

const snapshot = (l: Listing, now: string) => ({
  version: l.version ?? 1,
  title: l.title,
  city: l.city,
  mode: l.mode,
  duration: l.duration,
  deadline: l.deadline,
  required: l.required,
  description: l.description,
  submittedAt: now,
});

export function updateListing(
  s: LaunchpadState,
  id: string,
  f: ListingInput,
  now = new Date(),
): LaunchpadState {
  const e = validateListing(f);
  if (Object.keys(e).length) throw new Error(Object.values(e)[0]);
  const old = s.listings.find((l) => l.id === id);
  if (!old) throw new Error("That listing was not found.");
  // Team 3 (P03): an edit is a new version that goes back to the admin; earlier versions are kept for comparison.
  const t = now.toISOString();
  const history = old.history?.length ? old.history : [snapshot(old, old.createdAt)];
  const version = (old.version ?? 1) + 1;
  const next: Listing = { ...old, ...f, status: "Pending Review", version };
  const reviews =
    old.status === "Changes Requested"
      ? [
          ...s.reviews,
          {
            id: nextReview(s.reviews),
            listingId: id,
            version,
            decision: "Resubmitted" as const,
            reason: "The employer edited the listing and sent it back.",
            checks: [],
            aiAssisted: false,
            by: "Employer",
            at: t,
          },
        ]
      : s.reviews;
  return {
    ...s,
    reviews,
    listings: s.listings.map((l) =>
      l.id === id ? { ...next, history: [...history, snapshot(next, t)] } : l,
    ),
  };
}

function nextReview(rs: ListingReview[]): string {
  const max = rs.reduce((m, r) => Math.max(m, Number(/^REV-(\d{4})$/.exec(r.id)?.[1] ?? 0)), 0);
  return `REV-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Listing decision. Approve and Reject are Group 2's one-click actions; Team 3 adds Request changes (needs a
 * reason the employer can act on) and an optional five-check checklist. Every decision goes to the decision log.
 */
export function reviewListing(
  s: LaunchpadState,
  id: string,
  decision: "Approved" | "Changes Requested" | "Declined",
  opts: { reason?: string; checks?: string[]; aiAssisted?: boolean; now?: Date } = {},
): LaunchpadState {
  const l = s.listings.find((x) => x.id === id);
  if (!l) throw new Error("That listing was not found.");
  if (l.status !== "Pending Review")
    throw new Error(`${l.title} is ${l.status}, not waiting for review.`);
  const checks = opts.checks ?? [];
  const reason = (opts.reason ?? "").replace(/\s+/g, " ").trim();
  // Group 2's Approve and Reject stay one click (their agreed flow). Team 3's checklist is optional and recorded.
  if (decision === "Changes Requested" && reason.length < 5)
    throw new Error("Enter a reason the employer can act on.");
  const ticked = P03_CHECKS.filter((c) => checks.includes(c)).length;
  const status: Listing["status"] =
    decision === "Approved"
      ? "Approved"
      : decision === "Declined"
        ? "Rejected"
        : "Changes Requested";
  const review: ListingReview = {
    id: nextReview(s.reviews),
    listingId: id,
    version: l.version ?? 1,
    decision,
    reason:
      decision === "Approved"
        ? `${ticked === P03_CHECKS.length ? "All five checks passed." : ticked ? `Approved with ${ticked} of 5 checks ticked.` : "Approved."}${reason ? ` ${reason}` : ""}`
        : decision === "Declined"
          ? reason || "Rejected by the co-op coordinator."
          : reason,
    checks,
    aiAssisted: !!opts.aiAssisted,
    by: REVIEWER,
    at: (opts.now ?? new Date()).toISOString(),
  };
  return { ...setListingStatus(s, id, status), reviews: [...s.reviews, review] };
}

export function closeListing(
  s: LaunchpadState,
  id: string,
  by: string,
  now = new Date(),
): LaunchpadState {
  const l = s.listings.find((x) => x.id === id);
  if (!l) throw new Error("That listing was not found.");
  const review: ListingReview = {
    id: nextReview(s.reviews),
    listingId: id,
    version: l.version ?? 1,
    decision: "Closed",
    reason: "Listing closed; students no longer see it.",
    checks: [],
    aiAssisted: false,
    by,
    at: now.toISOString(),
  };
  return { ...setListingStatus(s, id, "Closed"), reviews: [...s.reviews, review] };
}

export const latestReview = (s: LaunchpadState, listingId: string) =>
  [...s.reviews].reverse().find((r) => r.listingId === listingId && r.decision !== "Resubmitted");

export function addRule(s: LaunchpadState, text: string, now = new Date()): LaunchpadState {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 8) throw new Error("Write the rule as a full sentence.");
  if (t.length > 300) throw new Error("Keep a rule under 300 characters.");
  if (s.rules.length >= 25) throw new Error("The demo keeps at most 25 rules. Remove one first.");
  const max = s.rules.reduce((m, r) => Math.max(m, Number(/(\d+)$/.exec(r.id)?.[1] ?? 0)), 0);
  return {
    ...s,
    rules: [
      ...s.rules,
      { id: `RULE-${String(max + 1).padStart(3, "0")}`, text: t, at: now.toISOString() },
    ],
  };
}

export const removeRule = (s: LaunchpadState, id: string): LaunchpadState => ({
  ...s,
  rules: s.rules.filter((r) => r.id !== id),
});

export function logAi(
  s: LaunchpadState,
  e: Omit<AiLogEntry, "id" | "at">,
  now = new Date(),
): LaunchpadState {
  const entry: AiLogEntry = {
    ...e,
    id: `ai-${now.getTime().toString(36)}-${s.aiLog.length}`,
    at: now.toISOString(),
  };
  return { ...s, aiLog: [entry, ...s.aiLog].slice(0, 200) };
}

// ---------- Browser store ----------

let cache: LaunchpadState | null = null;
const listeners = new Set<() => void>();

function load(): LaunchpadState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(LAUNCHPAD_KEY);
    const parsed = raw ? (JSON.parse(raw) as LaunchpadState) : null;
    cache =
      parsed && Array.isArray(parsed.listings) && Array.isArray(parsed.applications)
        ? { ...seed(), ...parsed }
        : seed();
  } catch {
    cache = seed();
  }
  return cache;
}

export function getLaunchpad(): LaunchpadState {
  return load();
}

export function commit(action: (s: LaunchpadState) => LaunchpadState): void {
  cache = action(load());
  try {
    window.localStorage.setItem(LAUNCHPAD_KEY, JSON.stringify(cache));
  } catch {
    /* storage blocked: keep the in-memory copy */
  }
  listeners.forEach((l) => l());
}

export function resetLaunchpad(): void {
  commit(() => seed());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** null during server rendering and before hydration. */
export function useLaunchpad(): LaunchpadState | null {
  return useSyncExternalStore(subscribe, load, () => null);
}
