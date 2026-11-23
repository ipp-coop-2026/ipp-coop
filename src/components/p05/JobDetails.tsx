import { aiSourceText, fmtDate, requirementText, rowLine, skillName, whyLines, type MatchData, type Profile, type Recommendation } from "@/lib/p05";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StateDot, VerdictChip } from "./Verdict";

interface Props {
  r: Recommendation | null;
  profile: Profile;
  data: MatchData;
  onClose: () => void;
}

/** Details for one job: why it was suggested, what it requires, nice to have, and the record it came from. */
export function JobDetails({ r, profile, data, onClose }: Props) {
  const listing = r ? data.listings.find((l) => l.opportunity_id === r.opportunity_id) : undefined;
  const L = r?.listing;
  const why = r ? whyLines(r, data.vocabulary) : [];
  const nice = r?.desirable.filter((c) => c.state === "met" && c.skill_id).map((c) => skillName(c.skill_id ?? "", data.vocabulary)) ?? [];
  const miss = r?.desirable.filter((c) => c.state !== "met" && c.skill_id).map((c) => skillName(c.skill_id ?? "", data.vocabulary)) ?? [];

  return (
    <Sheet open={r !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {r && L && (
          <div className="space-y-6">
            <SheetHeader className="space-y-3 pr-6">
              <VerdictChip r={r} />
              <SheetTitle className="font-display text-2xl font-bold leading-tight">{L.title}</SheetTitle>
              <SheetDescription>
                {L.employer}, {L.city ?? "location not given"}, {L.work_arrangement ?? "work style not given"}. {fmtDate(L.start_date)} to {fmtDate(L.end_date)}.
              </SheetDescription>
            </SheetHeader>

            {r.status === "excluded" ? (
              <p>{rowLine(r, data.vocabulary, listing?.closed_on ?? null)} It stays in the list so nothing disappears without a reason.</p>
            ) : (
              <>
                {why.length > 0 && (
                  <section aria-labelledby="p05-why" className="border-t border-border pt-5">
                    <h3 id="p05-why" className="mb-3 font-display text-lg font-bold">Why it was suggested</h3>
                    <ul className="space-y-2 text-sm">{why.map((w) => <li key={w} className="flex gap-3"><StateDot state="met" /><span>{w}</span></li>)}</ul>
                  </section>
                )}
                <section aria-labelledby="p05-req" className="border-t border-border pt-5">
                  <h3 id="p05-req" className="mb-3 font-display text-lg font-bold">What it requires</h3>
                  {r.mandatory.length === 0 ? <p className="text-sm">This job has no fixed requirements.</p> : (
                    <ul className="space-y-3 text-sm">
                      {r.mandatory.map((c) => {
                        const q = requirementText(c, r, profile, data.vocabulary);
                        return <li key={c.cond_id} className="flex gap-3"><StateDot state={c.state} /><span><span className="font-semibold">{q.name}</span><br /><span className="text-muted-foreground">{q.text}</span></span></li>;
                      })}
                    </ul>
                  )}
                  {r.status === "cannot_confirm" && (
                    <p className="mt-4 rounded-2xl bg-lime p-4 text-sm text-lime-foreground">
                      <span className="font-semibold">One thing to do:</span> {rowLine(r, data.vocabulary, null)} Skills training (P06) gives a short task and a reviewer checks it; the result reaches this page through the shared database.
                    </p>
                  )}
                </section>
                <section aria-labelledby="p05-nice" className="border-t border-border pt-5">
                  <h3 id="p05-nice" className="mb-2 font-display text-lg font-bold">Nice to have</h3>
                  <p className="text-sm">
                    {r.desirable.length === 0 ? "Nothing extra listed." : (
                      <>{nice.length > 0 && `You have ${nice.join(", ")}. `}{miss.length > 0 && `Not on your profile: ${miss.join(", ")}. `}These help your interest fit but are not required.</>
                    )}
                  </p>
                  {r.ai_notes.length > 0 && (
                    <div className="mt-4 space-y-1.5 rounded-2xl border border-sent-foreground/40 bg-card p-4 text-sm">
                      <p className="font-semibold">{aiSourceText(r)}</p>
                      {r.ai_notes.map((n) => <p key={n.text} className="text-muted-foreground">{n.text}</p>)}
                    </div>
                  )}
                </section>
              </>
            )}

            <details className="border-t border-border pt-4 text-sm">
              <summary className="cursor-pointer font-semibold">Technical details <span className="font-normal text-muted-foreground">for the coordinator and testers</span></summary>
              <div className="mt-3 space-y-1 font-mono text-xs text-muted-foreground">
                <p>Record {r.recommendation_id}, profile version {r.profile_version}, job version {r.opportunity_version ?? "none"}, method {r.method_version}, {r.pref_points} interest points.</p>
                {r.reasons.map((x) => <p key={x.text}>{x.profile_field} ↔ {x.opportunity_field}, profile v{x.profile_version}, job v{x.opportunity_version}</p>)}
              </div>
            </details>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
