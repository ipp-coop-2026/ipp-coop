import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { AppShell, Card, PageHeader, Status } from "@/components/AppShell";
import { DeskAdmin } from "@/components/DeskAdmin";
import { useIppData, PLACEMENT_STATUS } from "@/lib/ipp-store";
import { requestAiReview, type AiReview } from "@/lib/p03/ai";
import {
  addRule,
  approve,
  changesRequested,
  checklistHints,
  CHECKLIST,
  closedListings,
  closeListing,
  commitReview,
  decisionLog,
  decline,
  declinedListings,
  latestChangeRequest,
  listingLabel,
  publish,
  publishedListings,
  readyToPublish,
  removeRule,
  requestChanges,
  REVIEWER,
  reviewQueue,
  toggleCheck,
  useP03State,
  versionChanges,
  withdrawListing,
  type CheckKey,
  type Combined,
  type ReviewItem,
} from "@/lib/p03/review";

export const Route = createFileRoute("/p03/")({
  head: () => ({
    meta: [
      { title: "University Administrator view · IPP" },
      {
        name: "description",
        content: "University Administrator view of the Internship Practicum Platform demo.",
      },
      { property: "og:title", content: "University Administrator view · IPP" },
      {
        property: "og:description",
        content: "University Administrator view of the Internship Practicum Platform demo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const primaryBtn = `rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
const quietBtn = `rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
const inputCls = `w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ${focus}`;

function fmt(iso: string): string {
  if (!iso) return "time not recorded";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function AdminPage() {
  const ipp = useIppData();
  const p03 = useP03State();
  const [notice, setNotice] = useState<string | null>(null);

  const combined: Combined | null = useMemo(() => (ipp && p03 ? { ipp, p03 } : null), [ipp, p03]);

  if (!ipp || !combined) {
    return (
      <AppShell>
        <PageHeader title="University Administrator" subtitle="Loading the review queue." />
      </AppShell>
    );
  }

  const queue = reviewQueue(combined);
  const ready = readyToPublish(combined);
  const live = publishedListings(combined);
  const sentBack = [...changesRequested(combined), ...declinedListings(combined)];
  const closed = closedListings(combined);
  const log = decisionLog(combined);

  /** Runs one action, shows what happened, and returns an error message if the action was refused. */
  const run = (action: (c: Combined) => Combined, done?: string): string | null => {
    try {
      commitReview(ipp, action);
      if (done) setNotice(done);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "That action did not complete.";
    }
  };

  const counts: [string, number][] = [
    ["Waiting for review", queue.length],
    ["Sent back or declined", sentBack.length],
    ["Ready to publish", ready.length],
    ["Published", live.length],
    ["Closed or withdrawn", closed.length],
  ];

  return (
    <AppShell>
      <PageHeader
        title="University Administrator"
        subtitle="P03 review and publication. Sara Ahmed (Careers coordinator) checks each employer opportunity, then publishes it so students can see it. Administrator access is simulated."
      />
      <Link
        to="/p03/shared"
        className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3 text-sm hover:bg-muted"
      >
        <span>
          <span className="font-semibold">Shared review queue</span>
          <span className="text-muted-foreground">
            {" "}
            · every team's listings in Team 5's shared database, read live
          </span>
        </span>
        <span className="font-medium text-primary">Open</span>
      </Link>
      {notice && (
        <p role="status" className="mb-4 rounded-lg bg-status p-3 text-status-foreground">
          {notice}
        </p>
      )}
      <ul className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Review counts">
        {counts.map(([label, n]) => (
          <li key={label} className="rounded-xl border border-border bg-card p-3">
            <div className="text-2xl font-bold text-primary">{n}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </li>
        ))}
      </ul>

      <div className="space-y-4">
        <Card title="Review queue">
          <p className="mb-3 text-muted-foreground">
            Oldest submission first. Tick all five checks to unlock Approve. Request changes needs a
            reason the employer can read.
          </p>
          {queue.length === 0 ? (
            <Empty>
              No opportunities are waiting for review. New employer submissions appear here.
            </Empty>
          ) : (
            <ul className="space-y-4">
              {queue.map((item) => (
                <li key={item.opportunity.opportunity_id}>
                  <ReviewCard item={item} combined={combined} run={run} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Ready to publish">
          <p className="mb-3 text-muted-foreground">
            Approved, but students cannot see these yet. Publishing makes the approved version
            visible and open for applications.
          </p>
          {ready.length === 0 ? (
            <Empty>Nothing is waiting to be published.</Empty>
          ) : (
            <ul className="space-y-3">
              {ready.map((item) => (
                <ListingRow key={item.opportunity.opportunity_id} item={item} combined={combined}>
                  <PublishButton item={item} run={run} />
                </ListingRow>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Published listings">
          <p className="mb-3 text-muted-foreground">
            Students can see and apply to these. Close a listing when it is filled or has a problem.
            Placement status is always "{PLACEMENT_STATUS}".
          </p>
          {live.length === 0 ? (
            <Empty>No listings are published.</Empty>
          ) : (
            <ul className="space-y-3">
              {live.map((item) => (
                <ListingRow key={item.opportunity.opportunity_id} item={item} combined={combined}>
                  <TakeDown item={item} run={run} />
                </ListingRow>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Sent back to employers">
          <p className="mb-3 text-muted-foreground">
            The employer sees your reason in the Employer HR view. After a change request they can
            edit and resubmit; a declined listing stays closed.
          </p>
          {sentBack.length === 0 ? (
            <Empty>No opportunities are waiting on an employer.</Empty>
          ) : (
            <ul className="space-y-3">
              {sentBack.map((item) => {
                const req = latestChangeRequest(combined, item.opportunity.opportunity_id);
                return (
                  <ListingRow key={item.opportunity.opportunity_id} item={item} combined={combined}>
                    {req?.reason && (
                      <p className="text-sm">
                        <span className="font-medium">
                          {req.type === "Declined" ? "Declined" : "Your reason"} ({req.review_id}
                          ):{" "}
                        </span>
                        {req.reason}
                      </p>
                    )}
                  </ListingRow>
                );
              })}
            </ul>
          )}
        </Card>

        {closed.length > 0 && (
          <Card title="Closed and withdrawn">
            <ul className="space-y-3">
              {closed.map((item) => (
                <ListingRow key={item.opportunity.opportunity_id} item={item} combined={combined} />
              ))}
            </ul>
          </Card>
        )}

        <RulesCard combined={combined} run={run} />

        <Card title="Decision log">
          <p className="mb-3 text-muted-foreground">
            Every decision keeps who made it, the version, the time and the reason. Newest first.
          </p>
          {log.length === 0 ? (
            <Empty>
              No decisions yet. Approvals, change requests, publishing and closing appear here.
            </Empty>
          ) : (
            <ol className="divide-y divide-border">
              {log.map((e) => (
                <li key={e.event_id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {e.opportunity_id}
                      <span className="font-normal text-muted-foreground"> · v{e.version}</span>
                      {e.review_id && (
                        <span className="font-normal text-muted-foreground"> · {e.review_id}</span>
                      )}
                    </span>
                    <Status>{e.ai_assisted ? `${e.type} · AI draft used` : e.type}</Status>
                  </div>
                  {e.reason && <p className="mt-1">"{e.reason}"</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.actor} · {fmt(e.at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
      <DeskAdmin />
    </AppShell>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-4 text-muted-foreground">
      {children}
    </p>
  );
}

type Run = (action: (c: Combined) => Combined, done?: string) => string | null;

function ListingRow({
  item,
  children,
}: {
  item: ReviewItem;
  combined: Combined;
  children?: ReactNode;
}) {
  const o = item.opportunity;
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{o.title}</div>
          <div className="text-xs text-muted-foreground">
            {item.organization} · {o.opportunity_id} · version {item.record.version}
          </div>
        </div>
        <Status>{listingLabel(item.record)}</Status>
      </div>
      <p className="mt-2 text-sm">{o.description}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {o.location} · {o.work_mode} · {o.duration}
      </p>
      {children && <div className="mt-3 space-y-2">{children}</div>}
    </li>
  );
}

function PublishButton({ item, run }: { item: ReviewItem; run: Run }) {
  const [error, setError] = useState("");
  const id = item.opportunity.opportunity_id;
  return (
    <div>
      <button
        type="button"
        className={primaryBtn}
        onClick={() =>
          setError(
            run(
              (c) => publish(c, id),
              `Opportunity ${id} was published and is now visible to students.`,
            ) ?? "",
          )
        }
      >
        Publish {id}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Close or withdraw a published listing. Both need a reason and both hide it from students. */
function TakeDown({ item, run }: { item: ReviewItem; run: Run }) {
  const id = item.opportunity.opportunity_id;
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const fieldId = `takedown-${id}`;
  return (
    <div className="rounded-lg bg-muted p-3">
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium">
        Reason to close or withdraw
      </label>
      <input
        id={fieldId}
        className={inputCls}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
          setError("");
        }}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className={quietBtn}
          onClick={() =>
            setError(
              run(
                (c) => closeListing(c, id, reason),
                `Opportunity ${id} was closed. Students no longer see it.`,
              ) ?? "",
            )
          }
        >
          Close listing
        </button>
        <button
          type="button"
          className={quietBtn}
          onClick={() =>
            setError(
              run(
                (c) => withdrawListing(c, id, reason),
                `Opportunity ${id} was withdrawn at the employer's request.`,
              ) ?? "",
            )
          }
        >
          Record employer withdrawal
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ReviewCard({ item, combined, run }: { item: ReviewItem; combined: Combined; run: Run }) {
  const { opportunity: o, record } = item;
  const id = o.opportunity_id;
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [ai, setAi] = useState<AiReview | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const [aiDraftUsed, setAiDraftUsed] = useState(false);
  const hints = useMemo(() => checklistHints(o), [o]);
  const aiOpts = () => ({ reviewer: REVIEWER, ai_assisted: aiDraftUsed && !!reason.trim() });
  const askAi = async () => {
    setAiState("loading");
    setAiError("");
    try {
      setAi(
        await requestAiReview(
          o,
          item.organization,
          (combined.p03.rules ?? []).map((r) => r.text),
        ),
      );
      setAiState("idle");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "The AI reviewer could not answer.");
      setAiState("error");
    }
  };
  const changes =
    record.version > 1 ? versionChanges(record, record.version - 1, record.version) : [];
  const allTicked = CHECKLIST.every((c) => record.ticks.includes(c.key));
  const asks = CHECKLIST.map((c) => hints[c.key].ask).filter((a): a is string => !!a);
  const flags = Object.values(hints).filter((h) => h.ok === false).length;
  const history = combined.p03.events.filter((e) => e.opportunity_id === id);

  return (
    <article aria-labelledby={`title-${id}`} className="rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 id={`title-${id}`} className="font-semibold">
            {o.title}
          </h3>
          <div className="text-xs text-muted-foreground">
            {item.organization} · {id} · version {record.version}
            {record.version > 1 ? " (resubmitted)" : ""}
          </div>
        </div>
        <Status>{record.review_status}</Status>
      </div>
      <p className="mt-2">{o.description}</p>
      <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Location</dt>
        <dd>{o.location}</dd>
        <dt className="text-muted-foreground">Work mode</dt>
        <dd>{o.work_mode || "Not given"}</dd>
        <dt className="text-muted-foreground">Duration</dt>
        <dd>{o.duration || "Not given"}</dd>
      </dl>

      {changes.length > 0 && (
        <section aria-label={`What changed in version ${record.version}`} className="mt-3">
          <h4 className="mb-1 text-sm font-semibold">
            What changed since version {record.version - 1}
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

      <section
        aria-labelledby={`ai-${id}`}
        className="mt-4 rounded-lg border border-primary/25 bg-accent/40 p-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4
            id={`ai-${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <Sparkles aria-hidden="true" className="h-4 w-4" /> AI reviewer
          </h4>
          <button
            type="button"
            onClick={askAi}
            disabled={aiState === "loading"}
            className={`rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50 ${focus}`}
          >
            {aiState === "loading"
              ? "Reading the submission…"
              : ai
                ? "Ask again"
                : "Ask the AI reviewer"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Suggestions only. It reads the submission against the five checks and your review rules.
          You still tick every check and decide.
        </p>
        <div role="status" aria-live="polite">
          {aiState === "error" && <p className="mt-2 text-sm text-warn-foreground">{aiError}</p>}
          {ai && aiState !== "loading" && (
            <div className="mt-2 space-y-2 text-sm">
              {ai.summary && <p>{ai.summary}</p>}
              {ai.rule_flags.length > 0 && (
                <ul className="list-disc pl-5 text-warn-foreground">
                  {ai.rule_flags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
              {ai.draft_reason && (
                <div className="rounded-lg border border-border bg-card p-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Draft reason for the employer
                  </p>
                  <p className="mt-1">{ai.draft_reason}</p>
                  <button
                    type="button"
                    className={`mt-2 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted ${focus}`}
                    onClick={() => {
                      setReason(ai.draft_reason);
                      setAiDraftUsed(true);
                      setError("");
                      requestAnimationFrame(() => document.getElementById(`reason-${id}`)?.focus());
                    }}
                  >
                    Use this draft, then edit it
                  </button>
                </div>
              )}
              {ai.model && (
                <p className="text-xs text-muted-foreground">
                  Model: {ai.model}. The decision log marks decisions that used the draft.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <fieldset className="mt-4">
        <legend className="mb-1 text-sm font-semibold">
          Review checklist ({record.ticks.length} of {CHECKLIST.length})
        </legend>
        <p className="mb-2 text-xs text-muted-foreground">
          {flags
            ? `${flags} ${flags === 1 ? "check needs" : "checks need"} attention.`
            : "No automatic flags."}{" "}
          The notes are hints. You tick every check yourself.
        </p>
        <ul className="space-y-2">
          {CHECKLIST.map((c) => {
            const h = hints[c.key];
            const inputId = `check-${id}-${c.key}`;
            return (
              <li key={c.key} className="rounded-lg border border-border p-2">
                <label htmlFor={inputId} className="flex cursor-pointer items-start gap-2">
                  <input
                    id={inputId}
                    type="checkbox"
                    className={`mt-1 h-4 w-4 ${focus}`}
                    checked={record.ticks.includes(c.key)}
                    onChange={() => {
                      setError(run((cb) => toggleCheck(cb, id, c.key as CheckKey)) ?? "");
                    }}
                  />
                  <span>
                    <span className="block font-medium">{c.label}</span>
                    <span className="block text-xs text-muted-foreground">{c.help}</span>
                    <span
                      className={`block text-xs ${h.ok === false ? "text-warn-foreground" : h.ok ? "text-status-foreground" : "text-muted-foreground"}`}
                    >
                      {h.ok === false ? "Needs attention: " : h.ok ? "Looks fine: " : "Your call: "}
                      {h.note}
                    </span>
                    {ai?.checks[c.key as CheckKey] && (
                      <span className="block text-xs text-primary">
                        AI ({ai.checks[c.key as CheckKey].status}):{" "}
                        {ai.checks[c.key as CheckKey].note}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="mt-4">
        <label htmlFor={`reason-${id}`} className="mb-1 block text-sm font-semibold">
          Reason for the employer
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          Needed to request changes or decline. The employer reads it word for word.
        </p>
        {asks.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {asks.map((a) => (
              <button
                key={a}
                type="button"
                className={`rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-muted ${focus}`}
                onClick={() => {
                  setReason((r) => (r.includes(a) ? r : `${r} ${a}`.trim()));
                  setError("");
                }}
              >
                Add: {a}
              </button>
            ))}
          </div>
        )}
        <textarea
          id={`reason-${id}`}
          rows={3}
          className={inputCls}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError("");
          }}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={primaryBtn}
          disabled={!allTicked}
          aria-describedby={allTicked ? undefined : `approve-hint-${id}`}
          onClick={() =>
            setError(
              run(
                (c) => approve(c, id, aiOpts()),
                `Opportunity ${id} version ${record.version} was approved. Publish it when students should see it.`,
              ) ?? "",
            )
          }
        >
          Approve
        </button>
        <button
          type="button"
          className={quietBtn}
          onClick={() => {
            const msg = run(
              (c) => requestChanges(c, id, reason, aiOpts()),
              `Changes were requested for ${id}. The employer can see your reason.`,
            );
            setError(msg ?? "");
            if (!msg) setReason("");
          }}
        >
          Request changes
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-muted ${focus}`}
          onClick={() => {
            if (!reason.trim()) {
              setError("Enter a reason the employer can act on.");
              return;
            }
            if (
              !window.confirm(
                `Decline ${id}? The employer will see your reason and cannot resubmit.`,
              )
            )
              return;
            setError(
              run(
                (c) => decline(c, id, reason, aiOpts()),
                `${id} was declined. The employer can see your reason.`,
              ) ?? "",
            );
          }}
        >
          Decline
        </button>
        {!allTicked && (
          <span id={`approve-hint-${id}`} className="text-xs text-muted-foreground">
            Approve unlocks when all five checks are ticked.
          </span>
        )}
      </div>

      {(record.history.length > 1 || history.length > 0) && (
        <details className="mt-4">
          <summary className={`cursor-pointer text-sm font-semibold ${focus}`}>
            Version history
          </summary>
          <ul className="mt-2 space-y-1 text-sm">
            {[...record.history].reverse().map((h) => (
              <li key={h.version} className="rounded-lg border border-border p-2">
                <span className="font-medium">Version {h.version}</span>
                <span className="text-muted-foreground"> · sent {fmt(h.submitted_at)}</span>
                <div className="text-muted-foreground">
                  {h.title} · {h.location} · {h.work_mode} · {h.duration}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

/** The feedback loop: rules the coordinator adds are read by the AI reviewer on the next review. */
function RulesCard({ combined, run }: { combined: Combined; run: Run }) {
  const rules = combined.p03.rules ?? [];
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  return (
    <Card title="Review rules for the AI">
      <p className="mb-3 text-muted-foreground">
        The AI reviewer reads these on top of the five checks. When it misses something, add a rule;
        no model change is needed.
      </p>
      {rules.length === 0 ? (
        <Empty>No extra rules yet. The AI uses the five checks only.</Empty>
      ) : (
        <ul className="mb-3 space-y-2">
          {rules.map((r) => (
            <li
              key={r.rule_id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border p-2 text-sm"
            >
              <span className="min-w-0 break-words">{r.text}</span>
              <button
                type="button"
                className={`shrink-0 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted ${focus}`}
                aria-label={`Remove rule ${r.rule_id}`}
                onClick={() => run((c) => removeRule(c, r.rule_id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const msg = run(
            (c) => addRule(c, text),
            "Rule added. The AI reviewer reads it next time.",
          );
          setError(msg ?? "");
          if (!msg) setText("");
        }}
      >
        <label htmlFor="new-rule" className="text-sm font-semibold">
          New rule
        </label>
        <input
          id="new-rule"
          className={inputCls}
          value={text}
          placeholder="For example: Overseas placements must state who covers travel."
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
        />
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <button type="submit" className={`w-fit ${quietBtn}`}>
          Add rule
        </button>
      </form>
    </Card>
  );
}
