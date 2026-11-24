import { useEffect, useState, type ReactNode } from "react";
import { Status } from "@/components/AppShell";
import { getSkills } from "@/lib/db";
import { DEMO_DATA } from "@/lib/p05";
import { STATUS_LABEL, type ProfileStatus, type SkillEntry, type Term } from "@/lib/p01";

export const fmt = (iso: string | null): string => {
  if (!iso) return "not given";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
};
export const now = () => new Date().toISOString();

const TONE = {
  draft: "gray",
  submitted: "blue",
  clarification_requested: "amber",
  reviewed: "green",
} as const satisfies Record<ProfileStatus, string>;

export function StatusChip({ status }: { status: ProfileStatus }) {
  return <Status tone={TONE[status]}>{STATUS_LABEL[status]}</Status>;
}

export function Panel({
  id,
  title,
  note,
  children,
  className = "",
}: {
  id?: string;
  title: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className={`min-w-0 rounded-2xl border border-border bg-card shadow-sm p-5 md:p-6 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold text-heading">{title}</h2>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export function SkillBadge({ skill, name }: { skill: SkillEntry; name: string }) {
  const reviewed = skill.source === "reviewed";
  return (
    <span className="min-w-0">
      <span className="block font-semibold text-heading">
        {name}{" "}
        <span className="font-mono text-xs font-normal text-muted-foreground">
          {skill.skill_id}
        </span>
      </span>
      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        <Status tone={reviewed ? "green" : "amber"}>
          {reviewed ? "Reviewed" : "Self-declared"}
        </Status>
        {reviewed ? (
          <span>
            {skill.evidence_id} · {skill.reviewer ?? "P06 reviewer"}, {fmt(skill.review_date)}
          </span>
        ) : skill.evidence_id ? (
          <span>{skill.evidence_id} attached, waiting for review</span>
        ) : (
          <span>no evidence yet</span>
        )}
      </span>
    </span>
  );
}

const FALLBACK_VOCAB: Term[] = DEMO_DATA.vocabulary.map((t) => ({
  skill_id: t.skill_id,
  label: t.label,
  synonyms: t.synonyms,
}));

/** The shared skill vocabulary from the class database; a built-in copy if it cannot be reached. */
export function useVocabulary(): { vocab: Term[]; live: boolean } {
  const [state, setState] = useState<{ vocab: Term[]; live: boolean }>({
    vocab: FALLBACK_VOCAB,
    live: false,
  });
  useEffect(() => {
    let on = true;
    getSkills()
      .then((rows) => {
        if (on && rows.length)
          setState({
            vocab: rows.map(({ skill_id, label, synonyms }) => ({
              skill_id,
              label,
              synonyms: synonyms ?? [],
            })),
            live: true,
          });
      })
      .catch(() => {
        /* keeps the built-in copy */
      });
    return () => {
      on = false;
    };
  }, []);
  return state;
}

export const skillName = (vocab: readonly Term[], id: string) =>
  vocab.find((t) => t.skill_id === id)?.label ?? id;
