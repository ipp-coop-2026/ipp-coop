import { Link, useRouterState } from "@tanstack/react-router";
import { GraduationCap, Menu, RotateCcw, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { resetDemo } from "@/lib/ipp-store";
import { resetStudent } from "@/lib/p02/student-store";

/*
 * App frame copied from Team 2's Launchpad prototype (agreed UI base, 23 Nov 2026): a white header with the
 * brand, Profile / Opportunities / My Applications (plus Admin Review in admin view), a "View as" Student |
 * Admin switch, then the page, then the footer. Other teams' pages (/matches, /desk, /admin, /employer,
 * /faculty, /p05/coordinator, /faq) still work by URL; they get a place in this header once the teams agree how.
 */

type NavItem = { to: string; label: string };
export type Mode = "student" | "admin";

const STUDENT_NAV: NavItem[] = [
  { to: "/profile", label: "Profile" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/applications", label: "My Applications" },
];
const ADMIN_NAV: NavItem[] = [...STUDENT_NAV, { to: "/admin/applications", label: "Admin Review" }];

const MODE_KEY = "ipp-view-as";

/** Admin pages switch to admin view, student pages to student view; shared pages keep the last view. */
export function modeForPath(path: string, last: Mode = "student"): Mode {
  if (path.startsWith("/admin") || path.startsWith("/p05")) return "admin";
  if (["/profile", "/opportunities", "/applications", "/matches"].some((p) => path.startsWith(p)))
    return "student";
  return last;
}

function useMode(path: string): Mode {
  const [last, setLast] = useState<Mode>("student");
  useEffect(() => {
    try {
      if (window.localStorage.getItem(MODE_KEY) === "admin") setLast("admin");
    } catch {
      /* storage blocked */
    }
  }, []);
  const mode = modeForPath(path, last);
  useEffect(() => {
    try {
      window.localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);
  return mode;
}

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const mode = useMode(path);
  const nav = mode === "admin" ? ADMIN_NAV : STUDENT_NAV;
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [path]);

  const isActive = (to: string) =>
    to === "/admin" ? path === "/admin" : path === to || path.startsWith(`${to}/`);
  const onReset = () => {
    if (
      window.confirm(
        "Reset demo data? Records in this browser go back to the original synthetic seed.",
      )
    ) {
      resetDemo();
      resetStudent();
    }
  };

  const toggle = (
    <div
      role="group"
      aria-label="View as"
      className="flex rounded-full border border-border bg-muted p-0.5"
    >
      {(
        [
          ["student", "Student", "/opportunities"],
          ["admin", "Admin", "/admin/applications"],
        ] as const
      ).map(([m, label, to]) => (
        <Link
          key={m}
          to={to}
          aria-pressed={mode === m}
          className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${focus} ${
            mode === m
              ? "bg-card text-heading shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
          <Link to="/" className={`flex shrink-0 items-center gap-2.5 rounded-lg ${focus}`}>
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-lg bg-heading text-white"
            >
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-heading">IPP</span>
              <span className="block text-xs text-muted-foreground">
                Co-op Internship Practicum
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                aria-current={isActive(n.to) ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${focus} ${
                  isActive(n.to)
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              View as
            </span>
            {toggle}
          </div>

          <button
            type="button"
            className={`ml-auto rounded-lg border border-border p-2 md:hidden ${focus}`}
            aria-expanded={menu}
            aria-controls="mobile-menu"
            onClick={() => setMenu((m) => !m)}
          >
            {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>

        {menu && (
          <div
            id="mobile-menu"
            className="max-h-[75vh] overflow-y-auto border-t border-border bg-card px-4 py-3 md:hidden"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                View as
              </span>
              {toggle}
            </div>
            <nav aria-label="Main" className="mb-3 flex flex-col">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`rounded-lg px-2 py-2 text-sm font-medium ${focus} ${isActive(n.to) ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main
        id="main"
        className={`mx-auto w-full flex-1 px-4 pb-24 pt-8 md:px-6 md:pt-10 ${wide ? "max-w-6xl" : "max-w-5xl"}`}
      >
        {children}
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm md:px-6">
          <div>
            <p className="font-medium text-heading">IPP | Sprint 3 | All groups</p>
            <p className="text-xs text-muted-foreground">
              Co-op Internship Practicum Platform · University demo prototype
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground ${focus}`}
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Reset demo data
          </button>
        </div>
      </footer>
    </div>
  );
}

/** Page title in Team 2's style: a small step label, a navy title and one plain sentence. */
export function PageHeader({
  title,
  subtitle,
  step,
}: {
  title: string;
  subtitle: string;
  step?: string;
}) {
  return (
    <div className="mb-8">
      {step && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">{step}</p>
      )}
      <h1 className="text-3xl font-extrabold tracking-tight text-heading md:text-4xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-base text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-bold text-heading">{title}</h2>
      <div className="text-sm text-card-foreground">{children}</div>
    </section>
  );
}

type Tone = "green" | "amber" | "blue" | "red" | "gray";
const TONES: Record<Tone, string> = {
  green: "bg-status text-status-foreground",
  amber: "bg-warn text-warn-foreground",
  blue: "bg-sent text-sent-foreground",
  red: "bg-danger text-danger-foreground",
  gray: "bg-muted text-muted-foreground",
};

/** Picks the colour from the word, so every page uses the same colour for the same state. */
export function toneFor(text: string): Tone {
  const t = text.toLowerCase();
  if (/(reject|declin|urgent|not eligible)/.test(t)) return "red";
  if (/(closed|withdrawn|not placed|not now|draft|shortlist)/.test(t)) return "gray";
  if (/(approved|published|open|answered|accepted|can apply|resolved|placed|eligible)/.test(t))
    return "green";
  if (/(submitted|sent|career services|resubmitted)/.test(t)) return "blue";
  if (/(pending|waiting|change|shortlist|ready|review|one thing|interview)/.test(t)) return "amber";
  return "green";
}

export function Status({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const t = tone ?? (typeof children === "string" ? toneFor(children) : "green");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[t]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-3 text-muted-foreground">
      {children}
    </p>
  );
}
