// P03 writes to the shared database. Server only: used by src/routes/api/p03.review.ts.
//
// Environment (set on the host, never in git):
//   P03_TEAM_KEY     P03's write key from Team 5. Without it, writes are off and the page is read-only.
//   P03_WRITE_SCOPE  "sandbox" (default): only OP-999 can be changed.
//                    "all": any listing except the protected demo thread OP-026..OP-031.
//
// P03 owns listing_reviews (append-only) and listings (approved_version, listing_status,
// published_at, closed_on). The database itself refuses writes to other teams' tables.
import { dbConfig } from "@/lib/db";
import { CHECKLIST } from "./review";
import { PROTECTED_IDS, SANDBOX_ID, type Decision, type WriteAction } from "./shared-review";

export const REVIEWER = "Sara Ahmed, Careers coordinator (P03, synthetic)";

const env = (k: string): string | undefined => {
  try {
    return typeof process !== "undefined" ? process.env?.[k]?.trim() || undefined : undefined;
  } catch {
    return undefined;
  }
};

export function writeStatus() {
  const key = env("P03_TEAM_KEY");
  const scope = !key ? "off" : env("P03_WRITE_SCOPE") === "all" ? "all" : "sandbox";
  return { enabled: Boolean(key), scope } as const;
}

export class WriteRefused extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Checks a request body. Pure, so it is unit tested. Throws WriteRefused with a message the page shows. */
export function validate(body: unknown, scope: "off" | "sandbox" | "all"): WriteAction {
  if (scope === "off")
    throw new WriteRefused("Shared-database writes are switched off on this site.", 503);
  const b = (body ?? {}) as {
    opportunity_id?: unknown;
    version?: unknown;
    action?: unknown;
    decision?: unknown;
    reason?: unknown;
    checks?: unknown;
  };
  const id = String(b.opportunity_id ?? "");
  if (!/^OP-\d{3,4}$/.test(id)) throw new WriteRefused("Unknown opportunity ID.");
  if (PROTECTED_IDS.includes(id))
    throw new WriteRefused(
      `${id} is part of the protected demo thread. Use the sandbox listing ${SANDBOX_ID}.`,
      403,
    );
  if (scope === "sandbox" && id !== SANDBOX_ID)
    throw new WriteRefused(`This site only writes to the sandbox listing ${SANDBOX_ID}.`, 403);
  const version = Number(b.version);
  switch (b.action) {
    case "decide": {
      const decision = b.decision as Decision;
      if (!["clarification_requested", "approved", "declined"].includes(decision))
        throw new WriteRefused("Unknown decision.");
      if (!Number.isInteger(version) || version < 1) throw new WriteRefused("Missing version.");
      const reason = String(b.reason ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1000);
      const checks = Array.isArray(b.checks) ? b.checks.map(String) : [];
      if (decision === "approved") {
        const open = CHECKLIST.filter((c) => !checks.includes(c.key));
        if (open.length)
          throw new WriteRefused(
            `Tick every check before approving. Still open: ${open.map((c) => c.label).join(", ")}.`,
          );
      } else if (reason.length < 5)
        throw new WriteRefused("Enter a reason the employer can act on.");
      return {
        action: "decide",
        opportunity_id: id,
        version,
        decision,
        reason,
        checks: checks as never,
      };
    }
    case "publish":
      if (!Number.isInteger(version) || version < 1) throw new WriteRefused("Missing version.");
      return { action: "publish", opportunity_id: id, version };
    case "close":
    case "withdraw":
      return { action: b.action, opportunity_id: id };
    default:
      throw new WriteRefused("Unknown action.");
  }
}

/** Next review ID in the shared format. Sandbox IDs (REV-9xxx) are ignored. Pure. */
export function nextReviewId(ids: string[]): string {
  const max = ids.reduce((m, id) => {
    const n = Number(/^REV-(\d{4})$/.exec(id)?.[1] ?? 0);
    return n < 9000 ? Math.max(m, n) : m;
  }, 0);
  return `REV-${String(max + 1).padStart(4, "0")}`;
}

type Fetch = typeof fetch;

