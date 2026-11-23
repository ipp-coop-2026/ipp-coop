import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ListingForm } from "@/components/p02/ListingForm";
import { Panel, RoleGate } from "@/components/p02/ui";
import { useLaunchpad } from "@/lib/p02/store";

export const Route = createFileRoute("/employer/edit/$id")({
  head: () => ({ meta: [{ title: "Edit listing · IPP" }] }),
  component: EditListing,
});

function EditListing() {
  const { id } = Route.useParams();
  const lp = useLaunchpad();
  const listing = lp?.listings.find((l) => l.id === id);
  return (
    <AppShell>
      <RoleGate need="employer" view={lp?.view}>
        {listing ? (
          <ListingForm key={listing.id} existing={listing} />
        ) : (
          <Panel>
            <p className="text-sm text-muted-foreground">That listing was not found.</p>
          </Panel>
        )}
      </RoleGate>
    </AppShell>
  );
}
