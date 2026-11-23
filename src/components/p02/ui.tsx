import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Clock, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import type { Listing } from "@/lib/p02/listings";

export const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
export const primaryBtn = `inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
export const quietBtn = `inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${focus}`;
export const inputCls = `w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground/70 ${focus}`;

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  const pad = /(^|\s)p[xy]?-\d/.test(className) ? "" : "p-6";
  return (
    <section className={`rounded-2xl border border-border bg-card shadow-sm ${pad} ${className}`}>
      {children}
    </section>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-chip px-2 py-0.5 text-xs font-medium text-chip-foreground">
      {children}
    </span>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${kind === "Co-op" ? "bg-accent text-accent-foreground" : "bg-sent text-sent-foreground"}`}
    >
      {kind}
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
        <Meta icon={Building2}>{l.employer}</Meta>
        <KindBadge kind={l.kind} />
      </div>
      <h3 className="mt-1 text-base font-bold text-heading">{l.title}</h3>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <Meta icon={MapPin}>{l.city}</Meta>
        <Meta icon={Clock}>{l.duration}</Meta>
      </div>
      {l.description && (
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{l.description}</p>
      )}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <div className="flex flex-wrap gap-1.5">
          {l.skills.slice(0, 3).map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </div>
        <Link
          to="/opportunities/$id"
          params={{ id: l.id }}
          className={`inline-flex shrink-0 items-center gap-1 rounded-md text-sm font-semibold text-primary hover:underline ${focus}`}
          aria-label={`View ${l.title} at ${l.employer}`}
        >
          View <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
        </Link>
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

export function SourceNote({
  live,
  count,
  error,
}: {
  live: boolean;
  count: number;
  error?: string | undefined;
}) {
  return (
    <p className="text-xs text-muted-foreground">
      {live
        ? `${count} open listings, live from the shared co-op database`
        : `Demo listings: the shared database could not be reached${error ? ` (${error})` : ""}.`}
    </p>
  );
}
