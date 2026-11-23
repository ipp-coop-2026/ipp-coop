import { createFileRoute } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader, Status } from "@/components/AppShell";
import { focus, Panel } from "@/components/p02/ui";
import { commitStudent, counts, decide, useStudent, type AppStatus } from "@/lib/p02/student-store";

// Team 2's Admin review: approve or reject student applications. Decisions show on the student's page at once.
export const Route = createFileRoute("/admin_/applications")({
  head: () => ({ meta: [{ title: "Admin review · IPP" }] }),
  component: AdminApplications,
});

const FILTERS = ["All", "Submitted", "Approved", "Rejected"] as const;
type Filter = (typeof FILTERS)[number];
const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter((w) => w && w[0] === w[0]?.toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

function matches(status: AppStatus, f: Filter) {
  if (f === "All") return true;
  if (f === "Submitted") return status === "Submitted";
  if (f === "Rejected") return status === "Rejected";
  return status === f;
}

function AdminApplications() {
  const student = useStudent();
  const [filter, setFilter] = useState<Filter>("All");
  const apps = student?.applications ?? [];
  const c = counts(apps);
  const shown = apps.filter((a) => matches(a.status, filter));
  const tiles: [string, number, string][] = [
    ["Submitted", c.submitted, "bg-sent text-sent-foreground"],
    ["Approved", c.approved, "bg-status text-status-foreground"],
    ["Rejected", c.rejected, "bg-danger text-danger-foreground"],
  ];

  return (
    <AppShell wide>
      <PageHeader
        step="Step 4 of 4 · Review team"
        title="Admin review"
        subtitle="Approve or reject student applications. Decisions appear on the student's page immediately."
      />
      <ul className="mb-6 grid gap-4 sm:grid-cols-3" aria-label="Application counts">
        {tiles.map(([label, n, tone]) => (
          <li
            key={label}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-3xl font-extrabold text-heading">{student ? n : "–"}</p>
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
        <table className="w-full min-w-[720px] text-sm">
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
            {shown.map((a) => (
              <tr key={a.id}>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
                    >
                      {initials(a.student)}
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-heading">{a.student}</p>
                      <p className="text-xs text-muted-foreground">{a.email || "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.employer}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fmt(a.appliedAt)}</td>
                <td className="px-4 py-3">
                  <Status>{a.status}</Status>
                </td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={a.status === "Approved"}
                      onClick={() => commitStudent((s) => decide(s, a.id, "Approved"))}
                      className={`inline-flex items-center gap-1 rounded-md border border-status-foreground/25 bg-status px-2.5 py-1 text-xs font-semibold text-status-foreground hover:brightness-95 disabled:opacity-40 ${focus}`}
                      aria-label={`Approve ${a.student}'s application to ${a.title}`}
                    >
                      <Check aria-hidden="true" className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={a.status === "Rejected"}
                      onClick={() => commitStudent((s) => decide(s, a.id, "Rejected"))}
                      className={`inline-flex items-center gap-1 rounded-md border border-danger-foreground/25 bg-danger px-2.5 py-1 text-xs font-semibold text-danger-foreground hover:brightness-95 disabled:opacity-40 ${focus}`}
                      aria-label={`Reject ${a.student}'s application to ${a.title}`}
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
        Saved in this browser for the demo. Approving an application does not place the student: a
        named person confirms every placement.
      </p>
    </AppShell>
  );
}
