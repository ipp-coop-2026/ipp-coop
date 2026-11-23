import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Inbox } from "lucide-react";
import { AppShell, PageHeader, Status } from "@/components/AppShell";
import {
  companyName,
  EmptyState,
  focus,
  fmtDate,
  Panel,
  primaryBtn,
  RoleGate,
} from "@/components/p02/ui";
import { ME, useLaunchpad } from "@/lib/p02/store";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "My applications · IPP" }] }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const lp = useLaunchpad();
  const apps = lp ? lp.applications.filter((a) => a.studentId === ME) : [];

  return (
    <AppShell>
      <RoleGate need="student" view={lp?.view}>
        <PageHeader
          step="Step 3 of 4"
          title="My applications"
          subtitle="Every placement you have applied to, with the latest decision from the review team."
        />
        {!lp ? null : apps.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No applications yet"
            action={
              <Link to="/opportunities" className={primaryBtn}>
                Browse opportunities <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            }
          >
            When you apply to a placement it will show here with its status.
          </EmptyState>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-border">
              {apps.map((a) => {
                const l = lp.listings.find((x) => x.id === a.listingId);
                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                  >
                    <div className="min-w-0">
                      <Link
                        to="/opportunities/$id"
                        params={{ id: a.listingId }}
                        className={`font-semibold text-heading hover:underline ${focus}`}
                      >
                        {l?.title ?? "Placement"}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {l ? companyName(l.companyId) : ""} · applied {fmtDate(a.appliedAt)}
                      </p>
                    </div>
                    <Status>{a.status}</Status>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </RoleGate>
    </AppShell>
  );
}
