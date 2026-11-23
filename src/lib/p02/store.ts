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

export interface LaunchpadState {
  view: View;
  companyId: string;
  demoProfile: string;
  profile: Profile | null;
  listings: Listing[];
  applications: Application[];
  aiLog: AiLogEntry[];
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
});

// ---------- Pure helpers (tested) ----------

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

export function updateListing(s: LaunchpadState, id: string, f: ListingInput): LaunchpadState {
  const e = validateListing(f);
  if (Object.keys(e).length) throw new Error(Object.values(e)[0]);
  // An edited listing goes back to the admin before students see the change.
  return {
    ...s,
    listings: s.listings.map((l) => (l.id === id ? { ...l, ...f, status: "Pending Review" } : l)),
  };
}

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
