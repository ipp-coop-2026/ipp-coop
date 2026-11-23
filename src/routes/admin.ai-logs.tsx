import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bot, Briefcase, Sparkles, Target } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AiBadge, focus, Panel, RoleGate } from "@/components/p02/ui";
import { useLaunchpad, type AiKind } from "@/lib/p02/store";

export const Route = createFileRoute("/admin/ai-logs")({
  head: () => ({ meta: [{ title: "AI review log · IPP" }] }),
  component: AiLogs,
});

const FILTERS: ("All" | AiKind)[] = ["All", "Chatbot", "Matching", "Employer AI"];
const ICON: Record<AiKind, typeof Bot> = {
  Chatbot: Bot,
  Matching: Target,
  "Employer AI": Briefcase,
};

function AiLogs() {
  const lp = useLaunchpad();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const rows = (lp?.aiLog ?? []).filter((e) => filter === "All" || e.kind === filter);

  return (
    <AppShell>
      <RoleGate need="admin" view={lp?.view}>
        <Link
          to="/admin"
          className={`mb-5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground ${focus}`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to admin review
        </Link>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
          Human oversight
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">AI review log</h1>
        <p className="mb-6 mt-2 text-muted-foreground">
          Every AI output is logged here. AI only suggests — a person makes every decision.
        </p>
        <div role="group" aria-label="Filter log" className="mb-4 flex flex-wrap gap-2">
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
        <Panel className="p-0">
          {rows.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Nothing logged yet. Use the assistant, the recommendations or the employer AI tools,
              and every output appears here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((e) => {
                const Icon = ICON[e.kind];
                return (
                  <li key={e.id} className="flex gap-3 px-6 py-4">
                    <span
                      aria-hidden="true"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[oklch(0.955_0.03_300)] text-[oklch(0.48_0.15_300)]"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-muted-foreground">{e.kind}</p>
                      <p className="font-medium text-heading">{e.title}</p>
                      {e.detail && (
                        <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">
                          {e.detail}
                        </p>
                      )}
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <AiBadge model={e.model}>
                          {e.model ? "AI-generated" : "Rules or template"}
                        </AiBadge>
                        · Shown ·{" "}
                        {new Date(e.at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Saved in this browser for the
          demo.
        </p>
      </RoleGate>
    </AppShell>
  );
}
