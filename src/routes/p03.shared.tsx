import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppShell, Card, PageHeader, Status } from "@/components/AppShell";
import {
  byStage,
  CHECKLIST,
  deriveItems,
  getWriteStatus,
  loadShared,
  openListings,
  SANDBOX_ID,
  sendWrite,
  sharedChanges,
  sharedHints,
  stageCounts,
  type Decision,
  type SharedItem,
  type SharedSnapshot,
  type WriteAction,
  type WriteStatus,
} from "@/lib/p03/shared-review";
import type { CheckKey } from "@/lib/p03/review";

export const Route = createFileRoute("/p03/shared")({
  head: () => ({ meta: [{ title: "Shared review queue · IPP" }] }),
  component: SharedReviewPage,
});

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const primaryBtn = `rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
const quietBtn = `rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
const inputCls = `w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ${focus}`;
const PAGE = 12;

function SharedReviewPage() {
  const [snap, setSnap] = useState<SharedSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [write, setWrite] = useState<WriteStatus>({ enabled: false, scope: "off" });
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSnap(await loadShared());
    } catch (e) {
      setError(e instanceof Error ? e.message : "The shared database could not be read.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    void getWriteStatus().then(setWrite);
  }, [load]);

  const items = useMemo(() => (snap ? deriveItems(snap) : []), [snap]);
  const counts = stageCounts(items);
  const canWrite = (id: string) =>
    write.scope === "all" || (write.scope === "sandbox" && id === SANDBOX_ID);

  const act = async (a: WriteAction): Promise<string | null> => {
    try {
      const r = await sendWrite(a);
      setNotice(r.message);
      await load();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : "The change failed.";
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Shared review queue"
        subtitle="P03 on Team 5's shared database: every team's employers, listings and decisions. Sara reviews submitted versions here; published listings appear in other teams' views."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
        <Database aria-hidden="true" className="h-4 w-4 text-primary" />
        <span>
          {write.scope === "off"
            ? "Read-only on this site: decisions are shown but not saved."
            : write.scope === "sandbox"
              ? `Saving is on for the sandbox listing ${SANDBOX_ID} only.`
              : "Saving is on: decisions are written to the shared database."}
        </span>
        <span className="text-muted-foreground">
          {snap ? `Read ${new Date(snap.loadedAt).toLocaleTimeString("en-GB")}` : ""}
        </span>
        <button
          type="button"
          className={`ml-auto inline-flex items-center gap-1.5 ${quietBtn}`}
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{" "}
          {loading ? "Reading…" : "Refresh"}
        </button>
        <Link
          to="/p03"
          className={`text-sm font-medium text-primary underline-offset-4 hover:underline ${focus}`}
        >
          Demo queue
        </Link>
      </div>

      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-status p-3 text-status-foreground">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-border p-3 text-destructive">
          {error} Check the connection and press Refresh.
        </p>
      )}

      <ul
        className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5"
        aria-label="Shared database counts"
      >
        {(
          [
            ["Waiting for review", counts.pending],
            ["Waiting for the employer", counts.waiting_employer],
            ["Ready to publish", counts.ready_to_publish],
            ["Open listings", openListings(items).length],
            ["Closed, withdrawn or declined", counts.closed + counts.withdrawn + counts.declined],
          ] as [string, number][]
        ).map(([label, n]) => (
          <li key={label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-2xl font-bold text-primary">{snap ? n : "–"}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </li>
        ))}
      </ul>

      {!snap && loading ? (
        <Card title="Review queue">
          <p className="text-muted-foreground">Reading the shared database…</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card title="Review queue">
            <p className="mb-3 text-muted-foreground">
              Latest submitted versions with no decision yet, oldest first. Tick all five checks to
              approve; asking for changes or declining needs a reason the employer can read.
            </p>
            <List items={byStage(items, "pending")} empty="Nothing is waiting for review.">
              {(i) => <ReviewCard item={i} canWrite={canWrite(i.id)} act={act} />}
            </List>
          </Card>

          <Card title="Ready to publish">
            <p className="mb-3 text-muted-foreground">Approved versions students cannot see yet.</p>
            <List
              items={byStage(items, "ready_to_publish")}
              empty="Nothing is waiting to be published."
            >
              {(i) => (
                <Row item={i}>
                  <WriteButton
                    label="Publish"
                    disabled={!canWrite(i.id)}
                    run={() =>
                      act({ action: "publish", opportunity_id: i.id, version: i.latest.version })
                    }
                  />
                </Row>
              )}
            </List>
          </Card>

          <Card title="Waiting for the employer">
            <List
              items={byStage(items, "waiting_employer")}
              empty="No listings are waiting on an employer."
            >
              {(i) => (
                <Row item={i}>
                  {i.review?.reason && (
                    <p className="text-sm">
                      <span className="font-medium">Reason ({i.review.review_id}): </span>
                      {i.review.reason}
                    </p>
                  )}
                </Row>
              )}
            </List>
          </Card>

          <Card title="Open listings">
            <p className="mb-3 text-muted-foreground">
              What students see. Close a listing when it is filled.
            </p>
            <SearchList items={openListings(items)}>
              {(i) => (
                <Row item={i}>
                  <span className="text-xs text-muted-foreground">
                    Version {i.listing?.approved_version} · published{" "}
                    {i.listing?.published_at ?? "date not recorded"}
                  </span>
                  <div className="flex gap-2">
                    <WriteButton
                      label="Close"
                      quiet
                      disabled={!canWrite(i.id)}
                      run={() => act({ action: "close", opportunity_id: i.id })}
                    />
                    <WriteButton
                      label="Withdraw"
                      quiet
                      disabled={!canWrite(i.id)}
                      run={() => act({ action: "withdraw", opportunity_id: i.id })}
                    />
                  </div>
                </Row>
              )}
            </SearchList>
          </Card>

          <Card title="Decision log">
            <p className="mb-3 text-muted-foreground">
              The 15 newest P03 decisions in the shared database.
            </p>
            <ol className="divide-y divide-border">
              {(snap?.reviews ?? []).slice(0, 15).map((r) => (
                <li key={r.review_id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {r.opportunity_id}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · v{r.version} · {r.review_id}
                      </span>
                    </span>
                    <Status>{DECISION_WORDS[r.decision]}</Status>
                  </div>
                  {r.reason && <p className="mt-1">"{r.reason}"</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.reviewer} ·{" "}
                    {new Date(r.decided_at).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

const DECISION_WORDS: Record<Decision, string> = {
  approved: "Approved",
  clarification_requested: "Changes requested",
  declined: "Declined",
};

function List({
  items,
  empty,
  children,
}: {
  items: SharedItem[];
  empty: string;
  children: (i: SharedItem) => ReactNode;
}) {
  const [shown, setShown] = useState(PAGE);
  if (!items.length)
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-muted-foreground">
        {empty}
      </p>
    );
  return (
    <>
      <ul className="space-y-3">
        {items.slice(0, shown).map((i) => (
          <li key={i.id}>{children(i)}</li>
        ))}
      </ul>
      {items.length > shown && (
        <button
          type="button"
          className={`mt-3 ${quietBtn}`}
          onClick={() => setShown((n) => n + PAGE)}
        >
          Show more ({items.length - shown} left)
        </button>
      )}
    </>
  );
}

function SearchList({
  items,
  children,
}: {
  items: SharedItem[];
  children: (i: SharedItem) => ReactNode;
}) {
  const [q, setQ] = useState("");
  const t = q.trim().toLowerCase();
  const hits = t
    ? items.filter((i) =>
        `${i.id} ${i.latest.title} ${i.employer} ${i.latest.city ?? ""}`.toLowerCase().includes(t),
      )
    : items;
  return (
    <>
      <label htmlFor="open-search" className="sr-only">
        Search open listings
      </label>
      <input
        id="open-search"
        className={`mb-3 ${inputCls}`}
        placeholder="Search by ID, title, employer or city"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <List items={hits} empty="No open listing matches.">
        {children}
      </List>
    </>
  );
}

function Row({ item, children }: { item: SharedItem; children?: ReactNode }) {
  const v = item.latest;
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{v.title}</div>
          <div className="text-xs text-muted-foreground">
            {item.employer} · {item.id} · version {v.version} · {v.city ?? "city not given"}
          </div>
        </div>
      </div>
      {children && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">{children}</div>
      )}
    </div>
  );
}

function WriteButton({
  label,
  run,
  disabled,
  quiet,
}: {
  label: string;
  run: () => Promise<string | null>;
  disabled: boolean;
  quiet?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        className={quiet ? quietBtn : primaryBtn}
        disabled={disabled || busy}
        title={disabled ? "Saving is not enabled for this listing on this site" : undefined}
        onClick={async () => {
          setBusy(true);
          setErr((await run()) ?? "");
          setBusy(false);
        }}
      >
        {busy ? "Saving…" : label}
      </button>
      {err && (
        <span role="alert" className="mt-1 text-xs text-destructive">
          {err}
        </span>
      )}
    </span>
  );
}

function ReviewCard({
  item,
  canWrite,
  act,
}: {
  item: SharedItem;
  canWrite: boolean;
  act: (a: WriteAction) => Promise<string | null>;
}) {
  const v = item.latest;
  const hints = useMemo(() => sharedHints(v), [v]);
  const changes = item.previous ? sharedChanges(item.previous, v) : [];
  const [ticks, setTicks] = useState<CheckKey[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const allTicked = CHECKLIST.every((c) => ticks.includes(c.key));
  const asks = CHECKLIST.map((c) => hints[c.key].ask).filter((a): a is string => !!a);

  const decide = async (decision: Decision) => {
    if (
      decision === "declined" &&
      !window.confirm(`Decline ${item.id}? The employer sees your reason.`)
    )
      return;
    setBusy(true);
    const msg = await act({
      action: "decide",
      opportunity_id: item.id,
      version: v.version,
      decision,
      reason,
      checks: ticks,
    });
    setBusy(false);
    setError(msg ?? "");
  };

  return (
    <article aria-labelledby={`s-${item.id}`} className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 id={`s-${item.id}`} className="font-semibold">
            {v.title}
          </h3>
          <div className="text-xs text-muted-foreground">
            {item.employer} · {item.id} · version {v.version}
            {v.submission_status === "resubmitted" ? " (resubmitted)" : ""} · sent{" "}
            {v.submitted_at
              ? new Date(v.submitted_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })
              : "date not recorded"}
          </div>
        </div>
        <Status>Waiting for review</Status>
      </div>
      {v.description && <p className="mt-2">{v.description}</p>}
      <dl className="mt-2 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">City</dt>
        <dd>{v.city ?? "Not given"}</dd>
        <dt className="text-muted-foreground">Arrangement</dt>
        <dd>{v.work_arrangement ?? "Not given"}</dd>
        <dt className="text-muted-foreground">Dates</dt>
        <dd>
          {v.start_date ?? "?"} to {v.end_date ?? "?"}
        </dd>
        <dt className="text-muted-foreground">Supervisor</dt>
        <dd>{v.supervisor_name ?? "Not named"}</dd>
        <dt className="text-muted-foreground">Tasks</dt>
        <dd>{v.tasks?.length ? v.tasks.join("; ") : "None listed"}</dd>
      </dl>

      {changes.length > 0 && (
        <section aria-label="What changed" className="mt-3">
          <h4 className="mb-1 text-sm font-semibold">
            What changed since version {item.previous?.version}
          </h4>
          <ul className="space-y-1">
            {changes.map((c) => (
              <li key={c.field} className="rounded-lg border border-border p-2 text-sm">
                <span className="font-medium">{c.field}</span>
                <div className="text-muted-foreground">
                  Before: <del>{c.before}</del>
                </div>
                <div>Now: {c.after}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold">
          Review checklist ({ticks.length} of {CHECKLIST.length})
        </legend>
        <ul className="space-y-2">
          {CHECKLIST.map((c) => {
            const h = hints[c.key];
            const id = `sc-${item.id}-${c.key}`;
            return (
              <li key={c.key} className="rounded-lg border border-border p-2">
                <label htmlFor={id} className="flex cursor-pointer items-start gap-2">
                  <input
                    id={id}
                    type="checkbox"
                    className={`mt-1 h-4 w-4 ${focus}`}
                    checked={ticks.includes(c.key)}
                    onChange={() =>
                      setTicks((t) =>
                        t.includes(c.key) ? t.filter((k) => k !== c.key) : [...t, c.key],
                      )
                    }
                  />
                  <span>
                    <span className="block font-medium">{c.label}</span>
                    <span
                      className={`block text-xs ${h.ok === false ? "text-warn-foreground" : h.ok ? "text-status-foreground" : "text-muted-foreground"}`}
                    >
                      {h.ok === false ? "Needs attention: " : h.ok ? "Looks fine: " : "Your call: "}
                      {h.note}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-4">
        <label htmlFor={`sr-${item.id}`} className="mb-1 block text-sm font-semibold">
          Reason for the employer
        </label>
        {asks.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {asks.map((a) => (
              <button
                key={a}
                type="button"
                className={`rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-muted ${focus}`}
                onClick={() => setReason((r) => (r.includes(a) ? r : `${r} ${a}`.trim()))}
              >
                Add: {a}
              </button>
            ))}
          </div>
        )}
        <textarea
          id={`sr-${item.id}`}
          rows={2}
          className={inputCls}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={primaryBtn}
          disabled={!canWrite || !allTicked || busy}
          onClick={() => void decide("approved")}
        >
          Approve
        </button>
        <button
          type="button"
          className={quietBtn}
          disabled={!canWrite || busy}
          onClick={() => void decide("clarification_requested")}
        >
          Request changes
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-muted disabled:opacity-50 ${focus}`}
          disabled={!canWrite || busy}
          onClick={() => void decide("declined")}
        >
          Decline
        </button>
        <span className="text-xs text-muted-foreground">
          {!canWrite
            ? "Saving is not enabled for this listing on this site."
            : !allTicked
              ? "Approve unlocks when all five checks are ticked."
              : ""}
        </span>
      </div>
    </article>
  );
}
