import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Clock, GraduationCap, MapPin, Search, SearchX, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import {
  AiBadge,
  Chip,
  companyName,
  EmptyState,
  focus,
  inputCls,
  ListingCard,
  Panel,
  RoleGate,
} from "@/components/p02/ui";
import { DEMO_PROFILES } from "@/lib/p02/data";
import { canRecommend, recommend, type Match } from "@/lib/p02/match";
import { commit, logAi, openListings, studentById, useLaunchpad } from "@/lib/p02/store";

export const Route = createFileRoute("/opportunities/")({
  head: () => ({ meta: [{ title: "Opportunities · IPP" }] }),
  component: Opportunities,
});

function Ring({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="relative grid h-12 w-12 shrink-0 place-items-center"
      aria-label={`${pct}% match`}
    >
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-muted"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          className="text-primary"
        />
      </svg>
      <span className="text-xs font-bold text-heading">{pct}%</span>
    </span>
  );
}

function RecCard({
  m,
  title,
  company,
  city,
  mode,
}: {
  m: Match;
  title: string;
  company: string;
  city: string;
  mode: string;
}) {
  return (
    <li className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <Ring pct={m.score} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              to="/opportunities/$id"
              params={{ id: m.listingId }}
              className={`font-bold text-heading hover:underline ${focus}`}
            >
              {title}
            </Link>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" /> {company} · {city} · {mode}
            </p>
          </div>
          <AiBadge model={false}>Rules-based match</AiBadge>
        </div>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Why this match
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {m.required.map((r) => (
            <Chip key={r.skill} tone={r.has ? "yes" : "no"}>
              {r.has ? (
                <Check aria-hidden="true" className="h-3 w-3" />
              ) : (
                <X aria-hidden="true" className="h-3 w-3" />
              )}
              {r.skill}
              <span className="sr-only">{r.has ? "(you have it)" : "(missing)"}</span>
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip tone={m.yearOk ? "yes" : "no"}>
            <GraduationCap aria-hidden="true" className="h-3 w-3" />{" "}
            {m.yearOk ? "Year of study OK" : "Year of study too low"}
          </Chip>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${m.deadlineOpen ? "bg-sent text-sent-foreground" : "bg-muted text-muted-foreground"}`}
          >
            <Clock aria-hidden="true" className="h-3 w-3" />{" "}
            {m.deadlineOpen ? "Deadline open" : "Deadline passed"}
          </span>
        </div>
      </div>
    </li>
  );
}

function Opportunities() {
  const lp = useLaunchpad();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [mode, setMode] = useState("");
  const open = useMemo(() => (lp ? openListings(lp) : []), [lp]);
  const student = lp ? studentById(lp, lp.demoProfile) : null;
  const recs = useMemo(
    () => (canRecommend(student) ? recommend(student, open) : []),
    [student, open],
  );

  // Log each set of recommendations shown, as on Launchpad's AI review log.
  const profileKey = lp?.demoProfile;
  const recKey = recs.map((r) => `${r.listingId}:${r.score}`).join(",");
  useEffect(() => {
    if (!student || !recKey) return;
    commit((s) =>
      logAi(s, {
        kind: "Matching",
        title: `Recommendations shown for ${student.name}`,
        detail: `Profile: ${profileKey === "me" ? "Me" : profileKey}`,
        model: false,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey, recKey]);

  const cities = [...new Set(open.map((l) => l.city))].sort();
  const t = q.trim().toLowerCase();
  const hits = open.filter(
    (l) =>
      (!t ||
        `${l.title} ${companyName(l.companyId)} ${l.required.join(" ")} ${l.preferred.join(" ")}`
          .toLowerCase()
          .includes(t)) &&
      (!city || l.city === city) &&
      (!type || l.type === type) &&
      (!mode || l.mode === mode),
  );

  return (
    <AppShell>
      <RoleGate need="student" view={lp?.view}>
        <PageHeader
          step="Step 2 of 4"
          title="Opportunities"
          subtitle="Co-op placements and internships from partner organisations across the UAE."
        />

        <section aria-labelledby="rec-h" className="mb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 place-items-center rounded-lg bg-[oklch(0.955_0.03_300)] text-[oklch(0.48_0.15_300)]"
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 id="rec-h" className="text-base font-bold">
                  Recommended for you
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ranked by skills, program and preferences.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Demo profile:
              </span>
              <div
                role="group"
                aria-label="Demo profile"
                className="flex rounded-full border border-border bg-muted p-0.5"
              >
                {DEMO_PROFILES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={lp?.demoProfile === d.id}
                    onClick={() => commit((s) => ({ ...s, demoProfile: d.id }))}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${focus} ${lp?.demoProfile === d.id ? "bg-card text-heading shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {student && lp?.demoProfile !== "me" && (
                <span className="text-xs text-muted-foreground">
                  {student.name} · Year {student.year}
                </span>
              )}
            </div>
          </div>
          {!lp ? null : !canRecommend(student) ? (
            <Panel className="px-5 py-4">
              <p className="text-sm text-muted-foreground">
                Add your skills and major to your{" "}
                <Link to="/profile" className={`font-medium text-primary underline ${focus}`}>
                  profile
                </Link>{" "}
                to see personalised recommendations.
              </p>
            </Panel>
          ) : recs.length === 0 ? (
            <Panel className="px-5 py-4">
              <p className="text-sm text-muted-foreground">
                No open placement matches these skills yet.
              </p>
            </Panel>
          ) : (
            <>
              <ul className="space-y-3">
                {recs.map((m) => {
                  const l = open.find((x) => x.id === m.listingId)!;
                  return (
                    <RecCard
                      key={m.listingId}
                      m={m}
                      title={l.title}
                      company={companyName(l.companyId)}
                      city={l.city}
                      mode={l.mode}
                    />
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Recommendations are suggestions. Placements are approved by a person.
              </p>
            </>
          )}
        </section>

        <Panel className="mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_10rem_10rem_10rem]">
            <label className="relative">
              <span className="sr-only">Search opportunities</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                className={`${inputCls} pl-9`}
                placeholder="Search role, company or skill"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">Filter by location</span>
              <select className={inputCls} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">All locations</option>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by type</span>
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All types</option>
                <option>Internship</option>
                <option>Co-op</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by work mode</span>
              <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="">All modes</option>
                <option>On-site</option>
                <option>Hybrid</option>
                <option>Remote</option>
              </select>
            </label>
          </div>
          <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
            {lp
              ? `${hits.length} ${hits.length === 1 ? "opportunity" : "opportunities"} found`
              : "Loading opportunities…"}
          </p>
        </Panel>

        {lp && hits.length === 0 ? (
          <EmptyState icon={SearchX} title="No opportunities match">
            Try another word, or clear the filters.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {hits.map((l) => (
              <li key={l.id}>
                <ListingCard l={l} />
              </li>
            ))}
          </ul>
        )}
      </RoleGate>
    </AppShell>
  );
}
