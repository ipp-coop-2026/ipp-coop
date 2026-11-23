import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, Status } from "@/components/AppShell";
import { CompanySwitch } from "@/components/p02/CompanySwitch";
import { focus, fmtDate, inputCls, Panel, RoleGate } from "@/components/p02/ui";
import type { AppStatus } from "@/lib/p02/data";
import { matchOne } from "@/lib/p02/match";
import { commit, setAppStatus, studentById, useLaunchpad } from "@/lib/p02/store";

// All applicants across the employer's listings (asked for by Team 2 on 23 Nov).
export const Route = createFileRoute("/employer/applicants/")({
  head: () => ({ meta: [{ title: "Applicants · IPP" }] }),
  component: AllApplicants,
});

const STATUSES: ("All" | AppStatus)[] = [
  "All",
  "Submitted",
  "Shortlisted",
  "Approved",
  "Not placed",
  "Rejected",
];

function AllApplicants() {
  const lp = useLaunchpad();
  const [listing, setListing] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("All");
  const [sort, setSort] = useState<"match" | "recent">("match");
  const [skill, setSkill] = useState("");
  const mine = useMemo(
    () => (lp ? lp.listings.filter((l) => l.companyId === lp.companyId) : []),
    [lp],
  );
  const rows = useMemo(() => {
    if (!lp) return [];
    return lp.applications
      .map((a) => {
        const l = mine.find((x) => x.id === a.listingId);
        const s = studentById(lp, a.studentId);
        return l && s ? { a, l, s, score: matchOne(s, l).score } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [lp, mine]);
  const shown = rows
    .filter(
      (r) =>
        (!listing || r.l.id === listing) &&
        (status === "All" || r.a.status === status) &&
        (!skill || r.s.skills.includes(skill)),
    )
    .sort((x, y) =>
      sort === "match" ? y.score - x.score : y.a.appliedAt.localeCompare(x.a.appliedAt),
    );

  return (
    <AppShell wide>
      <RoleGate need="employer" view={lp?.view}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Employer</p>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Applicants</h1>
        <p className="mb-6 mt-2 text-muted-foreground">
          Everyone who applied to your listings. Open a listing for AI analysis, interview questions
          and message drafts.
        </p>
        <CompanySwitch />
        <Panel className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <label>
              <span className="sr-only">Filter by listing</span>
              <select
                className={inputCls}
                value={listing}
                onChange={(e) => setListing(e.target.value)}
              >
                <option value="">All listings</option>
                {mine.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select
                className={inputCls}
                value={status}
                onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "All" ? "All statuses" : s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by skill</span>
              <select className={inputCls} value={skill} onChange={(e) => setSkill(e.target.value)}>
                <option value="">All skills</option>
                {[...new Set(rows.flatMap((r) => r.s.skills))].sort().map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Sort</span>
              <select
                className={inputCls}
                value={sort}
                onChange={(e) => setSort(e.target.value as "match" | "recent")}
              >
                <option value="match">Sort: match (high to low)</option>
                <option value="recent">Sort: most recent</option>
              </select>
            </label>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {shown.length} {shown.length === 1 ? "applicant" : "applicants"}
          </p>
        </Panel>
        <Panel className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-6 py-3 font-semibold">
                  Applicant
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Listing
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Applied
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Match
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
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    No applicants in this view.
                  </td>
                </tr>
              )}
              {shown.map(({ a, l, s, score }) => (
                <tr key={a.id}>
                  <td className="px-6 py-3">
                    <p className="font-semibold text-heading">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.major ? `${s.major} · Year ${s.year}` : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/employer/applicants/$id"
                      params={{ id: l.id }}
                      className={`font-medium text-primary hover:underline ${focus}`}
                    >
                      {l.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(a.appliedAt)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[oklch(0.955_0.03_300)] px-2.5 py-0.5 text-xs font-bold text-[oklch(0.48_0.15_300)]">
                      {score}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Status>{a.status}</Status>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={a.status === "Shortlisted"}
                        onClick={() => commit((st) => setAppStatus(st, a.id, "Shortlisted"))}
                        className={`inline-flex items-center gap-1 rounded-md border border-status-foreground/25 bg-status px-2.5 py-1 text-xs font-semibold text-status-foreground disabled:opacity-40 ${focus}`}
                        aria-label={`Shortlist ${s.name}`}
                      >
                        <Check aria-hidden="true" className="h-3.5 w-3.5" /> Shortlist
                      </button>
                      <button
                        type="button"
                        disabled={a.status === "Rejected"}
                        onClick={() => commit((st) => setAppStatus(st, a.id, "Rejected"))}
                        className={`inline-flex items-center gap-1 rounded-md border border-danger-foreground/25 bg-danger px-2.5 py-1 text-xs font-semibold text-danger-foreground disabled:opacity-40 ${focus}`}
                        aria-label={`Reject ${s.name}`}
                      >
                        <X aria-hidden="true" className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <p className="mt-3 text-xs text-muted-foreground">
          Match scores are suggestions. Only a person can shortlist or reject an applicant.
        </p>
      </RoleGate>
    </AppShell>
  );
}
