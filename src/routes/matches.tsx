import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { P05Matches } from "@/components/p05/P05Matches";
import { DEMO_STUDENT_ID } from "@/lib/ipp-store";

// Team 5's matching module (P05) inside the student flow.
export const Route = createFileRoute("/matches")({
  head: () => ({ meta: [{ title: "Matches · IPP" }] }),
  component: () => (
    <AppShell wide>
      <PageHeader
        step="Recommended for you"
        title="Matches"
        subtitle="Placements ranked against your profile, with the reasons and anything still missing. A match is advice, never a placement."
      />
      <P05Matches studentId={DEMO_STUDENT_ID} />
    </AppShell>
  ),
});
