import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, ClipboardCheck, History, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader, Status } from "@/components/AppShell";
import {
  AiBadge,
  companyName,
  focus,
  fmtDate,
  inputCls,
  Panel,
  RoleGate,
} from "@/components/p02/ui";
import type { AppStatus, Listing } from "@/lib/p02/data";
import {
  addRule,
  commit,
  latestReview,
  logAi,
  removeRule,
  reviewListing,
  setAppStatus,
  studentById,
  useLaunchpad,
} from "@/lib/p02/store";
import { requestAiReview, type AiReview } from "@/lib/p03/ai";
import { CHECKLIST, type CheckKey } from "@/lib/p03/review";
import type { Opportunity } from "@/lib/ipp-store";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin review · IPP" }] }),
  component: AdminReview,
});

const FILTERS = ["All", "Submitted", "Shortlisted", "Approved", "Not placed"] as const;
type Filter = (typeof FILTERS)[number];
const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

type Hint = { ok: boolean | null; note: string; ask?: string };

/** Team 3's five listing checks on a Launchpad listing. Hints only; the coordinator ticks every check. */
function p03Hints(l: Listing): Record<CheckKey, Hint> {
  const sentences = (l.description.match(/[^.!?]+[.!?]/g) ?? []).length;
  return {
    completeness:
      l.title && l.city && l.mode && l.duration && l.description.trim().length >= 30
        ? { ok: true, note: "Title, location, work mode, duration and description are filled in." }
        : {
            ok: false,
            note: "Some details are missing or very short.",
            ask: "Please complete the listing details.",
          },
    supervision: /supervis|mentor|manager|team lead|\blead\b/i.test(l.description)
      ? { ok: true, note: "The description says who supervises the intern." }
      : {
          ok: false,
          note: "No workplace supervisor is named.",
          ask: "Please name the workplace supervisor and their role.",
        },
    timing:
      l.duration && l.deadline
        ? { ok: true, note: `${l.duration}, apply by ${fmtDate(l.deadline)}.` }
        : {
            ok: false,
            note: "Duration or deadline is missing.",
            ask: "Please give the duration and the application deadline.",
          },
    tasks:
      sentences >= 2 || l.requirements.length >= 2
        ? { ok: true, note: "The description lists concrete work." }
        : {
            ok: false,
            note: "The tasks are not clear yet.",
            ask: "Please list the main tasks the intern will do.",
          },
    learning: l.required.length
      ? {
          ok: null,
          note: `Skills: ${l.required.join(", ")}. Decide whether it fits the student's studies.`,
        }
      : { ok: false, note: "No required skills listed.", ask: "Please add the required skills." },
  };
}

const FIELDS: [keyof NonNullable<Listing["history"]>[number], string][] = [
  ["title", "Title"],
  ["city", "Location"],
  ["mode", "Work mode"],
  ["duration", "Duration"],
  ["deadline", "Deadline"],
  ["required", "Required skills"],
  ["description", "Description"],
];

function changesSince(l: Listing) {
  const h = l.history ?? [];
  if (h.length < 2) return [];
  const prev = h[h.length - 2]!;
  const cur = h[h.length - 1]!;
  const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")) || "(empty)";
  return FIELDS.filter(([k]) => show(prev[k]) !== show(cur[k])).map(([k, label]) => ({
    label,
    before: show(prev[k]),
    after: show(cur[k]),
    from: prev.version,
  }));
}

