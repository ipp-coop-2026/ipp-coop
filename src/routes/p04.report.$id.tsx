import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AiPanel } from "@/components/p04/AiPanel";
import {
  Facts,
  Field,
  FlashBar,
  HistoryList,
  Loading,
  P04Header,
  P04Status,
  Panel,
  focus,
  inputCls,
  primaryBtn,
  quietBtn,
  type Flash,
} from "@/components/p04/ui";
import {
  FACULTY_ACTOR,
  fmtDate,
  fmtDateTime,
  internshipById,
  reportAction,
  reportById,
  reportStatus,
  run,
  useP04,
} from "@/lib/p04";
import { ReportBody } from "@/components/p04/ReportBody";

export const Route = createFileRoute("/p04/report/$id")({
  head: () => ({ meta: [{ title: "Report review · Faculty review · IPP" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  const d = useP04();
  const [comment, setComment] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [flash, setFlash] = useState<Flash>(null);
  const now = Date.now();
  const r = d ? reportById(d.s, id) : undefined;
  const p = d && r ? internshipById(d.s, r.internshipId) : undefined;

  const act = (action: "review" | "requestChanges") => {
    const res = run((s) => reportAction(s, id, action, FACULTY_ACTOR, Date.now(), { comment }));
    setErr(!res.ok && res.errors ? res.errors["comment"] : undefined);
    setFlash({ ok: res.ok, msg: res.msg });
    if (res.ok) setComment("");
  };

  return (
    <AppShell wide>
      {p && (
        <Link to="/p04/internship/$id" params={{ id: p.id }} hash="reports" className={`mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline ${focus}`}>
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to the internship
        </Link>
      )}
      {!d ? (
        <Loading />
      ) : !r || !p ? (
        <P04Header title="Report not found" subtitle={`There is no report ${id}.`} />
      ) : (
        <>
          <P04Header
            title={`Report ${r.number}: ${d.dir.studentName(p.studentId)}`}
            subtitle={`${d.dir.listing(p.listingId)?.title ?? ""} at ${d.dir.company(p.companyId)?.name ?? ""} · period ${fmtDate(r.periodStart)} – ${fmtDate(r.due)}`}
            actions={
              <span className="inline-flex gap-1">
                <P04Status>{reportStatus(d.s, r, now)}</P04Status>
                {r.late && <P04Status>Late</P04Status>}
              </span>
            }
          />
          <FlashBar flash={flash} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <AiPanel kind="summary" id={r.id} s={d.s} dir={d.dir} now={now} />
              <Panel>
                <h2 className="mb-4 text-base font-bold">The report</h2>
                {r.content ? <ReportBody c={r.content} attachment={r.attachment} /> : <p className="text-sm text-muted-foreground">Not submitted yet.</p>}
              </Panel>
              {r.versions.length > 0 && (
                <Panel>
                  <h2 className="mb-3 text-base font-bold">Earlier versions</h2>
                  {r.versions.map((v) => (
                    <details key={v.version} className="mb-2 text-sm">
                      <summary className="cursor-pointer font-medium text-heading">
                        Version {v.version}, sent {fmtDateTime(v.submittedAt)}
                      </summary>
                      {v.facultyComment && <p className="my-2 text-muted-foreground">Your comment then: {v.facultyComment}</p>}
                      <ReportBody c={v.content} attachment={v.attachment} />
                    </details>
                  ))}
                </Panel>
              )}
            </div>
            <div className="space-y-4">
              <Panel>
                <h2 className="mb-3 text-base font-bold">Details</h2>
                <Facts
                  rows={[
                    ["Due", fmtDate(r.due)],
                    ["First sent", r.submittedAt ? fmtDateTime(r.submittedAt) : "–"],
                    ["Last sent", r.lastSubmittedAt ? fmtDateTime(r.lastSubmittedAt) : "–"],
                    ["Version", String(r.versions.length + 1)],
                  ]}
                />
                {r.facultyComment && (
                  <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="font-medium text-heading">Your comment:</span> {r.facultyComment}
                  </p>
                )}
              </Panel>
              {reportStatus(d.s, r, now) === "Submitted" && (
                <Panel>
                  <h2 className="mb-3 text-base font-bold">Your review</h2>
                  <Field id="rev-comment" label="Comment to the student" hint="Optional when you mark it reviewed. Needed when you ask for changes." error={err}>
                    <textarea id="rev-comment" rows={4} className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={primaryBtn} onClick={() => act("review")}>
                      Mark reviewed
                    </button>
                    <button type="button" className={quietBtn} onClick={() => act("requestChanges")}>
                      Request changes
                    </button>
                  </div>
                </Panel>
              )}
              <Panel>
                <h2 className="mb-3 text-base font-bold">History</h2>
                <HistoryList items={r.history} />
              </Panel>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
