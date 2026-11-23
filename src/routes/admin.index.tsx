import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronDown, ClipboardCheck, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader, Status } from "@/components/AppShell";
import { AiBadge, companyName, focus, fmtDate, Panel, RoleGate } from "@/components/p02/ui";
import type { Listing, AppStatus } from "@/lib/p02/data";
import {
  commit,
  logAi,
  setAppStatus,
  setListingStatus,
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

/** Team 3's five listing checks applied to a Launchpad listing. Hints only; the coordinator decides. */
function p03Hints(l: Listing): Record<CheckKey, { ok: boolean | null; note: string }> {
  const sentences = (l.description.match(/[^.!?]+[.!?]/g) ?? []).length;
  return {
    completeness:
      l.title && l.city && l.mode && l.duration && l.description
        ? { ok: true, note: "Title, location, work mode, duration and description are filled in." }
        : { ok: false, note: "Some details are missing." },
    supervision: /supervis|mentor|manager|team lead|lead\b/i.test(l.description)
      ? { ok: true, note: "The description names who supervises the intern." }
      : { ok: null, note: "No supervisor is named. Ask the employer, or judge it yourself." },
    timing:
      l.duration && l.deadline
        ? { ok: true, note: `${l.duration}, apply by ${fmtDate(l.deadline)}.` }
        : { ok: false, note: "Duration or deadline is missing." },
    tasks:
      sentences >= 2 || l.requirements.length >= 2
        ? { ok: true, note: "The description lists concrete work." }
        : { ok: false, note: "The tasks are not clear yet." },
    learning: l.required.length
      ? {
          ok: null,
          note: `Skills: ${l.required.join(", ")}. Decide whether it fits the student's studies.`,
        }
      : { ok: false, note: "No required skills listed." },
  };
}

function P03Checks({ l }: { l: Listing }) {
  const [open, setOpen] = useState(false);
  const [ticks, setTicks] = useState<CheckKey[]>([]);
  const [ai, setAi] = useState<AiReview | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const hints = p03Hints(l);
  const askAi = async () => {
    setState("loading");
    try {
      const opp = {
        title: l.title,
        description: l.description,
        location: l.city,
        work_mode: l.mode,
        duration: l.duration,
      } as unknown as Opportunity;
      const r = await requestAiReview(opp, companyName(l.companyId), []);
      setAi(r);
      commit((s) =>
        logAi(s, {
          kind: "Employer AI",
          title: `AI reviewer read "${l.title}"`,
          detail: r.summary || "Notes on the five checks.",
          model: true,
        }),
      );
      setState("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The AI reviewer could not answer.");
      setState("error");
    }
  };
  return (
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
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-3">
          <ul className="space-y-2">
            {CHECKLIST.map((c) => {
              const h = hints[c.key];
              const id = `chk-${l.id}-${c.key}`;
              return (
                <li key={c.key}>
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={state === "loading"}
              onClick={() => void askAi()}
              className={`inline-flex items-center gap-1 rounded-md border border-[oklch(0.85_0.06_300)] bg-[oklch(0.975_0.015_300)] px-2.5 py-1 text-xs font-semibold text-[oklch(0.48_0.15_300)] disabled:opacity-50 ${focus}`}
            >
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />{" "}
              {state === "loading" ? "Reading the listing…" : "Ask the AI reviewer"}
            </button>
            <span className="text-xs text-muted-foreground">
              Suggestions only. You tick every check and decide.
            </span>
          </div>
          {state === "error" && <p className="mt-2 text-xs text-warn-foreground">{error}</p>}
          {ai?.summary && (
            <p className="mt-2 text-sm">
              <AiBadge /> {ai.summary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function AdminReview() {
  const lp = useLaunchpad();
  const [filter, setFilter] = useState<Filter>("All");
  const pending = lp ? lp.listings.filter((l) => l.status === "Pending Review") : [];
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

        <Panel className="mb-8">
          <h2 className="text-base font-bold">Listings pending review</h2>
          {pending.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No listings are waiting for review.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {pending.map((l) => (
                <li key={l.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-heading">{l.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {companyName(l.companyId)} · {l.city} · {l.mode}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => commit((s) => setListingStatus(s, l.id, "Approved"))}
                        className={`inline-flex items-center gap-1 rounded-md border border-status-foreground/25 bg-status px-3 py-1.5 text-xs font-semibold text-status-foreground ${focus}`}
                      >
                        <Check aria-hidden="true" className="h-3.5 w-3.5" /> Approve listing
                      </button>
                      <button
                        type="button"
                        onClick={() => commit((s) => setListingStatus(s, l.id, "Rejected"))}
                        className={`inline-flex items-center gap-1 rounded-md border border-danger-foreground/25 bg-danger px-3 py-1.5 text-xs font-semibold text-danger-foreground ${focus}`}
                      >
                        <X aria-hidden="true" className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                  <P03Checks l={l} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

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
        <Panel className="overflow-x-auto p-0">
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
        <p className="mt-3 text-xs text-muted-foreground">
          Approving an application confirms the placement for the demo. A named person makes every
          placement decision.
        </p>
      </RoleGate>
    </AppShell>
  );
}
