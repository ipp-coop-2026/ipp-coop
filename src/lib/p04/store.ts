/**
 * P04 browser store, under its own localStorage key beside Launchpad's. Students, listings and
 * companies are read from Launchpad (P02); P04 keeps only internships, reports, meetings, slots,
 * grades and supervisor feedback. All records are synthetic.
 */
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { COMPANIES } from "@/lib/p02/data";
import { studentById, useLaunchpad, type LaunchpadState } from "@/lib/p02/store";
import { syncPlacements } from "./rules";
import { seedP04 } from "./seed";
import type { Directory, P04State, Result } from "./types";

export const P04_KEY = "ipp-p04-faculty-v1";

let cache: P04State | null = null;
const listeners = new Set<() => void>();

const valid = (x: unknown): x is P04State => {
  const s = x as P04State | null;
  return (
    !!s &&
    s.version === 1 &&
    ["internships", "reports", "slots", "meetings", "grades", "hr"].every((k) =>
      Array.isArray((s as unknown as Record<string, unknown>)[k]),
    )
  );
};

function load(): P04State {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(P04_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    cache = valid(parsed) ? parsed : seedP04();
  } catch {
    cache = seedP04();
  }
  return cache;
}

function save(s: P04State) {
  cache = s;
  try {
    window.localStorage.setItem(P04_KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: keep the in-memory copy */
  }
  listeners.forEach((l) => l());
}

export const getP04 = (): P04State => load();

/** Applies a rules action. Saves the new state when it worked and returns the result for the page. */
export function run(action: (s: P04State) => Result): Result {
  const r = action(load());
  if (r.ok) save(r.state);
  return r;
}

/** "Reset demo data": back to the seed, with dates relative to now. */
export function resetP04(): void {
  save(seedP04());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Names for P04 pages, read from Launchpad so the two never disagree. */
export function directoryFrom(lp: LaunchpadState): Directory {
  return {
    studentName: (id) => studentById(lp, id)?.name || (id === "me" ? "You (demo student)" : id),
    listing: (id) => lp.listings.find((l) => l.id === id),
    company: (id) => COMPANIES.find((c) => c.id === id),
  };
}

/**
 * P04 state plus Launchpad names. Any newly "Approved" application becomes an internship here.
 * null during server rendering and before hydration.
 */
export function useP04(): { s: P04State; lp: LaunchpadState; dir: Directory } | null {
  const s = useSyncExternalStore(subscribe, load, () => null);
  const lp = useLaunchpad();
  useEffect(() => {
    if (!s || !lp) return;
    const next = syncPlacements(
      s,
      lp.applications,
      (id) => lp.listings.find((l) => l.id === id),
      Date.now(),
    );
    if (next !== s) save(next);
  }, [s, lp]);
  const dir = useMemo(() => (lp ? directoryFrom(lp) : null), [lp]);
  return s && lp && dir ? { s, lp, dir } : null;
}
