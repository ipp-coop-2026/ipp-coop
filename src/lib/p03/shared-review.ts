/**
 * P03 review queue on the shared database (Team 5's Supabase). Read side: runs in the browser with
 * the publishable key through "@/lib/db". Writes never happen here; they go through
 * POST /api/p03/review (src/routes/api/p03.review.ts), which holds P03's key on the server.
 *
 * Tables (docs/SUPABASE_GUIDE.md section 4, owned by P02 and P03):
 *   opportunity_versions  P02, append-only: one row per submitted version
 *   listing_reviews       P03, append-only: decision per (opportunity_id, version)
 *   listings              P03: approved_version, listing_status, published_at, closed_on
 *   employers             P02: names
 */
import { selectAll, type DbOptions } from "@/lib/db";
import { CHECKLIST, type CheckKey, type CheckHint } from "./review";

export type Decision = "clarification_requested" | "approved" | "declined";
export type ListingStatus = "open" | "closed" | "withdrawn";

export interface VersionRow {
  opportunity_id: string;
  version: number;
  employer_id: string;
  title: string;
  sector: string | null;
  role_family: string | null;
  city: string | null;
  work_arrangement: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  tasks: string[] | null;
  supervisor_name: string | null;
  submission_status: string;
  submitted_at: string | null;
}
export interface ReviewRow {
  review_id: string;
  opportunity_id: string;
  version: number;
  decision: Decision;
  reviewer: string;
  reason: string | null;
  decided_at: string;
}
export interface ListingRow {
  opportunity_id: string;
  approved_version: number;
  listing_status: ListingStatus;
  published_at: string | null;
  closed_on: string | null;
}
export interface EmployerRow {
  employer_id: string;
  name: string;
}
export interface SharedSnapshot {
  versions: VersionRow[];
  reviews: ReviewRow[];
  listings: ListingRow[];
  employers: EmployerRow[];
  loadedAt: string;
}

export type Stage =
  | "pending" // latest version submitted or resubmitted, no decision yet
  | "waiting_employer" // clarification requested on the latest version
  | "declined"
  | "ready_to_publish" // latest version approved, students do not see it yet
  | "open"
  | "closed"
  | "withdrawn" // listing withdrawn, or the employer withdrew the submission
  | "draft";

export interface SharedItem {
  id: string;
  employer: string;
  latest: VersionRow;
  /** The previous version, when the latest is a resubmission. */
  previous?: VersionRow;
  review?: ReviewRow;
  listing?: ListingRow;
  stage: Stage;
}

/** Demo thread with P05's planted data problems: the shared guide asks every team not to change it. */
export const PROTECTED_IDS = ["OP-026", "OP-027", "OP-028", "OP-029", "OP-030", "OP-031"];
export const SANDBOX_ID = "OP-999";

export async function loadShared(opts?: DbOptions): Promise<SharedSnapshot> {
  const [versions, reviews, listings, employers] = await Promise.all([
    selectAll<VersionRow>(
      "opportunity_versions",
      {
        select:
          "opportunity_id,version,employer_id,title,sector,role_family,city,work_arrangement,start_date,end_date,description,tasks,supervisor_name,submission_status,submitted_at",
        order: "opportunity_id,version",
      },
      opts,
    ),
    selectAll<ReviewRow>(
      "listing_reviews",
      {
        select: "review_id,opportunity_id,version,decision,reviewer,reason,decided_at",
        order: "decided_at.desc",
      },
      opts,
    ),
    selectAll<ListingRow>(
      "listings",
      { select: "opportunity_id,approved_version,listing_status,published_at,closed_on" },
      opts,
    ),
    selectAll<EmployerRow>("employers", { select: "employer_id,name" }, opts),
  ]);
  return { versions, reviews, listings, employers, loadedAt: new Date().toISOString() };
}

/** One item per opportunity, at its latest version, with the stage P03 cares about. Pure. */
export function deriveItems(
  s: Pick<SharedSnapshot, "versions" | "reviews" | "listings" | "employers">,
): SharedItem[] {
  const byOpp = new Map<string, VersionRow[]>();
  for (const v of s.versions) {
    const list = byOpp.get(v.opportunity_id) ?? [];
    list.push(v);
    byOpp.set(v.opportunity_id, list);
  }
  const reviewFor = new Map<string, ReviewRow>();
  // Newest decision wins when one version has several (reviews arrive newest first, keep the first seen).
  for (const r of [...s.reviews].sort((a, b) => (a.decided_at < b.decided_at ? 1 : -1))) {
    const k = `${r.opportunity_id}@${r.version}`;
    if (!reviewFor.has(k)) reviewFor.set(k, r);
  }
  const listing = new Map(s.listings.map((l) => [l.opportunity_id, l]));
  const employer = new Map(s.employers.map((e) => [e.employer_id, e.name]));

  const items: SharedItem[] = [];
  for (const [id, list] of byOpp) {
    list.sort((a, b) => a.version - b.version);
    const latest = list[list.length - 1]!;
    const previous = list.length > 1 ? list[list.length - 2] : undefined;
    const review = reviewFor.get(`${id}@${latest.version}`);
    const l = listing.get(id);
    items.push({
      id,
      employer: employer.get(latest.employer_id) ?? latest.employer_id,
      latest,
      ...(previous ? { previous } : {}),
      ...(review ? { review } : {}),
      ...(l ? { listing: l } : {}),
      stage: stageOf(latest, review, l),
    });
  }
  return items.sort((a, b) => idNumber(a.id) - idNumber(b.id));
}

