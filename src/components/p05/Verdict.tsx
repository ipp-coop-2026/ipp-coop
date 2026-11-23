import { Check, Minus } from "lucide-react";
import { verdict, type Recommendation, type Tone } from "@/lib/p05";

/** Three answers only, each with an icon and a word: can apply, one thing to do, not a fit now. */
const TONE: Record<Tone, string> = {
  go: "bg-status text-status-foreground",
  todo: "bg-warn text-warn-foreground",
  no: "bg-muted text-muted-foreground",
};

export function ToneIcon({ tone, className = "h-3.5 w-3.5" }: { tone: Tone; className?: string }) {
  if (tone === "go") return <Check aria-hidden="true" className={className} strokeWidth={3} />;
  if (tone === "todo") return <span aria-hidden="true" className="text-[0.8rem] font-bold leading-none">!</span>;
  return <Minus aria-hidden="true" className={className} strokeWidth={3} />;
}

export function VerdictChip({ r }: { r: Recommendation }) {
  const v = verdict(r);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${TONE[v.tone]}`}>
      <ToneIcon tone={v.tone} />
      {v.label}
    </span>
  );
}

export function StateDot({ state }: { state: Recommendation["mandatory"][number]["state"] }) {
  const tone: Tone = state === "met" ? "go" : state === "not_met" ? "no" : "todo";
  const label = state === "met" ? "Met" : state === "not_met" ? "Not met" : state === "suggested" ? "Suggested" : "Cannot confirm yet";
  return (
    <span role="img" aria-label={label} className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${TONE[tone]}`}>
      <ToneIcon tone={tone} className="h-3 w-3" />
    </span>
  );
}

export { TONE };
