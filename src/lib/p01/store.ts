import { useSyncExternalStore } from "react";
import { makeP01Seed } from "./seed";
import type { P01State } from "./types";

/** P01 records live in this browser until Team 1 writes to the shared database (docs/ARCHITECTURE.md, stage 3). */
export const P01_KEY = "ipp-p01-v1";

let cache: P01State | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function parse(raw: string | null): P01State | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as P01State;
    return Array.isArray(s.versions) && s.versions.length > 0 && Array.isArray(s.evidence)
      ? s
      : null;
  } catch {
    return null;
  }
}

function read(): P01State {
  if (cache) return cache;
  try {
    cache = parse(window.localStorage.getItem(P01_KEY));
  } catch {
    cache = null;
  }
  return (cache ??= makeP01Seed());
}

export function setP01(next: P01State) {
  cache = next;
  try {
    window.localStorage.setItem(P01_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked; the page still works until it is closed.
  }
  emit();
}

/** Runs a rule on the newest state, including changes made in another tab since this page last drew. */
export function updateP01(rule: (s: P01State) => P01State): P01State {
  try {
    const stored = parse(window.localStorage.getItem(P01_KEY));
    if (stored) cache = stored;
  } catch {
    // Ignore blocked storage.
  }
  const next = rule(read());
  setP01(next);
  return next;
}

export const resetP01 = () => setP01(makeP01Seed());

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== P01_KEY && e.key !== null) return;
    cache = null;
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** Null while rendering on the server. */
export function useP01(): P01State | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
