import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  GraduationCap,
  MapPin,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Chip,
  companyName,
  focus,
  fmtDate,
  Meta,
  ModeBadge,
  Panel,
  primaryBtn,
  RoleGate,
  TypeBadge,
} from "@/components/p02/ui";
import { apply, commit, ME, useLaunchpad } from "@/lib/p02/store";

export const Route = createFileRoute("/opportunities/$id")({
  head: () => ({ meta: [{ title: "Placement · IPP" }] }),
  component: ListingPage,
});

function ListingPage() {
  const { id } = Route.useParams();
  const lp = useLaunchpad();
  const [error, setError] = useState("");
  const listing = lp?.listings.find((l) => l.id === id && l.status === "Approved");
  const applied = lp?.applications.find((a) => a.studentId === ME && a.listingId === id);

  return (
    <AppShell>
      <RoleGate need="student" view={lp?.view}>
        <div className="mx-auto max-w-3xl">
          <Link
            to="/opportunities"
            className={`mb-5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground ${focus}`}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All opportunities
          </Link>
          {!lp ? null : !listing ? (
            <Panel>
              <h1 className="text-xl font-bold">This placement is not open</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                It may have been closed or is waiting for admin approval.
              </p>
            </Panel>
          ) : (
            <>
              <Panel>
                <div className="flex items-start justify-between gap-3">
                  <Meta icon={Building2}>{companyName(listing.companyId)}</Meta>
                  <div className="flex gap-1.5">
                    <TypeBadge type={listing.type} />
                    <ModeBadge mode={listing.mode} />
                  </div>
                </div>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">
                  {listing.title}
                </h1>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                  <Meta icon={MapPin}>{listing.city}</Meta>
                  <Meta icon={Clock}>{listing.duration}</Meta>
                  <Meta icon={GraduationCap}>Minimum year {listing.minYear}</Meta>
                  <Meta icon={CalendarDays}>
                    Apply by{" "}
                    {fmtDate(listing.deadline, { day: "numeric", month: "long", year: "numeric" })}
                  </Meta>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {listing.required.map((s) => (
                    <Chip key={s}>{s}</Chip>
                  ))}
                </div>
                <hr className="my-6 border-border" />
                <h2 className="text-base font-bold">About the placement</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {listing.description}
                </p>
                <h2 className="mt-6 text-base font-bold">Requirements</h2>
                <ul className="mt-2 space-y-1.5">
                  {listing.requirements.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm">
                      <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{" "}
                      {r}
                    </li>
                  ))}
                </ul>
              </Panel>

              <div className="mt-5" aria-live="polite">
                {applied ? (
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
                ) : !lp.profile ? (
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
                        {lp.profile.name}'s profile is shared with {companyName(listing.companyId)}.
                        Applying does not confirm a placement.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={primaryBtn}
                      onClick={() => {
                        try {
                          commit((s) => apply(s, listing.id));
                          setError("");
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "The application was not sent.",
                          );
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
      </RoleGate>
    </AppShell>
  );
}