function ReviewCard({ l, rules }: { l: Listing; rules: string[] }) {
  const [open, setOpen] = useState(false);
  const [ticks, setTicks] = useState<CheckKey[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [ai, setAi] = useState<AiReview | null>(null);
  const [aiState, setAiState] = useState<"idle" | "loading" | "error">("idle");
  const [aiError, setAiError] = useState("");
  const [usedDraft, setUsedDraft] = useState(false);
  const hints = useMemo(() => p03Hints(l), [l]);
  const changes = changesSince(l);
  const asks = CHECKLIST.map((c) => hints[c.key].ask).filter((a): a is string => !!a);

  const decide = (decision: "Approved" | "Changes Requested" | "Declined") => {
    try {
      commit((s) =>
        reviewListing(s, l.id, decision, {
          reason,
          checks: ticks,
          aiAssisted: usedDraft && !!reason.trim(),
        }),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That decision was not saved.");
      setOpen(true);
    }
  };
  const askAi = async () => {
    setAiState("loading");
    try {
      const opp = {
        title: l.title,
        description: l.description,
        location: l.city,
        work_mode: l.mode,
        duration: l.duration,
      } as unknown as Opportunity;
      const r = await requestAiReview(opp, companyName(l.companyId), rules);
      setAi(r);
      commit((s) =>
        logAi(s, {
          kind: "Employer AI",
          title: `AI reviewer read "${l.title}"`,
          detail: r.summary || "Notes on the five checks.",
          model: true,
        }),
      );
      setAiState("idle");
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "The AI reviewer could not answer.");
      setAiState("error");
    }
  };

  return (
    <li className="rounded-xl border border-border p-4">
      {/* Group 2's row: listing and one-click Approve listing / Reject, unchanged */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-heading">{l.title}</p>
          <p className="text-sm text-muted-foreground">
            {companyName(l.companyId)} · {l.city} · {l.mode}
            {(l.version ?? 1) > 1 ? ` · version ${l.version} (resubmitted)` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decide("Approved")}
            className={`inline-flex items-center gap-1 rounded-md border border-status-foreground/25 bg-status px-3 py-1.5 text-xs font-semibold text-status-foreground ${focus}`}
          >
            <Check aria-hidden="true" className="h-3.5 w-3.5" /> Approve listing
          </button>
          <button
            type="button"
            onClick={() => decide("Declined")}
            className={`inline-flex items-center gap-1 rounded-md border border-danger-foreground/25 bg-danger px-3 py-1.5 text-xs font-semibold text-danger-foreground ${focus}`}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" /> Reject
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Team 3 (P03): optional review tools, collapsed by default */}
      <div className="mt-3 rounded-xl border border-border">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium ${focus}`}
        >
          <span className="inline-flex items-center gap-1.5">
            <ClipboardCheck aria-hidden="true" className="h-4 w-4 text-primary" /> Review checklist
            (Team 3) · {ticks.length} of {CHECKLIST.length}
            {changes.length > 0 && (
              <span className="rounded-full bg-sent px-2 py-0.5 text-[11px] text-sent-foreground">
                changed since v{changes[0]!.from}
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="space-y-3 border-t border-border px-3 py-3">
            <p className="text-sm text-muted-foreground">{l.description}</p>
            <p className="text-xs text-muted-foreground">
              {l.type} · {l.duration} · minimum year {l.minYear} · apply by {fmtDate(l.deadline)} ·
              required: {l.required.join(", ")}
            </p>
            {changes.length > 0 && (
              <section aria-label="What changed">
                <p className="mb-1 text-sm font-semibold">
                  What changed since version {changes[0]!.from}
                </p>
                <ul className="space-y-1">
                  {changes.map((c) => (
                    <li key={c.label} className="rounded-lg border border-border p-2 text-xs">
                      <span className="font-medium">{c.label}</span>
                      <div className="text-muted-foreground">
                        Before: <del>{c.before}</del>
                      </div>
                      <div>Now: {c.after}</div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-lg border border-[oklch(0.9_0.04_300)] bg-[oklch(0.985_0.008_300)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-heading">
                  <Sparkles aria-hidden="true" className="h-4 w-4 text-[oklch(0.48_0.15_300)]" /> AI
                  reviewer
                </p>
                <button
                  type="button"
                  disabled={aiState === "loading"}
                  onClick={() => void askAi()}
                  className={`rounded-md bg-heading px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50 ${focus}`}
                >
                  {aiState === "loading"
                    ? "Reading the listing…"
                    : ai
                      ? "Ask again"
                      : "Ask the AI reviewer"}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Suggestions only. It reads the listing against the five checks and your review
                rules.
              </p>
              <div aria-live="polite">
                {aiState === "error" && (
                  <p className="mt-2 text-xs text-warn-foreground">{aiError}</p>
                )}
                {ai && aiState !== "loading" && (
                  <div className="mt-2 space-y-2 text-sm">
                    {ai.summary && (
                      <p>
                        <AiBadge /> {ai.summary}
                      </p>
                    )}
                    {ai.rule_flags.length > 0 && (
                      <ul className="list-disc pl-5 text-xs text-warn-foreground">
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
                          className={`mt-2 rounded-md border border-border px-2 py-0.5 text-xs font-medium hover:bg-muted ${focus}`}
                          onClick={() => {
                            setReason(ai.draft_reason);
                            setUsedDraft(true);
                          }}
                        >
                          Use this draft, then edit it
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                Five checks ({ticks.length} of 5)
              </legend>
              <ul className="space-y-1.5">
                {CHECKLIST.map((c) => {
                  const h = hints[c.key];
                  const id = `chk-${l.id}-${c.key}`;
                  return (
                    <li key={c.key} className="rounded-lg border border-border p-2">
                      <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm">
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
                          <span className="font-medium">{c.label}</span>
                          <span
                            className={`block text-xs ${h.ok === false ? "text-warn-foreground" : h.ok ? "text-status-foreground" : "text-muted-foreground"}`}
                          >
                            {h.ok === false
                              ? "Needs attention: "
                              : h.ok
                                ? "Looks fine: "
                                : "Your call: "}
                            {h.note}
                          </span>
                          {ai?.checks[c.key] && (
                            <span className="block text-xs text-[oklch(0.48_0.15_300)]">
                              AI ({ai.checks[c.key].status}): {ai.checks[c.key].note}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <div>
              <label htmlFor={`reason-${l.id}`} className="mb-1 block text-sm font-semibold">
                Ask the employer for changes
              </label>
              {asks.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  {asks.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={`rounded-full border border-border px-2.5 py-0.5 text-xs hover:bg-muted ${focus}`}
                      onClick={() => setReason((r) => (r.includes(a) ? r : `${r} ${a}`.trim()))}
                    >
                      Add: {a}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                id={`reason-${l.id}`}
                rows={2}
                className={inputCls}
                placeholder="The employer reads this word for word."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <button
                type="button"
                onClick={() => decide("Changes Requested")}
                className={`mt-2 inline-flex items-center gap-1 rounded-md border border-warn-foreground/25 bg-warn px-3 py-1.5 text-xs font-semibold text-warn-foreground ${focus}`}
              >
                Request changes
              </button>
              <p className="mt-1 text-xs text-muted-foreground">
                The employer sees the reason in My Listings and resubmits a new version. Ticked
                checks are recorded in the decision log.
              </p>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function RulesPanel() {
  const lp = useLaunchpad();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  return (
    <Panel>
      <h2 className="inline-flex items-center gap-1.5 text-base font-bold">
        <Sparkles aria-hidden="true" className="h-4 w-4 text-[oklch(0.48_0.15_300)]" /> Review rules
        for the AI (Team 3)
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The AI reviewer reads these on top of the five checks. When it misses something, add a rule;
        no model change is needed.
      </p>
      {(lp?.rules ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No extra rules yet.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {lp!.rules.map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border p-2 text-sm"
            >
              <span>{r.text}</span>
              <button
                type="button"
                className={`text-xs text-muted-foreground hover:text-foreground ${focus}`}
                onClick={() => commit((s) => removeRule(s, r.id))}
                aria-label={`Remove rule ${r.id}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            commit((s) => addRule(s, text));
            setText("");
            setError("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "The rule was not saved.");
          }
        }}
      >
        <label htmlFor="new-rule" className="sr-only">
          New rule
        </label>
        <input
          id="new-rule"
          className={inputCls}
          placeholder="For example: Remote placements must say which hours the intern works."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted ${focus}`}
        >
          Add rule
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </Panel>
  );
}

function AdminReview() {
  const lp = useLaunchpad();
  const [filter, setFilter] = useState<Filter>("All");
  const pending = lp ? lp.listings.filter((l) => l.status === "Pending Review") : [];
  const waiting = lp ? lp.listings.filter((l) => l.status === "Changes Requested") : [];
  const log = lp ? [...lp.reviews].reverse() : [];
  const apps = lp ? lp.applications : [];
  const count = (st: AppStatus) => apps.filter((a) => a.status === st).length;
  const tiles: [string, number, string][] = [
    ["Submitted", count("Submitted"), "bg-sent text-sent-foreground"],
    ["Shortlisted", count("Shortlisted"), "bg-[oklch(0.955_0.03_300)] text-[oklch(0.48_0.15_300)]"],
    ["Approved", count("Approved"), "bg-status text-status-foreground"],
    ["Not placed", count("Not placed"), "bg-muted text-muted-foreground"],
  ];
  const shown = apps.filter((a) => filter === "All" || a.status === filter);

  return (
    <AppShell wide>
      <RoleGate need="admin" view={lp?.view}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            step="Step 4 of 4 · Review team"
            title="Admin review"
            subtitle="Approve new listings, then approve placements after the employer's review. AI never approves anyone."
          />
          <Link
            to="/admin/ai-logs"
            className={`mt-6 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted ${focus}`}
          >
            <Sparkles aria-hidden="true" className="h-4 w-4 text-[oklch(0.48_0.15_300)]" /> AI
            review log
          </Link>
        </div>

        <Panel className="mb-6">
          <h2 className="text-base font-bold">Listings pending review</h2>
          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No listings are waiting for review.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {pending.map((l) => (
                <ReviewCard
                  key={`${l.id}-${l.version ?? 1}`}
                  l={l}
                  rules={(lp?.rules ?? []).map((r) => r.text)}
                />
              ))}
            </ul>
          )}
        </Panel>

        {waiting.length > 0 && (
          <Panel className="mb-6">
            <h2 className="text-base font-bold">Waiting for the employer</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Changes were requested. The employer sees your reason in My Listings and resubmits a
              new version.
            </p>
            <ul className="mt-3 space-y-2">
              {waiting.map((l) => {
                const r = lp && latestReview(lp, l.id);
                return (
                  <li key={l.id} className="rounded-lg border border-border p-3 text-sm">
                    <p className="font-semibold text-heading">
                      {l.title}{" "}
                      <span className="font-normal text-muted-foreground">
                        · {companyName(l.companyId)} · version {l.version ?? 1}
                      </span>
                    </p>
                    {r && (
                      <p className="mt-1">
                        <span className="font-medium">Your reason ({r.id}): </span>
                        {r.reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}

        <h2 className="mb-3 text-xl font-bold">Application review</h2>
        <ul
          className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Application counts"
        >
          {tiles.map(([label, n, tone]) => (
            <li
              key={label}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-3xl font-extrabold text-heading">{lp ? n : "–"}</p>
              </div>
              <span
                aria-hidden="true"
                className={`grid h-9 w-9 place-items-center rounded-full text-sm font-bold ${tone}`}
              >
                {label[0]}
              </span>
            </li>
          ))}
        </ul>
        <div role="group" aria-label="Filter applications" className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-1 text-sm font-medium ${focus} ${filter === f ? "border-heading bg-heading text-white" : "border-border bg-card hover:bg-muted"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <Panel className="mb-8 overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-6 py-3 font-semibold">
                  Student
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Opportunity
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Applied
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shown.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No applications in this view.
                  </td>
                </tr>
              )}
              {lp &&
                shown.map((a) => {
                  const s = studentById(lp, a.studentId);
                  const l = lp.listings.find((x) => x.id === a.listingId);
                  return (
                    <tr key={a.id}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
                          >
                            {initials(s?.name ?? "?")}
                          </span>
                          <div>
                            <p className="text-[15px] font-semibold text-heading">
                              {s?.name ?? "Unknown student"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s?.email || (s?.major ? `${s.major} · Year ${s.year}` : "—")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{l?.title ?? "Removed listing"}</p>
                        <p className="text-xs text-muted-foreground">
                          {l ? companyName(l.companyId) : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(a.appliedAt)}</td>
                      <td className="px-4 py-3">
                        <Status>{a.status}</Status>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={a.status === "Approved"}
                            onClick={() => commit((st) => setAppStatus(st, a.id, "Approved"))}
                            className={`inline-flex items-center gap-1 rounded-md border border-status-foreground/25 bg-status px-2.5 py-1 text-xs font-semibold text-status-foreground disabled:opacity-40 ${focus}`}
                          >
                            <Check aria-hidden="true" className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            disabled={a.status === "Not placed"}
                            onClick={() => commit((st) => setAppStatus(st, a.id, "Not placed"))}
                            className={`inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground disabled:opacity-40 ${focus}`}
                          >
                            <X aria-hidden="true" className="h-3.5 w-3.5" /> Not placed
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <h2 className="inline-flex items-center gap-1.5 text-base font-bold">
              <History aria-hidden="true" className="h-4 w-4 text-primary" /> Decision log (Team 3)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Every listing decision with who made it, the version, the time and the reason. Newest
              first.
            </p>
            {log.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No listing decisions yet.</p>
            ) : (
              <ol className="mt-3 divide-y divide-border">
                {log.slice(0, 12).map((r) => {
                  const l = lp?.listings.find((x) => x.id === r.listingId);
                  return (
                    <li key={r.id} className="py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {l?.title ?? "Listing"}{" "}
                          <span className="font-normal text-muted-foreground">
                            · v{r.version} · {r.id}
                          </span>
                        </span>
                        <Status>
                          {r.aiAssisted ? `${r.decision} · AI draft used` : r.decision}
                        </Status>
                      </div>
                      <p className="mt-0.5">"{r.reason}"</p>
                      <p className="text-xs text-muted-foreground">
                        {r.by} · {when(r.at)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
          <RulesPanel />
        </div>
      </RoleGate>
    </AppShell>
  );
}
