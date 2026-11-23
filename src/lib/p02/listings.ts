/**
 * Opportunities for the student pages (Team 2's Launchpad layout), read from the shared database.
 * Every open listing at its approved version, with skill names and requirements in plain words.
 * When the database cannot be reached the pages fall back to Team 2's own demo listings.
 */
import { getOpenListings, getSkills, type DbOptions } from "@/lib/db";
import type { ConditionJson, OpportunityRow, SkillRow } from "@/lib/db";
import { DEMO_LISTINGS } from "./demo-data";

export type ListingKind = "Internship" | "Co-op";

export interface Listing {
  id: string;
  version: number;
  title: string;
  employer: string;
  city: string;
  arrangement: string;
  start: string | null;
  end: string | null;
  duration: string;
  kind: ListingKind;
  description: string;
  tasks: string[];
  skills: string[];
  requirements: string[];
  niceToHave: string[];
  publishedAt: string | null;
}

export interface ListingSource {
  listings: Listing[];
  live: boolean;
  error?: string;
}

const ARRANGEMENT: Record<string, string> = {
  "on-site": "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

/** "12 weeks" or "6 months" from two ISO dates; "" when either is missing. Pure. */
export function durationLabel(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000;
  if (!Number.isFinite(days) || days <= 0) return "";
  const weeks = Math.round(days / 7);
  return weeks <= 20 ? `${weeks} weeks` : `${Math.round(days / 30.4)} months`;
}

/** Co-op when the placement runs 16 weeks or longer, as in Team 2's data. Pure. */
export function kindOf(start: string | null, end: string | null): ListingKind {
  if (!start || !end) return "Internship";
  return (Date.parse(end) - Date.parse(start)) / 86_400_000 >= 109 ? "Co-op" : "Internship";
}

function conditionText(c: ConditionJson, skill: (id: string | null) => string): string {
  if (c.kind === "skill") return skill(c.skill_id);
  if (c.kind === "availability") return "Available for the full placement dates";
  const where = (c.arrangements ?? []).join(" or ");
  return `Can work ${where || "as arranged"}${c.city ? ` in ${c.city}` : ""}`;
}

/** Maps one shared-database row to the student view. Pure. */
export function toListing(row: OpportunityRow, skills: Map<string, string>): Listing {
  const skill = (id: string | null) => (id ? (skills.get(id) ?? id) : "Skill not named");
  const skillConds = [...row.mandatory, ...row.desirable].filter((c) => c.kind === "skill");
  return {
    id: row.opportunity_id,
    version: row.version,
    title: row.title,
    employer: row.employer,
    city: row.city ?? "Location to be confirmed",
    arrangement: row.work_arrangement
      ? (ARRANGEMENT[row.work_arrangement] ?? row.work_arrangement)
      : "Not stated",
    start: row.start_date,
    end: row.end_date,
    duration: durationLabel(row.start_date, row.end_date) || "Dates to be confirmed",
    kind: kindOf(row.start_date, row.end_date),
    description: row.description ?? "",
    tasks: row.tasks ?? [],
    skills: [...new Set(skillConds.map((c) => skill(c.skill_id)))],
    requirements: row.mandatory.map((c) => conditionText(c, skill)),
    niceToHave: row.desirable.map((c) => conditionText(c, skill)),
    publishedAt: row.published_at,
  };
}

let cache: Promise<ListingSource> | null = null;

export function loadListings(opts?: DbOptions & { fresh?: boolean }): Promise<ListingSource> {
  if (cache && !opts?.fresh) return cache;
  cache = Promise.all([getOpenListings(opts), getSkills(opts)])
    .then(([rows, skills]: [OpportunityRow[], SkillRow[]]) => {
      const names = new Map(skills.map((s) => [s.skill_id, s.label]));
      return { listings: rows.map((r) => toListing(r, names)), live: true };
    })
    .catch((e: unknown) => {
      cache = null;
      return {
        listings: DEMO_LISTINGS,
        live: false,
        error: e instanceof Error ? e.message : "Network error",
      };
    });
  return cache;
}

export interface Filters {
  q: string;
  city: string;
  kind: string;
}

/** Search by role, company or skill, then location and type. Pure. */
export function filterListings(list: Listing[], f: Filters): Listing[] {
  const q = f.q.trim().toLowerCase();
  return list.filter(
    (l) =>
      (!q || `${l.title} ${l.employer} ${l.skills.join(" ")}`.toLowerCase().includes(q)) &&
      (!f.city || l.city === f.city) &&
      (!f.kind || l.kind === f.kind),
  );
}
