/** One progress report, read-only (P04). */
import type { ReportContent } from "@/lib/p04";

const FIELDS: [keyof Omit<ReportContent, "hours">, string][] = [
  ["workedOn", "What I worked on"],
  ["learned", "What I learned"],
  ["challenges", "Challenges"],
  ["helpNeeded", "Help needed"],
  ["nextPlan", "Plan for the next 2 weeks"],
];

export function ReportBody({ c, attachment }: { c: ReportContent; attachment: string }) {
  return (
    <dl className="space-y-3 text-sm">
      {FIELDS.map(([k, label]) => (
        <div key={k}>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 whitespace-pre-line">{c[k] || "–"}</dd>
        </div>
      ))}
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours worked</dt>
        <dd className="mt-0.5">{c.hours ?? "–"}</dd>
      </div>
      {attachment && (
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attachment</dt>
          <dd className="mt-0.5 font-mono text-xs">{attachment} (file name only in this demo)</dd>
        </div>
      )}
    </dl>
  );
}

