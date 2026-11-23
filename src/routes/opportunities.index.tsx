import { createFileRoute } from "@tanstack/react-router";
import { Search, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { EmptyState, inputCls, ListingCard, Panel, SourceNote } from "@/components/p02/ui";
import { filterListings, loadListings, type ListingSource } from "@/lib/p02/listings";

export const Route = createFileRoute("/opportunities/")({
  head: () => ({ meta: [{ title: "Opportunities · IPP" }] }),
  component: Opportunities,
});

const PAGE = 12;

function Opportunities() {
  const [src, setSrc] = useState<ListingSource | null>(null);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState("");
  const [shown, setShown] = useState(PAGE);
  useEffect(() => {
    void loadListings().then(setSrc);
  }, []);
  useEffect(() => setShown(PAGE), [q, city, kind]);

  const cities = useMemo(
    () => [...new Set((src?.listings ?? []).map((l) => l.city))].sort(),
    [src],
  );
  const hits = useMemo(
    () => filterListings(src?.listings ?? [], { q, city, kind }),
    [src, q, city, kind],
  );

  return (
    <AppShell>
      <PageHeader
        step="Step 2 of 4"
        title="Opportunities"
        subtitle="Co-op placements and internships from partner organisations across the UAE."
      />
      <Panel className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
          <label className="relative">
            <span className="sr-only">Search role, company or skill</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Search role, company or skill"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">Filter by location</span>
            <select className={inputCls} value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All locations</option>
              {cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by type</span>
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">All types</option>
              <option>Internship</option>
              <option>Co-op</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {src
              ? `${hits.length} ${hits.length === 1 ? "opportunity" : "opportunities"} found`
              : "Loading opportunities…"}
          </p>
        </div>
      </Panel>

      {src && hits.length === 0 ? (
        <EmptyState icon={SearchX} title="No opportunities match">
          Try another word, or clear the location and type filters.
        </EmptyState>
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {hits.slice(0, shown).map((l) => (
              <li key={l.id}>
                <ListingCard l={l} />
              </li>
            ))}
          </ul>
          {hits.length > shown && (
            <div className="mt-6 text-center">
              <button
                type="button"
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
                onClick={() => setShown((n) => n + PAGE)}
              >
                Show more ({hits.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
      {src && (
        <div className="mt-8 text-center">
          <SourceNote live={src.live} count={src.listings.length} error={src.error} />
        </div>
      )}
    </AppShell>
  );
}
