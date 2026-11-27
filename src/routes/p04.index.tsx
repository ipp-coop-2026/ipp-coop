import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, ClipboardCheck, FileText, GraduationCap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AiPanel } from "@/components/p04/AiPanel";
import { Loading, P04Header, P04Status, Panel, focus } from "@/components/p04/ui";
import {
  FACULTY,
  fmtDate,
  fmtDateTime,
  internshipById,
  internshipStatus,
  meetingStats,
  nextReport,
  pendingRequests,
  readyToGrade,
  reportStats,
  reviewQueue,
  useP04,
} from "@/lib/p04";

const TITLE = "Faculty review · P04 · IPP";
const DESCRIPTION =
  "Faculty dashboard for internships after placement: biweekly reports, monthly meetings, supervisor feedback, Pass/Fail grades and AI helpers.";

export const Route = createFileRoute("/p04/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: FacultyDashboard,
});

function FacultyDashboard() {
  const d = useP04();
  const now = Date.now();
  return (
    <AppShell wide>
      <P04Header
        title="Faculty dashboard"
        subtitle={`${FACULTY.name}, faculty advisor. Follow every intern after placement: reports every two weeks, one meeting a month and a final Pass or Fail.`}
      />
      {!d ? (
        <Loading />
      ) : (
        (() => {
          const { s, dir } = d;
          const mine = s.internships.filter((p) => p.facultyId === FACULTY.id);
          const queue = reviewQueue(s, now);
          const requests = pendingRequests(s);
          const ready = readyToGrade(s, now);
          const tiles: [string, number, typeof FileText, string][] = [
            ["Interns in progress", mine.filter((p) => internshipStatus(s, p, now) === "In progress").length, GraduationCap, "bg-sent text-sent-foreground"],
            ["Reports to review", queue.length, FileText, "bg-accent text-accent-foreground"],
            ["Meeting requests", requests.length, CalendarClock, "bg-warn text-warn-foreground"],
            ["Ready to grade", ready.length, ClipboardCheck, "bg-status text-status-foreground"],
          ];
          return (
            <>
              <ul className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
                {tiles.map(([label, n, Icon, tone]) => (
                  <li key={label} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <span aria-hidden="true" className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                      <p className="text-2xl font-extrabold text-heading">{n}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <AiPanel kind="warn" id="all" s={s} dir={dir} now={now} className="mb-6" />

              <Panel className="mb-6 p-0">
                <div className="border-b border-border px-5 py-3">
                  <h2 className="text-base font-bold">Internships</h2>
                </div>
                {mine.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-muted-foreground">
                    No internships yet. An internship starts when an employer approves an application.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">Internships</caption>
                      <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                        <tr className="border-b border-border">
                          <th scope="col" className="px-5 py-2 font-semibold">Student</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Role</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Dates</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Status</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Reports</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Meetings</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Next due</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {mine.map((p) => {
                          const rs = reportStats(s, p, now);
                          const ms = meetingStats(s, p, now);
                          const nx = nextReport(s, p, now);
                          const l = dir.listing(p.listingId);
                          return (
                            <tr key={p.id}>
                              <td className="px-5 py-3">
                                <Link to="/p04/internship/$id" params={{ id: p.id }} className={`font-semibold text-heading hover:underline ${focus}`}>
                                  {dir.studentName(p.studentId)}
                                </Link>
                                <span className="block font-mono text-xs text-muted-foreground">{p.id}</span>
                              </td>
                              <td className="px-3 py-3">
                                {l?.title ?? p.listingId}
                                <span className="block text-xs text-muted-foreground">{dir.company(p.companyId)?.name}</span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3">{fmtDate(p.start)} – {fmtDate(p.end)}</td>
                              <td className="px-3 py-3"><P04Status>{internshipStatus(s, p, now)}</P04Status></td>
                              <td className="px-3 py-3">{rs.submitted} of {rs.total} sent, {rs.reviewed} reviewed</td>
                              <td className="px-3 py-3">{ms.done} of {ms.required} months</td>
                              <td className="whitespace-nowrap px-3 py-3">{nx ? `Report ${nx.number}, ${fmtDate(nx.due)}` : "–"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <div className="grid gap-4 md:grid-cols-2">
                <Panel className="p-0">
                  <div className="border-b border-border px-5 py-3">
                    <h2 className="text-base font-bold">Reports to review</h2>
                  </div>
                  <ul className="divide-y divide-border">
                    {queue.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No reports waiting for review.</li>}
                    {queue.map((r) => {
                      const p = internshipById(s, r.internshipId);
                      return (
                        <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                          <div className="min-w-0">
                            <Link to="/p04/report/$id" params={{ id: r.id }} className={`text-sm font-semibold text-heading hover:underline ${focus}`}>
                              {p ? dir.studentName(p.studentId) : r.internshipId}: Report {r.number}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              Due {fmtDate(r.due)} · sent {r.lastSubmittedAt ? fmtDateTime(r.lastSubmittedAt) : "–"}
                            </p>
                          </div>
                          {r.late ? <P04Status>Late</P04Status> : <P04Status>Submitted</P04Status>}
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
                <Panel className="p-0">
                  <div className="flex items-center justify-between border-b border-border px-5 py-3">
                    <h2 className="text-base font-bold">Meeting requests and grading</h2>
                    <Link to="/p04/calendar" className={`text-sm font-semibold text-primary hover:underline ${focus}`}>
                      Calendar
                    </Link>
                  </div>
                  <ul className="divide-y divide-border">
                    {requests.length === 0 && ready.length === 0 && (
                      <li className="px-5 py-4 text-sm text-muted-foreground">Nothing waiting for you.</li>
                    )}
                    {requests.map((m) => {
                      const p = internshipById(s, m.internshipId);
                      return (
                        <li key={m.id} className="px-5 py-3 text-sm">
                          <Link to="/p04/internship/$id" params={{ id: m.internshipId }} hash="meetings" className={`font-semibold text-heading hover:underline ${focus}`}>
                            {p ? dir.studentName(p.studentId) : m.internshipId} asks to meet
                          </Link>
                          <p className="text-xs text-muted-foreground">{fmtDateTime(m.start)} · Month {m.month}</p>
                        </li>
                      );
                    })}
                    {ready.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                        <Link to="/p04/internship/$id" params={{ id: p.id }} hash="grade" className={`font-semibold text-heading hover:underline ${focus}`}>
                          Grade {dir.studentName(p.studentId)}
                        </Link>
                        <P04Status>Ended – awaiting grade</P04Status>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            </>
          );
        })()
      )}
    </AppShell>
  );
}
