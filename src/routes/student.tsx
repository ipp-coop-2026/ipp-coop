import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { Search, MapPin, Clock, Briefcase } from "lucide-react";
import { AppShell, Card, PageHeader, Status } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { P05Matches } from "@/components/p05/P05Matches";
import { DEMO_STUDENT_ID, PLACEMENT_STATUS, saveData, searchApprovedOpportunities, submitApplication, updateStudentDisplayName, useIppData, type Student } from "@/lib/ipp-store";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student opportunities & applications · IPP" },
      { name: "description", content: "Browse approved internships, submit demo applications and maintain your IPP student profile." },
      { property: "og:title", content: "Student opportunities & applications · IPP" },
      { property: "og:description", content: "Browse approved internships, submit demo applications and maintain your IPP student profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentPage,
});

function StudentPage() {
  const data = useIppData();
  const student = data?.students.find((s) => s.student_id === DEMO_STUDENT_ID);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [applicationError, setApplicationError] = useState("");
  const lastOpenedId = useRef<string | null>(null);
  // Radix can't restore focus (no Dialog.Trigger), so return it to the card's button, or its status once applied.
  const restoreFocus = (e: Event) => {
    e.preventDefault();
    const id = lastOpenedId.current;
    if (!id) return;
    requestAnimationFrame(() => {
      (document.getElementById(`apply-${id}`) ?? document.getElementById(`applied-${id}`))?.focus();
    });
  };
  const approved = data ? searchApprovedOpportunities(data, "") : [];
  const matches = data ? searchApprovedOpportunities(data, query) : [];
  const applications = data?.applications.filter((a) => a.student_id === DEMO_STUDENT_ID) ?? [];
  const appliedIds = new Set(applications.map((a) => a.opportunity_id));
  const selected = data?.opportunities.find((o) => o.opportunity_id === selectedId);
  const organization = (employerId: string) => data?.employers.find((e) => e.employer_id === employerId)?.organization_name ?? employerId;

  const confirmApplication = () => {
    if (!data || !student || !selected) return;
    try {
      const updated = submitApplication(data, selected.opportunity_id, student.student_id);
      saveData(updated);
      setMessage(`Application ${updated.applications.at(-1)?.application_id} submitted for ${selected.title}. This does not approve a placement.`);
      setSelectedId(null);
      setApplicationError("");
    } catch (error) {
      setApplicationError(error instanceof Error ? error.message : "Your application could not be submitted.");
    }
  };

  return (
    <AppShell>
      <PageHeader title="Student" subtitle={`Simulated as ${DEMO_STUDENT_ID}${student ? ` · ${student.display_name}` : ""}. Submitting an application does not approve a placement.`} />
      {!data ? <p role="status">Loading student workspace…</p> : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card title="Open opportunities"><p className="text-2xl font-semibold text-primary">{approved.length}</p></Card>
            <Card title="My applications"><p className="text-2xl font-semibold text-primary">{applications.length}</p></Card>
            <Card title="Profile eligibility"><Status>{student?.eligibility_status ?? "Profile unavailable"}</Status></Card>
          </div>
          {message && <p role="status" className="mb-4 rounded-lg bg-status p-3 text-sm text-status-foreground">{message}</p>}
          <Tabs defaultValue="opportunities">
            <TabsList aria-label="Student workspace" className="mb-4 grid h-auto w-full grid-cols-2 sm:inline-flex sm:w-auto">
              <TabsTrigger value="opportunities" className="px-2 py-2 text-xs sm:px-3 sm:text-sm">Opportunities</TabsTrigger>
              <TabsTrigger value="recommended" className="px-2 py-2 text-xs sm:px-3 sm:text-sm">Recommended</TabsTrigger>
              <TabsTrigger value="applications" className="px-2 py-2 text-xs sm:px-3 sm:text-sm">My applications</TabsTrigger>
              <TabsTrigger value="profile" className="px-2 py-2 text-xs sm:px-3 sm:text-sm">My profile</TabsTrigger>
            </TabsList>
            <TabsContent value="opportunities">
              <div className="mb-5 max-w-lg">
                <Label htmlFor="opportunity-search">Search by title or organization</Label>
                <div className="relative mt-2">
                  <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="opportunity-search" type="search" className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title or organization" />
                </div>
              </div>
              {matches.length === 0 ? <p role="status" className="py-6 text-muted-foreground">{query.trim() ? "No approved opportunities match your search." : "No approved opportunities are available yet."}</p> : (
                <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {matches.map((o) => (
                    <li key={o.opportunity_id} className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
                      <p className="break-words text-sm font-medium text-muted-foreground">{organization(o.employer_id)}</p>
                      <h2 className="mt-1 break-words text-lg font-semibold text-primary">{o.title}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">{o.opportunity_id}</p>
                      <p className="my-4 break-words text-sm">{o.description}</p>
                      <dl className="mb-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex min-w-0 items-center gap-1.5"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0" /><dt className="sr-only">Location</dt><dd className="break-words">{o.location}</dd></div>
                        <div className="flex items-center gap-1.5"><Briefcase aria-hidden="true" className="h-4 w-4" /><dt className="sr-only">Work mode</dt><dd>{o.work_mode}</dd></div>
                        <div className="flex min-w-0 items-center gap-1.5"><Clock aria-hidden="true" className="h-4 w-4 shrink-0" /><dt className="sr-only">Duration</dt><dd className="break-words">{o.duration}</dd></div>
                      </dl>
                      <div className="mt-auto">
                        {appliedIds.has(o.opportunity_id) ? <span id={`applied-${o.opportunity_id}`} tabIndex={-1} className="inline-block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><Status>Application submitted</Status></span> : (
                          <Button id={`apply-${o.opportunity_id}`} disabled={!student} onClick={() => { lastOpenedId.current = o.opportunity_id; setSelectedId(o.opportunity_id); setApplicationError(""); }}>View &amp; apply</Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="recommended">
              <P05Matches studentId={DEMO_STUDENT_ID} />
            </TabsContent>
            <TabsContent value="applications">
              <h2 className="mb-4 text-lg font-semibold text-primary">My applications</h2>
              <p className="mb-4 text-sm text-muted-foreground">Submitting an application does not approve a placement.</p>
              {applications.length === 0 ? <p className="py-6 text-muted-foreground">You have not submitted any applications yet.</p> : (
                <div className="max-w-full overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-muted-foreground"><tr><th className="p-3">Application ID</th><th className="p-3">Opportunity</th><th className="p-3">Organization</th><th className="p-3">Application status</th><th className="p-3">Placement status</th></tr></thead>
                    <tbody>{applications.map((a) => {
                      const opportunity = data.opportunities.find((o) => o.opportunity_id === a.opportunity_id);
                      return <tr key={a.application_id} className="border-b border-border"><td className="p-3">{a.application_id}</td><td className="p-3"><div className="font-medium">{opportunity?.title ?? a.opportunity_id}</div><div className="text-xs text-muted-foreground">{a.opportunity_id}</div></td><td className="p-3">{opportunity ? organization(opportunity.employer_id) : "Unavailable"}</td><td className="p-3"><Status>{a.application_status}</Status></td><td className="p-3"><Status>{PLACEMENT_STATUS}</Status></td></tr>;
                    })}</tbody>
                  </table>
                </div>
              )}
            </TabsContent>
            <TabsContent value="profile">
              {student ? <ProfileForm key={`${student.student_id}:${student.display_name}`} student={student} onSaved={() => setMessage("Your demo profile was saved.")} /> : <p>Student profile was not found.</p>}
            </TabsContent>
          </Tabs>
        </>
      )}
      <Dialog open={!!selectedId} onOpenChange={(open) => { if (!open) { setSelectedId(null); setApplicationError(""); } }}>
        <DialogContent onCloseAutoFocus={restoreFocus} className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
          <DialogHeader><DialogTitle className="tracking-normal text-primary">Confirm application</DialogTitle><DialogDescription>Submitting an application does not approve a placement. Placement status remains “Not placed”.</DialogDescription></DialogHeader>
          {selected && student && <dl className="space-y-4 text-sm">
            <div><dt className="font-medium text-muted-foreground">Opportunity</dt><dd className="mt-1 break-words font-semibold">{selected.title}</dd><dd className="break-words">{organization(selected.employer_id)} · {selected.opportunity_id}</dd></div>
            <div><dt className="font-medium text-muted-foreground">Applicant</dt><dd className="mt-1 break-words">{student.display_name} · {student.student_id}</dd></div>
          </dl>}
          {applicationError && <p role="alert" className="text-sm text-destructive">{applicationError}</p>}
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setSelectedId(null)}>Cancel</Button><Button onClick={confirmApplication} disabled={!student || !selected}>Confirm application</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ProfileForm({ student, onSaved }: { student: Student; onSaved: () => void }) {
  const data = useIppData();
  const [name, setName] = useState(student.display_name);
  const [error, setError] = useState("");
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!data) return;
    try {
      saveData(updateStudentDisplayName(data, student.student_id, name));
      setError("");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your profile could not be saved.");
    }
  };
  return <form onSubmit={onSubmit} noValidate className="max-w-lg space-y-5">
    <h2 className="text-lg font-semibold text-primary">My profile</h2>
    <div><Label htmlFor="student-id">Student ID</Label><Input id="student-id" readOnly value={student.student_id} className="mt-2 bg-muted" /></div>
    <div><Label htmlFor="display-name">Display name</Label><Input id="display-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2" aria-invalid={!!error} aria-describedby={error ? "profile-error" : undefined} />{error && <p id="profile-error" role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div>
    <div><p className="mb-2 text-sm font-medium">Eligibility status</p><Status>{student.eligibility_status}</Status><p className="mt-2 text-sm text-muted-foreground">Eligibility verification is deferred in this demo.</p></div>
    <Button type="submit">Save profile</Button>
  </form>;
}
