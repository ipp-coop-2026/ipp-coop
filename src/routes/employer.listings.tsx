import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Lock, Pencil, Plus, Trash2, Users } from "lucide-react";
import { AppShell, Status } from "@/components/AppShell";
import { CompanySwitch } from "@/components/p02/CompanySwitch";
import { focus, fmtDate, Panel, primaryBtn, RoleGate } from "@/components/p02/ui";
import { closeListing, commit, deleteListing, latestReview, useLaunchpad } from "@/lib/p02/store";
import { COMPANIES } from "@/lib/p02/data";

export const Route = createFileRoute("/employer/listings")({
  head: () => ({ meta: [{ title: "My listings · IPP" }] }),
  component: MyListings,
});

const small = `inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40 ${focus}`;

function MyListings() {
  const lp = useLaunchpad();
  const mine = lp ? lp.listings.filter((l) => l.companyId === lp.companyId) : [];

  return (
    <AppShell wide>
      <RoleGate need="employer" view={lp?.view}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
              Employer
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">My listings</h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Edit, close or delete your opportunities. New listings need admin approval before
              students see them.
            </p>
          </div>
          <Link to="/employer/post" className={primaryBtn}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Post opportunity
          </Link>
        </div>
        <CompanySwitch />
        {lp && mine.some((l) => l.status === "Changes Requested" || l.status === "Rejected") && (
          <Panel className="mb-4 border-warn-foreground/25 bg-warn/60">
            <h2 className="text-base font-bold text-heading">Feedback from the university</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The co-op coordinator reviewed these listings against five checks. Fix what is asked
              and resubmit; students see a listing only after approval.
            </p>
            <ul className="mt-3 space-y-2">
              {mine
                .filter((l) => l.status === "Changes Requested" || l.status === "Rejected")
                .map((l) => {
                  const r = latestReview(lp, l.id);
                  return (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-heading">
                          {l.title}{" "}
                          <span className="font-normal text-muted-foreground">
                            · version {l.version ?? 1}
                          </span>
                        </p>
                        {r && (
                          <p className="mt-1">
                            <span className="font-medium">
                              {l.status === "Rejected" ? "Not published" : "Changes requested"}
                              :{" "}
                            </span>
                            {r.reason}
                          </p>
                        )}
                      </div>
                      {l.status === "Changes Requested" && (
                        <Link
                          to="/employer/edit/$id"
                          params={{ id: l.id }}
                          className={`shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground ${focus}`}
                        >
                          Fix and resubmit
                        </Link>
                      )}
                    </li>
                  );
                })}
            </ul>
          </Panel>
        )}
        <Panel className="overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th scope="col" className="px-6 py-3 font-semibold">
                  Listing
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Deadline
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Applicants
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
              {mine.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No listings yet. Post your first opportunity.
                  </td>
                </tr>
              )}
              {mine.map((l) => {
                const n = lp!.applications.filter((a) => a.listingId === l.id).length;
                return (
                  <tr key={l.id}>
                    <td className="px-6 py-3">
                      <Link
                        to="/employer/applicants/$id"
                        params={{ id: l.id }}
                        className={`font-semibold text-heading hover:underline ${focus}`}
                      >
                        {l.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {l.city} · {l.mode} · {l.duration}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                        {fmtDate(l.deadline)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/employer/applicants/$id"
                        params={{ id: l.id }}
                        className={`inline-flex items-center gap-1 font-semibold text-primary hover:underline ${focus}`}
                        aria-label={`${n} applicants for ${l.title}`}
                      >
                        <Users aria-hidden="true" className="h-3.5 w-3.5" /> {n}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Status>{l.status}</Status>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Link
                          to="/employer/edit/$id"
                          params={{ id: l.id }}
                          className={small}
                          aria-label={`Edit ${l.title}`}
                        >
                          <Pencil aria-hidden="true" className="h-3.5 w-3.5" /> Edit
                        </Link>
                        <button
                          type="button"
                          className={small}
                          disabled={l.status === "Closed"}
                          onClick={() =>
                            commit((s) =>
                              closeListing(
                                s,
                                l.id,
                                COMPANIES.find((c) => c.id === l.companyId)?.hr ?? "Employer",
                              ),
                            )
                          }
                          aria-label={`Close ${l.title}`}
                        >
                          <Lock aria-hidden="true" className="h-3.5 w-3.5" /> Close
                        </button>
                        <button
                          type="button"
                          className={`${small} border-danger-foreground/25 text-danger-foreground hover:bg-danger`}
                          aria-label={`Delete ${l.title}`}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete "${l.title}"? Its applications are removed too.`,
                              )
                            )
                              commit((s) => deleteListing(s, l.id));
                          }}
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </RoleGate>
    </AppShell>
  );
}