function stageOf(v: VersionRow, r: ReviewRow | undefined, l: ListingRow | undefined): Stage {
  if (v.submission_status === "withdrawn") return "withdrawn";
  if (v.submission_status === "draft") return "draft";
  if (!r) return "pending";
  if (r.decision === "clarification_requested") return "waiting_employer";
  if (r.decision === "declined") return "declined";
  if (!l || l.approved_version !== v.version)
    return l && l.listing_status !== "open" ? l.listing_status : "ready_to_publish";
  return l.listing_status;
}

function idNumber(id: string): number {
  return Number(/(\d+)$/.exec(id)?.[1] ?? 0);
}

export function byStage(items: SharedItem[], stage: Stage): SharedItem[] {
  const list = items.filter((i) => i.stage === stage);
  // The review queue is oldest submission first, so the longest wait is reviewed first.
  if (stage === "pending")
    list.sort((a, b) => (a.latest.submitted_at ?? "").localeCompare(b.latest.submitted_at ?? ""));
  return list;
}

export function stageCounts(items: SharedItem[]): Record<Stage, number> {
  const c: Record<Stage, number> = {
    pending: 0,
    waiting_employer: 0,
    declined: 0,
    ready_to_publish: 0,
    open: 0,
    closed: 0,
    withdrawn: 0,
    draft: 0,
  };
  for (const i of items) c[i.stage]++;
  return c;
}

/** The five P03 checks applied to a shared-database version. Hints only; the coordinator ticks every check. */
export function sharedHints(v: VersionRow): Record<CheckKey, CheckHint> {
  const missing = [
    !v.title?.trim() && "title",
    !v.description?.trim() && "description",
    !v.city?.trim() && "city",
    !v.work_arrangement && "work arrangement",
  ].filter(Boolean) as string[];
  const tasks = (v.tasks ?? []).filter((t) => t.trim());
  const supervisor = v.supervisor_name?.trim() ?? "";
  const vague = /^(tbc|tbd|to be (confirmed|decided)|n\/?a|unknown)$/i.test(supervisor);
  return {
    completeness: missing.length
      ? {
          ok: false,
          note: `Missing: ${missing.join(", ")}.`,
          ask: `Please add the ${missing.join(", ")}.`,
        }
      : { ok: true, note: "Title, description, city and work arrangement are filled in." },
    supervision:
      supervisor && !vague
        ? { ok: true, note: `Supervisor: ${supervisor}.` }
        : {
            ok: false,
            note: supervisor ? `Supervisor is "${supervisor}".` : "No supervisor is named.",
            ask: "Please name the workplace supervisor and their role.",
          },
    timing:
      v.start_date && v.end_date
        ? v.end_date > v.start_date
          ? { ok: true, note: `${v.start_date} to ${v.end_date}.` }
          : {
              ok: false,
              note: "The end date is not after the start date.",
              ask: "Please check the start and end dates.",
            }
        : {
            ok: false,
            note: `Missing ${!v.start_date ? "start" : ""}${!v.start_date && !v.end_date ? " and " : ""}${!v.end_date ? "end" : ""} date.`,
            ask: "Please give the start and end dates.",
          },
    tasks: tasks.length
      ? { ok: true, note: `${tasks.length} task${tasks.length === 1 ? "" : "s"} listed.` }
      : {
          ok: false,
          note: "No tasks are listed.",
          ask: "Please list the main tasks the intern will do.",
        },
    learning: {
      ok: null,
      note: `${v.role_family ?? "No role family"}${v.sector ? `, ${v.sector}` : ""}. Decide whether it fits an AI, CS or engineering student.`,
    },
  };
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}
const FIELDS: [keyof VersionRow, string][] = [
  ["title", "Title"],
  ["description", "Description"],
  ["city", "City"],
  ["work_arrangement", "Work arrangement"],
  ["start_date", "Start date"],
  ["end_date", "End date"],
  ["supervisor_name", "Supervisor"],
  ["tasks", "Tasks"],
];
export function sharedChanges(prev: VersionRow, cur: VersionRow): FieldChange[] {
  const show = (x: unknown) => (Array.isArray(x) ? x.join("; ") : String(x ?? "")) || "(empty)";
  return FIELDS.filter(([k]) => show(prev[k]) !== show(cur[k])).map(([k, label]) => ({
    field: label,
    before: show(prev[k]),
    after: show(cur[k]),
  }));
}

export { CHECKLIST };

// ---------- Write requests (validated again on the server) ----------

export type WriteAction =
  | {
      action: "decide";
      opportunity_id: string;
      version: number;
      decision: Decision;
      reason: string;
      checks: CheckKey[];
    }
  | { action: "publish"; opportunity_id: string; version: number }
  | { action: "close" | "withdraw"; opportunity_id: string };

export interface WriteStatus {
  enabled: boolean;
  scope: "off" | "sandbox" | "all";
}

export async function getWriteStatus(): Promise<WriteStatus> {
  try {
    const r = await fetch("/api/p03/review");
    if (!(r.headers.get("content-type") ?? "").includes("json"))
      return { enabled: false, scope: "off" };
    return (await r.json()) as WriteStatus;
  } catch {
    return { enabled: false, scope: "off" };
  }
}

export async function sendWrite(a: WriteAction): Promise<{ review_id?: string; message: string }> {
  const r = await fetch("/api/p03/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(a),
  });
  const body = (await r.json().catch(() => ({}))) as {
    error?: string;
    review_id?: string;
    message?: string;
  };
  if (!r.ok) throw new Error(body.error ?? `The shared database refused the change (${r.status}).`);
  return {
    ...(body.review_id ? { review_id: body.review_id } : {}),
    message: body.message ?? "Saved.",
  };
}
