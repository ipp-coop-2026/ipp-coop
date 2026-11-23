import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Inbox } from "lucide-react";
import { AppShell, PageHeader, Status } from "@/components/AppShell";
import { EmptyState, focus, Panel, primaryBtn } from "@/components/p02/ui";
import { myApplications, useStudent } from "@/lib/p02/student-store";

export const Route = createFileRoute("/applications")({
  head: () => ({ meta: [{ title: "My applications · IPP" }] }),
  component: ApplicationsPage,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function ApplicationsPage() {
  const student = useStudent();
  const apps = student ? myApplications(student) : [];

  return (
    <AppShell>
      <PageHeader
        step="Step 3 of 4"
        title="My applications"
        subtitle="Every placement you have applied to, with the latest decision from the review team."
      />
      {!student ? (
        <Panel>
          <p className="text-sm text-muted-foreground">Loading your applications…</p>
        </Panel>
      ) : apps.length === 0 ? (
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
            {apps.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
              >
                <div className="min-w-0">
                  {a.opportunity_id ? (
                    <Link
                      to="/opportunities/$id"
                      params={{ id: a.opportunity_id }}
                      className={`font-semibold text-heading hover:underline ${focus}`}
                    >
                      {a.title}
                    </Link>
                  ) : (
                    <span className="font-semibold text-heading">{a.title}</span>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {a.employer} · applied {fmt(a.appliedAt)}
                  </p>
                </div>
                <Status>{a.status}</Status>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-6 py-3 text-xs text-muted-foreground">
            An approved application is not a placement. A named person at the university confirms
            every placement.
          </p>
        </Panel>
      )}
    </AppShell>
  );
}
