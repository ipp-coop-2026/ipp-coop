import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Clock,
  Lightbulb,
  Plus,
  Sparkles,
  TrendingDown,
  Trophy,
  Users,
  UserCheck,
} from "lucide-react";
import { AppShell, Status } from "@/components/AppShell";
import { CompanySwitch } from "@/components/p02/CompanySwitch";
import {
  AiBadge,
  focus,
  fmtDate,
  Panel,
  primaryBtn,
  quietBtn,
  RoleGate,
} from "@/components/p02/ui";
import { COMPANIES } from "@/lib/p02/data";
import { matchOne } from "@/lib/p02/match";
import { studentById, useLaunchpad } from "@/lib/p02/store";

export const Route = createFileRoute("/employer/")({
  head: () => ({ meta: [{ title: "Employer dashboard · IPP" }] }),
  component: Dashboard,
});

const ago = (iso: string) => {
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};

function Dashboard() {
  const lp = useLaunchpad();
  const company = COMPANIES.find((c) => c.id === lp?.companyId) ?? COMPANIES[0]!;
  const mine = lp ? lp.listings.filter((l) => l.companyId === company.id) : [];
  const apps = lp ? lp.applications.filter((a) => mine.some((l) => l.id === a.listingId)) : [];
  const scored = lp
    ? apps
        .map((a) => {
          const s = studentById(lp, a.studentId);
          const l = mine.find((x) => x.id === a.listingId)!;
          return s ? { a, s, l, score: matchOne(s, l).score } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
    : [];
  const few = mine.filter(
    (l) => l.status === "Approved" && apps.filter((a) => a.listingId === l.id).length < 3,
  );
  const weak = mine.filter((l) => {
    const s = scored.filter((x) => x.l.id === l.id);
    return s.length > 0 && !s.some((x) => x.score >= 60);
  });
  const missing = new Map<string, number>();
  for (const x of scored)
    for (const r of matchOne(x.s, x.l).required)
      if (!r.has) missing.set(r.skill, (missing.get(r.skill) ?? 0) + 1);
  const topMissing = [...missing.entries()].sort((a, b) => b[1] - a[1])[0];
  const employerLog = lp ? lp.aiLog.filter((e) => e.kind === "Employer AI").slice(0, 10) : [];
  const tiles: [string, number, typeof Briefcase, string][] = [
    ["My listings", mine.length, Briefcase, "bg-sent text-sent-foreground"],
    ["Total applicants", apps.length, Users, "bg-accent text-accent-foreground"],
    [
      "Shortlisted",
      apps.filter((a) => a.status === "Shortlisted").length,
      UserCheck,
      "bg-[oklch(0.955_0.03_300)] text-[oklch(0.48_0.15_300)]",
    ],
    [
      "Pending review",
      mine.filter((l) => l.status === "Pending Review").length,
      Clock,
      "bg-warn text-warn-foreground",
    ],
  ];

  return (
    <AppShell>
      <RoleGate need="employer" view={lp?.view}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
              Employer
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
              {company.name} dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Welcome, {company.hr}. Manage your listings and review applicants.
            </p>
          </div>
          <Link to="/employer/post" className={primaryBtn}>
            <Plus aria-hidden="true" className="h-4 w-4" /> Post opportunity
          </Link>
        </div>
        <CompanySwitch />

        <ul className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
          {tiles.map(([label, n, Icon, tone]) => (
            <li
              key={label}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <span
                aria-hidden="true"
                className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="text-2xl font-extrabold text-heading">{n}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel className="p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-base font-bold">My listings</h2>
              <Link
                to="/employer/listings"
                className={`text-sm font-semibold text-primary hover:underline ${focus}`}
              >
                View all
              </Link>
            </div>
            <ul className="divide-y divide-border">
              {mine.length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">
                  No listings yet. Post your first opportunity.
                </li>
              )}
              {mine.slice(0, 4).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link
                      to="/employer/applicants/$id"
                      params={{ id: l.id }}
                      className={`text-sm font-semibold text-heading hover:underline ${focus}`}
                    >
                      {l.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {l.city} · {l.mode}
                    </p>
                  </div>
                  <Status>{l.status}</Status>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="p-0">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-base font-bold">Recent applicants</h2>
            </div>
            <ul className="divide-y divide-border">
              {scored.length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">No applicants yet.</li>
              )}
              {[...scored]
                .sort((x, y) => y.a.appliedAt.localeCompare(x.a.appliedAt))
                .slice(0, 4)
                .map(({ a, s, l }) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-heading">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{l.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(a.appliedAt, { day: "numeric", month: "short" })}
                      </span>
                      <Status>{a.status}</Status>
                    </div>
                  </li>
                ))}
            </ul>
          </Panel>
        </div>
        <Link to="/employer/listings" className={`mt-4 ${quietBtn}`}>
          Manage listings <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>

        <section aria-labelledby="insights-h" className="mt-10">
          <h2 id="insights-h" className="text-xl font-bold">
            Insights
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suggestions to help you review and adjust your listings. A person makes the final
            decision.
          </p>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            <li className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <TrendingDown aria-hidden="true" className="h-5 w-5 text-warn-foreground" />
              <h3 className="mt-3 text-sm font-bold">Listings with few applicants</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {few.length
                  ? `${few.length} ${few.length === 1 ? "listing needs" : "listings need"} more applicants: ${few.map((l) => l.title).join(", ")}.`
                  : "Every approved listing has at least three applicants."}
              </p>
            </li>
            <li className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <AlertTriangle aria-hidden="true" className="h-5 w-5 text-danger-foreground" />
              <h3 className="mt-3 text-sm font-bold">No strong matches</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {weak.length
                  ? `${weak.map((l) => l.title).join(", ")} ${weak.length === 1 ? "has" : "have"} no applicant scoring 60% or more.`
                  : "Every listing with applicants has at least one strong match."}
              </p>
            </li>
            <li className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <Lightbulb aria-hidden="true" className="h-5 w-5 text-[oklch(0.48_0.15_300)]" />
              <h3 className="mt-3 text-sm font-bold">Most common missing skill</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {topMissing
                  ? `"${topMissing[0]}" is missing from ${topMissing[1]} ${topMissing[1] === 1 ? "applicant" : "applicants"}. Consider making it a preferred skill, or offering a short ramp-up.`
                  : "No required skill is missing from your applicants."}
              </p>
            </li>
          </ul>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Panel className="p-0">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-bold">
                  <Trophy aria-hidden="true" className="h-4 w-4 text-warn-foreground" /> Top
                  candidates
                </h3>
                <AiBadge model={false}>Rules-ranked</AiBadge>
              </div>
              <ul className="divide-y divide-border">
                {[...scored]
                  .sort((x, y) => y.score - x.score)
                  .slice(0, 3)
                  .map(({ a, s, l, score }) => (
                    <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="w-10 text-sm font-bold text-[oklch(0.48_0.15_300)]">
                        {score}%
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-heading">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{l.title}</p>
                      </div>
                      <Link
                        to="/employer/applicants/$id"
                        params={{ id: l.id }}
                        className={`text-sm font-semibold text-primary hover:underline ${focus}`}
                      >
                        View
                      </Link>
                    </li>
                  ))}
                {scored.length === 0 && (
                  <li className="px-5 py-4 text-sm text-muted-foreground">
                    No applicants to rank yet.
                  </li>
                )}
              </ul>
              <p className="border-t border-border px-5 py-2 text-xs text-muted-foreground">
                Suggestion only. A person makes the final decision.
              </p>
            </Panel>
            <Panel className="p-0">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h3 className="inline-flex items-center gap-1.5 text-sm font-bold">
                  <Sparkles aria-hidden="true" className="h-4 w-4 text-[oklch(0.48_0.15_300)]" /> AI
                  activity
                </h3>
                <span className="text-xs text-muted-foreground">Last 10</span>
              </div>
              <ul className="divide-y divide-border">
                {employerLog.length === 0 && (
                  <li className="px-5 py-4 text-sm text-muted-foreground">
                    No AI activity yet. Try "Draft with AI" on Post Opportunity.
                  </li>
                )}
                {employerLog.map((e) => (
                  <li key={e.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-heading">{e.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{ago(e.at)}</span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{e.detail}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </section>
      </RoleGate>
    </AppShell>
  );
}
