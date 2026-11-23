import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { DeskAdmin } from "@/components/DeskAdmin";
import { RoleGate } from "@/components/p02/ui";
import { useLaunchpad } from "@/lib/p02/store";

// Team 3 (P03): Career Services' side of the Internship Desk, inside the admin view.
export const Route = createFileRoute("/admin/desk")({
  head: () => ({ meta: [{ title: "Internship Desk queue · IPP" }] }),
  component: DeskQueue,
});

function DeskQueue() {
  const lp = useLaunchpad();
  return (
    <AppShell wide>
      <RoleGate need="admin" view={lp?.view}>
        <PageHeader
          step="During the internship · Team 3"
          title="Internship Desk queue"
          subtitle="Cases the Internship Desk sent to Career Services, questions the guide could not answer, and the policy entries it answers from."
        />
        <DeskAdmin />
      </RoleGate>
    </AppShell>
  );
}
