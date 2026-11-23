import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, CalendarDays, Clock, Lock, MapPin, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { COMPANIES, type Listing } from "@/lib/p02/data";
import type { View } from "@/lib/p02/store";

export const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
export const primaryBtn = `inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
export const quietBtn = `inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
export const inputCls = `w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 ${focus}`;

export const companyName = (id: string) => COMPANIES.find((c) => c.id === id)?.name ?? id;
export const fmtDate = (
  iso: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
) => new Date(iso).toLocaleDateString("en-GB", opts);

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  const pad = /(^|\s)p[xy]?-\d/.test(className) ? "" : "p-6";
  return (
    <section className={`rounded-2xl border border-border bg-card shadow-sm ${pad} ${className}`}>
      {children}
    </section>
  );
}

export function Chip({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "yes" | "no";
}) {
  const cls =
    tone === "yes"
      ? "bg-status text-status-foreground"
      : tone === "no"
        ? "bg-danger text-danger-foreground"
        : "bg-chip text-chip-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${type === "Co-op" ? "bg-accent text-accent-foreground" : "bg-sent text-sent-foreground"}`}
    >
      {type}
    </span>
  );
}

const PURPLE = "bg-[oklch(0.955_0.03_300)] text-[oklch(0.48_0.15_300)]";

export function ModeBadge({ mode }: { mode: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PURPLE}`}>{mode}</span>
  );
}

/** Purple marker on every AI or rules suggestion, as on Launchpad. Says which one it is. */
export function AiBadge({ model = true, children }: { model?: boolean; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${PURPLE}`}
    >
      <Sparkles aria-hidden="true" className="h-3 w-3" />
      {children ?? (model ? "AI-generated" : "Rules-based")}
    </span>
  );
}

export function Meta({ icon: Icon, children }: { icon: typeof MapPin; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export function ListingCard({ l }: { l: Listing }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Meta icon={Building2}>{companyName(l.companyId)}</Meta>
          <h3 className="mt-1 text-base font-bold text-heading">{l.title}</h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <TypeBadge type={l.type} />
          <ModeBadge mode={l.mode} />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Meta icon={MapPin}>{l.city}</Meta>
        <Meta icon={Clock}>{l.duration}</Meta>
        <span className="text-sm font-medium text-heading">Year {l.minYear}+</span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{l.summary}</p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {l.required.slice(0, 3).map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Meta icon={CalendarDays}>
            Due {fmtDate(l.deadline, { day: "numeric", month: "short" })}
          </Meta>
          <Link
            to="/opportunities/$id"
            params={{ id: l.id }}
            className={`inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary hover:underline ${focus}`}
            aria-label={`View ${l.title}`}
          >
            View <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: typeof MapPin;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Panel className="py-12 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground"
      >
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="mt-4 text-base font-bold text-heading">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </Panel>
  );
}

const GATE: Record<View, { title: string; text: string; back: { to: string; label: string } }> = {
  admin: {
    title: "Admins only",
    text: "This page belongs to the co-op coordinator. Switch to the Admin view in the top bar to review listings and applications.",
    back: { to: "/opportunities", label: "Back to opportunities" },
  },
  employer: {
    title: "Employers only",
    text: "This page belongs to the employer. Switch to the Employer view in the top bar to manage listings and applicants.",
    back: { to: "/opportunities", label: "Back to opportunities" },
  },
  student: {
    title: "Students only",
    text: "This page belongs to students. Switch to the Student view in the top bar to use it.",
    back: { to: "/", label: "Back to home" },
  },
};

/** Shows the page only in its own view, as Launchpad does. */
export function RoleGate({
  need,
  view,
  children,
}: {
  need: View;
  view: View | undefined;
  children: ReactNode;
}) {
  if (!view) return null;
  if (view === need) return <>{children}</>;
  const g = GATE[need];
  return (
    <Panel className="mx-auto mt-4 max-w-md py-10 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground"
      >
        <Lock className="h-4 w-4" />
      </span>
      <h1 className="mt-4 text-xl font-bold">{g.title}</h1>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">{g.text}</p>
      <Link to={g.back.to} className={`mt-5 ${primaryBtn}`}>
        {g.back.label}
      </Link>
    </Panel>
  );
}
