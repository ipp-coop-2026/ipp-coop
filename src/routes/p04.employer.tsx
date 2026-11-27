import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HrForm, HrList } from "@/components/p04/Feedback";
import { FlashBar, Loading, P04Header, P04Status, Panel, focus, primaryBtn, type Flash } from "@/components/p04/ui";
import { FACULTY, fmtDate, gradeOf, hrOf, internshipStatus, useP04, type Actor, type Result } from "@/lib/p04";

export const Route = createFileRoute("/p04/employer")({
  head: () => ({ meta: [{ title: "Intern feedback · Faculty review · IPP" }] }),
  component: EmployerFeedbackPage,
});

function EmployerFeedbackPage() {
  const d = useP04();
  const now = Date.now();
  const [pickCo, setPickCo] = useState<string | null>(null);
  const [form, setForm] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash>(null);
  const companies = d ? [...new Set(d.s.internships.map((p) => p.companyId))] : [];
  const companyId = pickCo ?? (d && companies.includes(d.lp.companyId) ? d.lp.companyId : companies[0]) ?? null;
  const co = d && companyId ? d.dir.company(companyId) : undefined;

  const done = (r: Result) => {
    if (r.ok || !r.msg) setForm(null);
    if (r.msg) setFlash({ ok: r.ok, msg: r.msg });
  };

  return (
    <AppShell wide>
      <P04Header
        title="Intern feedback"
        subtitle={`Tell the faculty advisor, ${FACULTY.name}, how your intern is doing. Your feedback goes to faculty only; the student does not see it.`}
      />
      {!d ? (
        <Loading />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Viewing as:</span>
            <div role="group" aria-label="Employer" className="flex flex-wrap rounded-full border border-border bg-muted p-0.5">
              {companies.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={companyId === id}
                  onClick={() => {
                    setPickCo(id);
                    setForm(null);
                    setFlash(null);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${focus} ${companyId === id ? "bg-card text-heading shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {d.dir.company(id)?.name ?? id}
                </button>
              ))}
            </div>
          </div>
          <FlashBar flash={flash} />
          {!co || !companyId ? (
            <Panel className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No interns yet. Interns appear here once an application is approved.</p>
            </Panel>
          ) : (
            (() => {
              const actor: Actor = { role: "Employer HR", name: co.hr, companyId };
              const mine = d.s.internships.filter((p) => p.companyId === companyId);
              return (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Signed in as {co.hr}, workplace supervisor (HR) at {co.name}.
                  </p>
                  {mine.map((p) => {
                    const st = internshipStatus(d.s, p, now);
                    const list = hrOf(d.s, p.id);
                    const last = list[list.length - 1];
                    const canAdd = st !== "Not started" && !gradeOf(d.s, p.id);
                    return (
                      <Panel key={p.id}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h2 className="text-base font-bold text-heading">{d.dir.studentName(p.studentId)}</h2>
                            <p className="text-sm text-muted-foreground">
                              {d.dir.listing(p.listingId)?.title} · {fmtDate(p.start)} – {fmtDate(p.end)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <P04Status>{st}</P04Status>
                            {last && <P04Status>{last.rating}</P04Status>}
                            {canAdd && form !== p.id && (
                              <button type="button" className={primaryBtn} onClick={() => { setForm(p.id); setFlash(null); }}>
                                Add feedback
                              </button>
                            )}
                            {!canAdd && <span className="text-xs text-muted-foreground">{st === "Not started" ? "Opens at the start" : "Closed after grading"}</span>}
                          </div>
                        </div>
                        {form === p.id && <HrForm internshipId={p.id} studentName={d.dir.studentName(p.studentId)} actor={actor} onDone={done} />}
                        <h3 className="mb-2 mt-4 text-sm font-bold">Feedback sent ({list.length})</h3>
                        <HrList items={list} />
                      </Panel>
                    );
                  })}
                </div>
              );
            })()
          )}
        </>
      )}
    </AppShell>
  );
}
