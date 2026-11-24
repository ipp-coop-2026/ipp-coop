import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StudentProfile } from "@/components/p01/StudentProfile";

const TITLE = "Internship interests · P01 · IPP";
const DESCRIPTION =
  "Write your internship goals, availability and skills, submit them for review and see what people still decide.";

export const Route = createFileRoute("/p01/profile")({
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
        title="Internship interests"
        subtitle="Write what you want to learn, when you are free and what you can do. You decide when it is submitted; a coordinator reviews it."
      />
      <StudentProfile />
    </AppShell>
  ),
});
