import { ChevronDown, Layers } from "lucide-react";
import { useState } from "react";
import { focus } from "@/components/p02/ui";
import { DEMO_STUDENT_ID } from "@/lib/ipp-store";
import { P05Matches } from "./P05Matches";

/**
 * Team 5 (P05) matching engine as an optional, collapsed panel under Group 2's recommendations.
 * Nothing loads until it is opened; it reads the shared database (demo slice when offline).
 */
export function P05Panel() {
  const [open, setOpen] = useState(false);
  return (
    <section className="mb-6 rounded-xl border border-border bg-card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium ${focus}`}
      >
        <span className="inline-flex items-center gap-1.5">
          <Layers aria-hidden="true" className="h-4 w-4 text-primary" /> Compare with Team 5's
          matching engine (P05) · shared database, rules or AI
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-4">
          <P05Matches studentId={DEMO_STUDENT_ID} />
        </div>
      )}
    </section>
  );
}
