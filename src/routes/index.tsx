import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Chip, focus, KindBadge, Meta, primaryBtn } from "@/components/p02/ui";
import { loadListings, type Listing } from "@/lib/p02/listings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IPP – Co-op Internship Practicum Platform" },
      {
        name: "description",
        content: "Build a profile, browse verified co-op placements, apply and follow your review.",
      },
      { property: "og:title", content: "IPP – Co-op Internship Practicum Platform" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

const STEPS = [
  {
    icon: UserRoundPlus,
    title: "Create profile",
    text: "Add your major, skills and a short bio so companies know who you are.",
  },
  {
    icon: Search,
    title: "Browse",
    text: "Explore co-op placements in Abu Dhabi, Dubai and beyond.",
  },
  {
    icon: Send,
    title: "Apply",
    text: "One click to submit an application to a placement you like.",
  },
  {
    icon: ShieldCheck,
    title: "Get reviewed",
    text: "Track your status from submitted to approved.",
  },
];

function Home() {
  const [featured, setFeatured] = useState<Listing | null>(null);
  useEffect(() => {
    void loadListings().then((s) => {
      setFeatured(s.listings.find((l) => l.skills.length >= 2) ?? s.listings[0] ?? null);
    });
  }, []);

  return (
    <AppShell wide>
      <section className="grid items-center gap-12 pb-16 pt-8 md:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-primary/30 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            Group 2 · Launchpad
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-heading md:text-[3.25rem]">
            Find your co-op internship
          </h1>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-muted-foreground">
            IPP is the practicum platform for university students. Build a profile, browse verified
            placements, apply in a single click and follow your review — all in one calm, simple
            place.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link to="/profile" className={`${primaryBtn} px-5 py-2.5`}>
              Get started <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link
              to="/opportunities"
              className={`text-sm font-semibold text-heading hover:underline ${focus}`}
            >
              Browse opportunities
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow">
          {featured ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Featured placement
                </p>
                <KindBadge kind={featured.kind} />
              </div>
              <h2 className="mt-2 text-xl font-bold text-heading">{featured.title}</h2>
              <p className="mt-1">
                <Meta icon={Building2}>{featured.employer}</Meta>
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Meta icon={MapPin}>{featured.city}</Meta>
                <span className="text-sm text-muted-foreground">{featured.duration}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {featured.skills.slice(0, 3).map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-muted px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Applications open</p>
                  <p className="text-sm font-semibold text-heading">Rolling intake</p>
                </div>
                <Link
                  to="/opportunities/$id"
                  params={{ id: featured.id }}
                  className={`text-sm font-semibold text-primary hover:underline ${focus}`}
                >
                  View details
                </Link>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading placements…</p>
          )}
        </div>
      </section>

      <section aria-labelledby="how" className="pb-10">
        <h2 id="how" className="text-2xl font-bold text-heading">
          How it works
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Four steps from your first login to your review outcome.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground"
                >
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-heading">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
}
