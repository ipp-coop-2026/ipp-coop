/**
 * P04 page parts in Launchpad's look (Group 2's UI kit in src/components/p02/ui.tsx and the
 * AppShell status colours). Nothing here stores data.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Status } from "@/components/AppShell";
import { focus, inputCls, Panel } from "@/components/p02/ui";
import {
  fmtDateTime,
  monthStatus,
  monthsOf,
  fmtDate,
  type HistoryEntry,
  type Internship,
  type P04State,
} from "@/lib/p04";

export { focus, inputCls, Panel };
export { primaryBtn, quietBtn, AiBadge, EmptyState } from "@/components/p02/ui";

/** One colour per word across P04, matching AppShell's tones. */
export function P04Status({ children }: { children: string }) {
  const t = children.toLowerCase();
  const tone =
    /(missing|missed|declined|cancelled|fail|serious|needs attention)/.test(t)
      ? "red"
      : /(not yet due|not booked|not started|too early|deleted)/.test(t)
        ? "gray"
        : /(overdue|late|changes requested|waiting|some concerns|watch|held|ended)/.test(t)
          ? "amber"
          : /(^due$|submitted|requested|invited|in progress|free)/.test(t)
            ? "blue"
            : "green";
  return <Status tone={tone}>{children}</Status>;
}

const AREAS = [
  { to: "/p04", label: "Faculty", match: (p: string) => p === "/p04" || p === "/p04/" || p.startsWith("/p04/internship") || p.startsWith("/p04/report") || p.startsWith("/p04/calendar") },
  { to: "/p04/student", label: "Student", match: (p: string) => p.startsWith("/p04/student") },
  { to: "/p04/employer", label: "Employer HR", match: (p: string) => p.startsWith("/p04/employer") },
] as const;

const FACULTY_LINKS = [
  { to: "/p04", label: "Dashboard", match: (p: string) => p === "/p04" || p === "/p04/" },
  { to: "/p04/calendar", label: "Calendar", match: (p: string) => p.startsWith("/p04/calendar") },
] as const;

/** Page header with the P04 role switch ("Viewing as") and, for faculty, the two faculty pages. */
export function P04Header({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const faculty = AREAS[0].match(path);
  return (
    <div className="mb-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Faculty review · viewing as:
          </span>
          <nav aria-label="Faculty review roles" className="flex flex-wrap rounded-full border border-border bg-muted p-0.5">
            {AREAS.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                aria-current={a.match(path) ? "page" : undefined}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${focus} ${a.match(path) ? "bg-card text-heading shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {a.label}
              </Link>
            ))}
          </nav>
        </div>
        {faculty && (
          <nav aria-label="Faculty pages" className="flex gap-1">
            {FACULTY_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                aria-current={l.match(path) ? "page" : undefined}
                className={`rounded-lg px-2.5 py-1.5 text-sm font-medium ${focus} ${l.match(path) ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            Faculty review · Team 4
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-heading md:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{subtitle}</p>
        </div>
        {actions}
      </div>
    </div>
  );
}

export type Flash = { ok: boolean; msg: string } | null;

export function FlashBar({ flash }: { flash: Flash }) {
  if (!flash) return null;
  return (
    <p
      role="status"
      className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${flash.ok ? "bg-status text-status-foreground" : "bg-danger text-danger-foreground"}`}
    >
      {flash.ok ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />}
      {flash.msg}
    </p>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: [T, string][];
  value: T;
  onChange: (t: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="mb-4 flex flex-wrap gap-1 border-b border-border">
      {tabs.map(([id, text]) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${focus} ${value === id ? "border-primary text-heading" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-3">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-heading">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-danger-foreground">
          {error}
        </p>
      )}
    </div>
  );
}

/** Props for an input inside Field, so screen readers hear the error. */
export const errProps = (id: string, error?: string) =>
  error ? { "aria-invalid": true as const, "aria-describedby": `${id}-err` } : {};

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{k}</dt>
          <dd className="text-heading">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function HistoryList({ items }: { items: HistoryEntry[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No history yet.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {[...items].reverse().map((h, i) => (
        <li key={i} className="border-l-2 border-border pl-3">
          <span className="font-medium text-heading">{h.from === "(new)" ? h.to : `${h.from} → ${h.to}`}</span>
          <span className="text-muted-foreground"> · {h.by} ({h.role}) · {fmtDateTime(h.at)}</span>
          {h.note && <p className="text-muted-foreground">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}

/** Month 1…N with each month's meeting status. */
export function MonthTracker({ s, p, now }: { s: P04State; p: Internship; now: number }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Monthly meetings">
      {monthsOf(p).map((m) => (
        <li key={m.month} className="rounded-xl border border-border bg-card px-3 py-2 text-sm">
          <span className="mr-2 font-semibold text-heading">Month {m.month}</span>
          <P04Status>{monthStatus(s, p, m, now)}</P04Status>
          <span className="mt-1 block text-xs text-muted-foreground">
            {fmtDate(m.start)} – {fmtDate(new Date(Date.parse(m.end) - 86_400_000).toISOString())}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Loading() {
  return (
    <p role="status" className="text-sm text-muted-foreground">
      Loading…
    </p>
  );
}
