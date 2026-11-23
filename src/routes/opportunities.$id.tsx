import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  MapPin,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Chip, focus, KindBadge, Meta, Panel, primaryBtn } from "@/components/p02/ui";
import { loadListings, type Listing } from "@/lib/p02/listings";
import { applyTo, commitStudent, useStudent } from "@/lib/p02/student-store";

export const Route = createFileRoute("/opportunities/$id")({
  head: () => ({ meta: [{ title: "Placement · IPP" }] }),
  component: ListingPage,
});

function ListingPage() {
  const { id } = Route.useParams();
  const student = useStudent();
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    void loadListings().then((s) => setListing(s.listings.find((l) => l.id === id) ?? null));
  }, [id]);

  const applied = student?.applications.find((a) => a.mine && a.opportunity_id === id);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link
          to="/opportunities"
          className={`mb-5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground ${focus}`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All opportunities
        </Link>

        {listing === undefined ? (
          <Panel>
            <p className="text-sm text-muted-foreground">Loading the placement…</p>
          </Panel>
        ) : listing === null ? (
          <Panel>
            <h1 className="text-xl font-bold">This placement is not open</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              It may have been closed or withdrawn. Browse the open placements instead.
            </p>
          </Panel>
        ) : (
          <>
            <Panel>
              <div className="flex items-start justify-between gap-3">
                <Meta icon={Building2}>{listing.employer}</Meta>
                <KindBadge kind={listing.kind} />
              </div>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
                {listing.title}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <Meta icon={MapPin}>{listing.city}</Meta>
                <Meta icon={Clock}>{listing.duration}</Meta>
                <Meta icon={CalendarDays}>
                  {listing.start
                    ? `Starts ${new Date(listing.start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                    : "Rolling intake"}
                </Meta>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {listing.skills.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
              <hr className="my-6 border-border" />
              <h2 className="text-base font-bold">About the placement</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {listing.description || "The employer has not added a description yet."}
              </p>
              {listing.tasks.length > 0 && (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {listing.tasks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
              {listing.requirements.length > 0 && (
                <>
                  <h2 className="mt-6 text-base font-bold">Requirements</h2>
                  <ul className="mt-2 space-y-1.5">
                    {listing.requirements.map((r) => (
                      <li key={r} className="flex items-start gap-2 text-sm">
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        />{" "}
                        {r}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {listing.niceToHave.length > 0 && (
                <>
                  <h2 className="mt-6 text-base font-bold">Nice to have</h2>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {listing.niceToHave.map((r) => (
                      <li key={r}>
                        <Chip>{r}</Chip>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>

            <div className="mt-5" aria-live="polite">
              {!student ? null : applied ? (
                <Panel className="flex items-start gap-3 border-status-foreground/20 bg-status">
                  <CircleCheck
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 text-status-foreground"
                  />
                  <div>
                    <h2 className="text-base font-bold text-status-foreground">
                      You applied to this placement
                    </h2>
                    <p className="text-sm text-status-foreground">
                      Status: {applied.status}.{" "}
                      <Link to="/applications" className={`font-semibold underline ${focus}`}>
                        See my applications
                      </Link>
                    </p>
                  </div>
                </Panel>
              ) : !student.profile ? (
                <Panel className="flex items-start gap-3 border-warn-foreground/20 bg-warn">
                  <UserRound aria-hidden="true" className="mt-0.5 h-5 w-5 text-warn-foreground" />
                  <div>
                    <h2 className="text-base font-bold text-warn-foreground">
                      Create your profile first
                    </h2>
                    <p className="text-sm text-warn-foreground">
                      We share your profile with the company when you apply, so add your details
                      before applying to this placement.
                    </p>
                    <Link to="/profile" className={`mt-3 ${primaryBtn}`}>
                      Create profile
                    </Link>
                  </div>
                </Panel>
              ) : (
                <Panel className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold">Ready to apply?</h2>
                    <p className="text-sm text-muted-foreground">
                      {student.profile.fullName}'s profile is shared with {listing.employer}.
                      Applying does not confirm a placement.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={primaryBtn}
                    onClick={() => {
                      try {
                        commitStudent((s) => applyTo(s, listing).state);
                        setError("");
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "The application was not sent.");
                      }
                    }}
                  >
                    Apply now
                  </button>
                  {error && (
                    <p role="alert" className="w-full text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </Panel>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