async function call(path: string, init: RequestInit, f: Fetch): Promise<unknown> {
  const { url, key } = dbConfig();
  const r = await f(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      "x-team-key": env("P03_TEAM_KEY") ?? "",
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await r.text();
  const body = text ? (JSON.parse(text) as unknown) : null;
  if (!r.ok) {
    const msg =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `HTTP ${r.status}`;
    throw new WriteRefused(`Shared database: ${msg}`, r.status === 401 ? 403 : 502);
  }
  return body;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Applies one validated action. Re-reads the current state first so a stale page cannot overwrite it. */
export async function apply(
  a: WriteAction,
  f: Fetch = fetch,
): Promise<{ message: string; review_id?: string }> {
  const id = a.opportunity_id;
  const versions = (await call(
    `opportunity_versions?select=version,submission_status&opportunity_id=eq.${id}&order=version.desc&limit=1`,
    { method: "GET" },
    f,
  )) as { version: number; submission_status: string }[];
  const latest = versions[0];
  if (!latest) throw new WriteRefused(`${id} was not found.`, 404);
  const listing = (
    (await call(
      `listings?select=approved_version,listing_status&opportunity_id=eq.${id}`,
      { method: "GET" },
      f,
    )) as {
      approved_version: number;
      listing_status: string;
    }[]
  )[0];

  if (a.action === "decide") {
    if (a.version !== latest.version)
      throw new WriteRefused(`${id} now has version ${latest.version}. Reload the page.`, 409);
    if (!["submitted", "resubmitted"].includes(latest.submission_status))
      throw new WriteRefused(
        `${id} version ${a.version} is ${latest.submission_status}, not waiting for review.`,
        409,
      );
    const existing = (await call(
      `listing_reviews?select=review_id&opportunity_id=eq.${id}&version=eq.${a.version}`,
      { method: "GET" },
      f,
    )) as { review_id: string }[];
    if (existing.length)
      throw new WriteRefused(
        `${id} version ${a.version} already has a decision (${existing[0]!.review_id}).`,
        409,
      );
    const ids = (
      (await call("listing_reviews?select=review_id", { method: "GET" }, f)) as {
        review_id: string;
      }[]
    ).map((r) => r.review_id);
    const reason =
      a.decision === "approved"
        ? `All five checks passed.${a.reason ? ` ${a.reason}` : ""}`
        : a.reason;
    let review_id = nextReviewId(ids);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await call(
          "listing_reviews",
          {
            method: "POST",
            headers: { Prefer: "return=minimal" },
            body: JSON.stringify({
              review_id,
              opportunity_id: id,
              version: a.version,
              decision: a.decision,
              reviewer: REVIEWER,
              reason,
              decided_at: new Date().toISOString(),
            }),
          },
          f,
        );
        break;
      } catch (e) {
        if (attempt === 0 && e instanceof WriteRefused && /duplicate|unique/i.test(e.message)) {
          review_id = nextReviewId([...ids, review_id]);
          continue;
        }
        throw e;
      }
    }
    const words = {
      approved: "approved",
      clarification_requested: "sent back for changes",
      declined: "declined",
    }[a.decision];
    return { review_id, message: `${id} version ${a.version} ${words} (${review_id}).` };
  }

  if (a.action === "publish") {
    const approved = (await call(
      `listing_reviews?select=review_id&opportunity_id=eq.${id}&version=eq.${a.version}&decision=eq.approved`,
      { method: "GET" },
      f,
    )) as unknown[];
    if (!approved.length)
      throw new WriteRefused(`${id} version ${a.version} is not approved yet.`, 409);
    const row = {
      approved_version: a.version,
      listing_status: "open",
      published_at: today(),
      closed_on: null,
    };
    if (listing)
      await call(
        `listings?opportunity_id=eq.${id}`,
        { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) },
        f,
      );
    else
      await call(
        "listings",
        {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ opportunity_id: id, ...row }),
        },
        f,
      );
    return {
      message: `${id} version ${a.version} is published. Students see it in open listings.`,
    };
  }

  if (!listing || listing.listing_status !== "open")
    throw new WriteRefused(`${id} is not an open listing.`, 409);
  const status = a.action === "close" ? "closed" : "withdrawn";
  await call(
    `listings?opportunity_id=eq.${id}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ listing_status: status, closed_on: today() }),
    },
    f,
  );
  return { message: `${id} is ${status}. Students no longer see it.` };
}
