import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AppShell, Card, Grid, PageHeader, Status } from "@/components/AppShell";
import {
  addOpportunity,
  saveData,
  useIppData,
  validateOpportunity,
  WORK_MODES,
  type OpportunityInput,
} from "@/lib/ipp-store";
import {
  changesRequested,
  commitReview,
  declinedListings,
  latestChangeRequest,
  listingLabel,
  reviewItems,
  resubmit,
  useP03State,
  type Combined,
  type ReviewItem,
} from "@/lib/p03/review";

export const Route = createFileRoute("/p03/employer")({
  head: () => ({
    meta: [
      { title: "Employer HR view · IPP" },
      { name: "description", content: "Employer HR view of the Internship Practicum Platform demo." },
      { property: "og:title", content: "Employer HR view · IPP" },
      { property: "og:description", content: "Employer HR view of the Internship Practicum Platform demo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmployerPage,
});

const EMPTY: OpportunityInput = { organization_name: "", title: "", description: "", location: "", work_mode: "", duration: "" };
const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

function EmployerPage() {
  const data = useIppData();
  const p03 = useP03State();
  // P03: show the review stage (Changes Requested, Ready to publish, Closed...) instead of
  // Team 1's two-value approval_status, which reads "Pending Review" for closed listings.
  const labels =
    data && p03
      ? new Map(reviewItems({ ipp: data, p03 }).map((i) => [i.opportunity.opportunity_id, listingLabel(i.record)]))
      : null;
  const [form, setForm] = useState<OpportunityInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof OpportunityInput, string>>>({});
  const [authorized, setAuthorized] = useState(true);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const set = (k: keyof OpportunityInput, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!data || !authorized) return;
    const errs = validateOpportunity(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setConfirmation(null);
      return;
    }
    const result = addOpportunity(data, form);
    saveData(result.data);
    setConfirmation(`Opportunity ${result.opportunity.opportunity_id} was submitted and now waits for university review.`);
    setForm(EMPTY);
  };

  const field = (k: keyof OpportunityInput, label: string, textarea = false) => (
    <div>
      <label htmlFor={k} className="mb-1 block font-medium">{label}</label>
      {textarea ? (
        <textarea id={k} rows={3} className={inputCls} value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} />
      ) : (
        <input id={k} className={inputCls} value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errors[k]} />
      )}
      {errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  const employerName = (id: string) => data?.employers.find((e) => e.employer_id === id)?.organization_name ?? id;

  return (
    <AppShell>
      <PageHeader title="Employer HR" subtitle="HR authorization shown here is simulated, not real authentication." />
      <Grid>
        <Card title="Post an opportunity">
          <form onSubmit={onSubmit} noValidate className="space-y-3">
            {field("organization_name", "Organization name")}
            {field("title", "Title")}
            {field("description", "Description", true)}
            {field("location", "Location")}
            <div>
              <label htmlFor="work_mode" className="mb-1 block font-medium">Work mode</label>
              <select id="work_mode" className={inputCls} value={form.work_mode} onChange={(e) => set("work_mode", e.target.value)} aria-invalid={!!errors.work_mode}>
                <option value="">Select…</option>
                {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              {errors.work_mode && <p className="mt-1 text-xs text-destructive">{errors.work_mode}</p>}
            </div>
            {field("duration", "Duration")}
            <div className="rounded-lg border border-border bg-muted p-3">
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
                Simulate an authorized HR representative
              </label>
              <p className="mt-1 text-xs text-muted-foreground">Demo simulation only — this is not production access control.</p>
            </div>
            {!authorized && (
              <p className="text-xs text-destructive">Submission is disabled because the HR representative is not authorized (simulated).</p>
            )}
            <button type="submit" disabled={!authorized || !data} className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50">
              Submit opportunity
            </button>
            {confirmation && <p role="status" className="rounded-lg bg-status p-3 text-status-foreground">{confirmation}</p>}
          </form>
        </Card>
        <Card title="Submitted opportunities">
          <p className="mb-3 text-muted-foreground">
            Each listing shows where it is in the university review. Only "Published" listings are visible to students.
          </p>
          <ul className="space-y-2">
            {data?.opportunities.map((o) => (
              <li key={o.opportunity_id} className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0">
                <div>
                  <div className="font-medium">{o.title}</div>
                  <div className="text-xs text-muted-foreground">{employerName(o.employer_id)} · {o.opportunity_id}</div>
                </div>
                <Status>{labels?.get(o.opportunity_id) ?? o.approval_status}</Status>
              </li>
            ))}
          </ul>
        </Card>
      </Grid>
      <ChangesRequestedSection />
    </AppShell>
  );
}

// P03 hook into Team 2's stand-in: shows the coordinator's reason for each listing sent back and
// lets the employer edit the fields and resubmit as the next version (back to Pending Review).
function ChangesRequestedSection() {
  const ipp = useIppData();
  const p03 = useP03State();
  if (!ipp || !p03) return null;
  const combined: Combined = { ipp, p03 };
  const items = changesRequested(combined);
  const declined = declinedListings(combined);
  return (
    <section aria-labelledby="changes-requested-heading" className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 id="changes-requested-heading" className="mb-3 text-lg font-semibold text-primary">Listings with changes requested</h2>
      <div className="text-sm text-card-foreground">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-muted-foreground">
            No listings need changes. If the university asks for changes, they appear here with the reason.
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={`${item.opportunity.opportunity_id}-${item.record.version}`}>
                <ResubmitForm item={item} reason={latestChangeRequest(combined, item.opportunity.opportunity_id)?.reason ?? ""} ipp={ipp} />
              </li>
            ))}
          </ul>
        )}
        {declined.length > 0 && (
          <>
            <h3 className="mb-2 mt-5 font-semibold">Declined listings</h3>
            <ul className="space-y-2">
              {declined.map((item) => (
                <li key={item.opportunity.opportunity_id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium">{item.opportunity.title}</span>
                    <Status>Declined</Status>
                  </div>
                  <p className="mt-1">
                    <span className="font-medium">University's reason: </span>
                    {latestChangeRequest(combined, item.opportunity.opportunity_id)?.reason ?? ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This listing will not be published. Submit a new opportunity if the role changes.
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function ResubmitForm({ item, reason, ipp }: { item: ReviewItem; reason: string; ipp: NonNullable<ReturnType<typeof useIppData>> }) {
  const o = item.opportunity;
  const id = o.opportunity_id;
  const [form, setForm] = useState({ title: o.title, description: o.description, location: o.location, work_mode: o.work_mode as string, duration: o.duration });
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setError("");
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    try {
      commitReview(ipp, (c) => resubmit(c, id, form));
      setSent(`Opportunity ${id} was resubmitted as version ${item.record.version + 1} and now waits for university review.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not send.");
    }
  };
  const fid = (k: string) => `${id}-${k}`;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3 rounded-xl border border-border p-4" aria-label={`Resubmit ${o.title}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{o.title}</div>
          <div className="text-xs text-muted-foreground">{item.organization} · {id} · version {item.record.version}</div>
        </div>
        <Status>Changes requested</Status>
      </div>
      <p className="rounded-lg bg-warn p-3 text-warn-foreground"><span className="font-medium">Reason from the university: </span>{reason}</p>
      <div>
        <label htmlFor={fid("title")} className="mb-1 block font-medium">Title</label>
        <input id={fid("title")} className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} />
      </div>
      <div>
        <label htmlFor={fid("description")} className="mb-1 block font-medium">Description</label>
        <textarea id={fid("description")} rows={4} className={inputCls} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <label htmlFor={fid("location")} className="mb-1 block font-medium">Location</label>
        <input id={fid("location")} className={inputCls} value={form.location} onChange={(e) => set("location", e.target.value)} />
      </div>
      <div>
        <label htmlFor={fid("work_mode")} className="mb-1 block font-medium">Work mode</label>
        <select id={fid("work_mode")} className={inputCls} value={form.work_mode} onChange={(e) => set("work_mode", e.target.value)}>
          <option value="">Select…</option>
          {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={fid("duration")} className="mb-1 block font-medium">Duration</label>
        <input id={fid("duration")} className={inputCls} value={form.duration} onChange={(e) => set("duration", e.target.value)} />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <button type="submit" className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground">Resubmit for review</button>
      {sent && <p role="status" className="rounded-lg bg-status p-3 text-status-foreground">{sent}</p>}
    </form>
  );
}
