import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, MessageSquare, ScanSearch, Sparkles, X, HelpCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, Status } from "@/components/AppShell";
import {
  AiBadge,
  Chip,
  companyName,
  focus,
  fmtDate,
  inputCls,
  Panel,
  RoleGate,
} from "@/components/p02/ui";
import { askAi } from "@/lib/p02/ai";
import type { AiAnswer } from "@/lib/p02/ai-core";
import { COMPANIES } from "@/lib/p02/data";
import { matchOne } from "@/lib/p02/match";
import { commit, setAppStatus, studentById, useLaunchpad } from "@/lib/p02/store";

export const Route = createFileRoute("/employer/applicants/$id")({
  head: () => ({ meta: [{ title: "Applicants · IPP" }] }),
  component: Applicants,
});

const aiBtn = `inline-flex items-center gap-1 rounded-md border border-[oklch(0.85_0.06_300)] bg-[oklch(0.975_0.015_300)] px-2.5 py-1 text-xs font-semibold text-[oklch(0.48_0.15_300)] hover:bg-[oklch(0.955_0.03_300)] disabled:opacity-50 ${focus}`;

function Applicants() {
  const { id } = Route.useParams();
  const lp = useLaunchpad();
  const [sort, setSort] = useState<"match" | "recent">("match");
  const [skill, setSkill] = useState("");
  const [major, setMajor] = useState("");
  const [year, setYear] = useState("");
  const [out, setOut] = useState<Record<string, { title: string; a: AiAnswer }>>({});
  const [busy, setBusy] = useState("");
  const listing = lp?.listings.find((l) => l.id === id);
  const company = COMPANIES.find((c) => c.id === listing?.companyId);

  const rows = useMemo(() => {
    if (!lp || !listing) return [];
    return lp.applications
      .filter((a) => a.listingId === listing.id)
      .map((a) => {
        const s = studentById(lp, a.studentId);
        return s ? { a, s, m: matchOne(s, listing) } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }, [lp, listing]);

  const allSkills = [...new Set(rows.flatMap((r) => r.s.skills))].sort();
  const majors = [...new Set(rows.map((r) => r.s.major).filter(Boolean))].sort();
  const years = [...new Set(rows.map((r) => r.s.year).filter(Boolean))].sort();
  const shown = rows
    .filter(
      (r) =>
        (!skill || r.s.skills.includes(skill)) &&
        (!major || r.s.major === major) &&
        (!year || String(r.s.year) === year),
    )
    .sort((x, y) =>
      sort === "match" ? y.m.score - x.m.score : y.a.appliedAt.localeCompare(x.a.appliedAt),
    );

  const run = async (
    appId: string,
    task: "analysis" | "questions" | "message",
    title: string,
    name: string,
    ctx: Record<string, unknown>,
  ) => {
    setBusy(`${appId}:${task}`);
    const a = await askAi(
      { task, context: ctx },
      { kind: "Employer AI", title: `${title} for ${name}` },
    );
    setOut((o) => ({ ...o, [appId]: { title, a } }));
    setBusy("");
  };

  return (
    <AppShell>
      <RoleGate need="employer" view={lp?.view}>
        <Link
          to="/employer/listings"
          className={`mb-5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground ${focus}`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to my listings
        </Link>
        {!lp ? null : !listing ? (
          <Panel>
            <p className="text-sm text-muted-foreground">That listing was not found.</p>
          </Panel>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
              Employer
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Applicants</h1>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Sample data
              </span>
            </div>
            <p className="mt-2 text-muted-foreground">
              {listing.title} · {companyName(listing.companyId)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Required: {listing.required.join(", ")} · Preferred:{" "}
              {listing.preferred.join(", ") || "none"} · Min year: {listing.minYear}
            </p>

            <Panel className="my-5 p-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <label>
                  <span className="sr-only">Sort</span>
                  <select
                    className={inputCls}
                    value={sort}
                    onChange={(e) => setSort(e.target.value as "match" | "recent")}
                  >
                    <option value="match">Sort: match (high to low)</option>
                    <option value="recent">Sort: most recent</option>
                  </select>
                </label>
                <label>
                  <span className="sr-only">Filter by skill</span>
                  <select
                    className={inputCls}
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                  >
                    <option value="">All skills</option>
                    {allSkills.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Filter by major</span>
                  <select
                    className={inputCls}
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                  >
                    <option value="">All majors</option>
                    {majors.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="sr-only">Filter by year</span>
                  <select
                    className={inputCls}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value="">All years</option>
                    {years.map((y) => (
                      <option key={y} value={String(y)}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {shown.length} {shown.length === 1 ? "applicant" : "applicants"}
              </p>
            </Panel>

            <ul className="space-y-4">
              {shown.map(({ a, s, m }) => {
                const ctx = {
                  name: s.name,
                  major: s.major,
                  year: s.year,
                  skills: s.skills,
                  title: listing.title,
                  company: company?.name,
                  hr: company?.hr,
                  required: listing.required,
                  preferred: listing.preferred,
                  minYear: listing.minYear,
                };
                const o = out[a.id];
                return (
                  <li key={a.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-heading">{s.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.major || "Major not given"} · Year {s.year || "?"} · Applied{" "}
                          {fmtDate(a.appliedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Status>{a.status}</Status>
                        <span className="rounded-full bg-[oklch(0.955_0.03_300)] px-2.5 py-0.5 text-xs font-bold text-[oklch(0.48_0.15_300)]">
                          Score {m.score}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {s.skills.map((k) => {
                        const req =
                          m.required.find((r) => r.skill === k) ??
                          m.preferred.find((r) => r.skill === k);
                        return (
                          <Chip key={k} tone={req ? "yes" : "plain"}>
                            {req && <Check aria-hidden="true" className="h-3 w-3" />}
                            {k}
                          </Chip>
                        );
                      })}
                      {m.required
                        .filter((r) => !r.has)
                        .map((r) => (
                          <Chip key={r.skill} tone="no">
                            <X aria-hidden="true" className="h-3 w-3" /> {r.skill}
                            <span className="sr-only">(missing)</span>
                          </Chip>
                        ))}
                      <Chip tone={m.yearOk ? "yes" : "no"}>
                        {m.yearOk ? "Eligible by year" : `Needs year ${listing.minYear}`}
                      </Chip>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={aiBtn}
                        disabled={!!busy}
                        onClick={() => void run(a.id, "analysis", "Match analysis", s.name, ctx)}
                      >
                        <ScanSearch aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                        {busy === `${a.id}:analysis` ? "Analysing…" : "AI analysis"}
                      </button>
                      <button
                        type="button"
                        className={aiBtn}
                        disabled={!!busy}
                        onClick={() =>
                          void run(a.id, "questions", "Interview questions", s.name, ctx)
                        }
                      >
                        <HelpCircle aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                        {busy === `${a.id}:questions` ? "Writing…" : "Interview questions"}
                      </button>
                      <button
                        type="button"
                        className={aiBtn}
                        disabled={!!busy}
                        onClick={() => void run(a.id, "message", "Message draft", s.name, ctx)}
                      >
                        <MessageSquare aria-hidden="true" className="h-3.5 w-3.5" />{" "}
                        {busy === `${a.id}:message` ? "Drafting…" : "Draft message"}
                      </button>
                      <span className="flex-1" />
                      <button
                        type="button"
                        disabled={a.status === "Shortlisted"}
                        onClick={() => commit((st) => setAppStatus(st, a.id, "Shortlisted"))}
                        className={`inline-flex items-center gap-1 rounded-md border border-status-foreground/25 bg-status px-3 py-1.5 text-xs font-semibold text-status-foreground disabled:opacity-40 ${focus}`}
                      >
                        <Check aria-hidden="true" className="h-3.5 w-3.5" /> Shortlist
                      </button>
                      <button
                        type="button"
                        disabled={a.status === "Rejected"}
                        onClick={() => commit((st) => setAppStatus(st, a.id, "Rejected"))}
                        className={`inline-flex items-center gap-1 rounded-md border border-danger-foreground/25 bg-danger px-3 py-1.5 text-xs font-semibold text-danger-foreground disabled:opacity-40 ${focus}`}
                      >
                        <X aria-hidden="true" className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                    {o && (
                      <div
                        className="mt-3 rounded-xl border border-[oklch(0.9_0.04_300)] bg-[oklch(0.985_0.008_300)] p-3 text-sm"
                        aria-live="polite"
                      >
                        <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-heading">
                          <Sparkles
                            aria-hidden="true"
                            className="h-3.5 w-3.5 text-[oklch(0.48_0.15_300)]"
                          />{" "}
                          {o.title}{" "}
                          <AiBadge model={o.a.model}>
                            {o.a.model ? "AI-generated" : "Template"}
                          </AiBadge>
                        </p>
                        {o.a.items ? (
                          <ul className="list-disc space-y-1 pl-5">
                            {o.a.items.map((q) => (
                              <li key={q}>{q}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="whitespace-pre-line">{o.a.text}</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
              {shown.length === 0 && (
                <li>
                  <Panel>
                    <p className="text-sm text-muted-foreground">
                      No applicants match these filters.
                    </p>
                  </Panel>
                </li>
              )}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              AI suggestions are guidance only. Only a person can shortlist or reject an applicant.
            </p>
          </>
        )}
      </RoleGate>
    </AppShell>
  );
}
