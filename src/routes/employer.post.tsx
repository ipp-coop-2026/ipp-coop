import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ListingForm } from "@/components/p02/ListingForm";
import { RoleGate } from "@/components/p02/ui";
import { useLaunchpad } from "@/lib/p02/store";

export const Route = createFileRoute("/employer/post")({
  head: () => ({ meta: [{ title: "Post an opportunity · IPP" }] }),
  component: PostOpportunity,
});

function PostOpportunity() {
  const lp = useLaunchpad();
  return (
    <AppShell>
      <RoleGate need="employer" view={lp?.view}>
        <ListingForm />
      </RoleGate>
    </AppShell>
  );
}
