import { useMemo, useState } from "react";
import { latestProfile, matchStudent, rowLine, students as listStudents, whyLines, type MethodFamily, type Recommendation } from "@/lib/p05";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { JobDetails } from "./JobDetails";
import { useAiSignals, useMatchData, type SourceState } from "./useMatchData";
import { TONE, ToneIcon, VerdictChip } from "./Verdict";

const DEMO_PICKS = ["COOP-B001", "COOP-B004", "COOP-B005", "COOP-B006", "COOP-P001"];
const LIST_LIMIT = 12;

function SourceLine({ source }: { source: SourceState }) {
  const text = source.mode === "loading" ? "Loading the shared database…"
    : source.mode === "live" ? `Live from the shared BUS2010 database: ${source.counts.students} students, ${source.counts.listings} published jobs.`
    : "Demo data — couldn’t reach the shared database.";
  return (
    <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
      {source.mode === "live" && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />}
      {text}
    </p>
  );
}

/**
 * P05 AI-assisted matching on Student → Recommended (Team 5). Ranks open jobs for a student, explains each one in
 * plain words and keeps "can apply" decided by the rules only. Reads the shared database; a recommendation is never
 * a placement.
 */
export function P05Matches({ studentId }: { studentId: string }) {
  const { data, source } = useMatchData();
  const [student, setStudent] = useState(studentId);
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState<MethodFamily>("rules");
  const [showAll, setShowAll] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const live = source.mode === "live";
  const { ai, loading: aiLoading } = useAiSignals(data, live, student, family === "ai");

  const people = useMemo(() => (data ? listStudents(data) : []), [data]);
  const fam: MethodFamily = family === "ai" && aiLoading ? "rules" : family;
  const result = useMemo(() => {
    if (!data) return null;
    const withAi = family === "ai" && live ? { ...data, ai } : data;
    return matchStudent(withAi, student, fam);
  }, [data, ai, student, fam, family, live]);

  if (!data) return <div className="space-y-3 py-6"><SourceLine source={source} /></div>;
  if (!result) {
    return (
      <div className="space-y-3 py-6">
        <SourceLine source={source} />
        <p>No submitted profile for {student} in this data. <Button variant="link" className="px-1" onClick={() => setStudent(people[0]?.student_id ?? studentId)}>Show the first student</Button></p>
      </div>
    );
  }

  const { profile, records } = result;
  const closedOn = (id: string) => data.listings.find((l) => l.opportunity_id === id)?.closed_on ?? null;
  const counts = { go: 0, todo: 0, no: 0 };
  records.forEach((r) => { counts[r.status === "eligible" ? "go" : r.status === "cannot_confirm" ? "todo" : "no"]++; });
  const top = records.filter((r) => r.status !== "excluded").slice(0, 3);
  const shown = showAll ? records : records.slice(0, LIST_LIMIT);
  const first = profile.name.split(" ")[0] ?? profile.name;
  const open: Recommendation | null = records.find((r) => r.opportunity_id === openId) ?? null;

  const pick = (value: string) => {
    setSearch(value);
    const id = /COOP-[A-Z]\d{3}/i.exec(value)?.[0]?.toUpperCase();
    const hit = id ? people.find((p) => p.student_id === id) : people.find((p) => p.name.toLowerCase() === value.trim().toLowerCase());
    if (hit) { setStudent(hit.student_id); setShowAll(false); setSearch(""); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 rounded-3xl bg-panel p-6 text-panel-foreground lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-xl space-y-2">
          <p className="text-sm text-panel-muted">P05 matching for</p>
          <h2 className="font-display text-2xl font-bold">{profile.name} <span className="font-mono text-sm font-normal text-panel-muted">{profile.student_id} · profile v{profile.profile_version}</span></h2>
          {profile.goals && <p className="text-panel-muted">“{profile.goals}”</p>}
        </div>
        <div className="w-full max-w-sm space-y-2">
          <Label htmlFor="p05-student" className="text-panel-muted">Try another student ({people.length})</Label>
          <Input id="p05-student" list="p05-students" value={search} onChange={(e) => pick(e.target.value)} placeholder="Type a name or COOP-B…" className="border-panel-muted/40 bg-panel text-panel-foreground placeholder:text-panel-muted" />
          <datalist id="p05-students">{people.map((p) => <option key={p.student_id} value={`${p.name} (${p.student_id})`} />)}</datalist>
          <div className="flex flex-wrap gap-1.5" aria-label="Demo students">
            {DEMO_PICKS.filter((id) => people.some((p) => p.student_id === id)).map((id) => (
              <button key={id} type="button" aria-pressed={id === student} onClick={() => { setStudent(id); setShowAll(false); }}
                className={`rounded-full px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${id === student ? "bg-lime text-lime-foreground" : "border border-panel-muted/40 text-panel-foreground hover:bg-white/10"}`}>
                {people.find((p) => p.student_id === id)?.name.split(" ")[0] ?? id}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="font-display text-3xl font-bold tracking-tight">{first}’s matches</h2>
          <p className="text-muted-foreground">
            {counts.go ? `You can apply to ${counts.go} job${counts.go === 1 ? "" : "s"} now.` : "No job is ready to apply to yet."}
            {counts.todo > 0 && ` ${counts.todo} more need${counts.todo === 1 ? "s" : ""} one thing from you.`}
            {family === "ai" && aiLoading && " Loading AI scores…"}
          </p>
          <SourceLine source={source} />
        </div>
        <ToggleGroup type="single" value={family} onValueChange={(v) => { if (v === "rules" || v === "ai") setFamily(v); }} aria-label="Ranking method" className="justify-start">
          <ToggleGroupItem value="rules" className="rounded-full px-4">Rules only</ToggleGroupItem>
          <ToggleGroupItem value="ai" className="rounded-full px-4">With AI similarity (gte-small)</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <dl className="grid grid-cols-3 gap-3 border-y border-border py-4">
        {([["go", "Can apply"], ["todo", "One thing to do"], ["no", "Not now or closed"]] as const).map(([tone, label]) => (
          <div key={tone}>
            <dd className="font-display text-3xl font-bold">{counts[tone]}</dd>
            <dt className="flex items-center gap-1.5 text-sm text-muted-foreground"><span className={`grid h-5 w-5 place-items-center rounded-full ${TONE[tone]}`}><ToneIcon tone={tone} className="h-3 w-3" /></span>{label}</dt>
          </div>
        ))}
      </dl>

      <section aria-labelledby="p05-top3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="p05-top3" className="font-display text-xl font-bold">Top 3 for you</h2>
          <span className="text-xs text-muted-foreground">Ranked with {fam === "ai" ? "AI similarity (gte-small)" : "the rules baseline"}</span>
        </div>
        <ol>
          {top.map((r, i) => {
            const why = whyLines(r, data.vocabulary);
            return (
              <li key={r.opportunity_id} className="grid grid-cols-[2rem_1fr] gap-3 border-t border-border py-4 sm:grid-cols-[2.5rem_1fr_auto]">
                <span aria-hidden="true" className="font-display text-3xl font-bold leading-none text-primary">{i + 1}</span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold">{r.listing?.title}</p>
                  <p className="text-sm text-muted-foreground">{r.listing?.employer}, {r.listing?.city}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{(why.length ? why : ["Open to you, but it shares little with what you picked."]).slice(0, 3).map((w) => <li key={w}>{w}</li>)}</ul>
                </div>
                <div className="col-start-2 flex items-center gap-2 sm:col-start-3 sm:flex-col sm:items-end">
                  <VerdictChip r={r} />
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setOpenId(r.opportunity_id)}>Details</Button>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">A ranking supports your decision; it is not a placement. Whether you can apply is checked separately, and a person at the co-op office approves every placement.</p>
      </section>

      <section aria-labelledby="p05-all">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="p05-all" className="font-display text-xl font-bold">All {records.length} jobs</h2>
          <span className="text-xs text-muted-foreground">Best options first</span>
        </div>
        <ol>
          {shown.map((r) => (
            <li key={r.opportunity_id} className={`flex flex-col gap-2 border-t border-border py-3 sm:flex-row sm:items-center sm:gap-4 ${r.status === "not_eligible" || r.status === "excluded" ? "opacity-75" : ""}`}>
              <div className="w-40 shrink-0"><VerdictChip r={r} /></div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.listing?.title ?? r.opportunity_id}</p>
                <p className="text-sm text-muted-foreground">{r.listing?.employer}, {r.listing?.city} · {rowLine(r, data.vocabulary, closedOn(r.opportunity_id))}</p>
              </div>
              <Button variant="ghost" size="sm" className="self-start rounded-full sm:self-center" onClick={() => setOpenId(r.opportunity_id)}>Details</Button>
            </li>
          ))}
        </ol>
        {records.length > LIST_LIMIT && (
          <Button variant="outline" className="mt-3 rounded-full" onClick={() => setShowAll((v) => !v)}>
            {showAll ? `Show the first ${LIST_LIMIT} only` : `Show all ${records.length} jobs`}
          </Button>
        )}
      </section>

      <JobDetails r={open} profile={latestProfile(data, student) ?? profile} data={data} onClose={() => setOpenId(null)} />
    </div>
  );
}
