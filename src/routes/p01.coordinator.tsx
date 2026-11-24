import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { CoordinatorReview } from "@/components/p01/CoordinatorReview";

const TITLE = "Profile review · P01 · IPP";
const DESCRIPTION =
  "Review student profiles, ask for clarification, accept reviewed skill evidence and hand a profile version to other teams.";

export const Route = createFileRoute("/p01/coordinator")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: () => (
    <AppShell wide>
      <PageHeader
        step="P01 · Student profiles"
        title="Profile review"
        subtitle="Check what a student submitted, ask for clarification or mark it reviewed, and accept skill evidence from P06."
      />
      <CoordinatorReview />
    </AppShell>
  ),
});
