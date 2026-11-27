import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AiPanel } from "@/components/p04/AiPanel";
import { HrList } from "@/components/p04/Feedback";
import { MeetingList } from "@/components/p04/Meetings";
import {
  Facts,
  Field,
  FlashBar,
  Loading,
  MonthTracker,
  P04Header,
  P04Status,
  Panel,
  Tabs,
  errProps,
  focus,
  inputCls,
  primaryBtn,
  quietBtn,
  type Flash,
} from "@/components/p04/ui";
import {
  FACULTY,
  FACULTY_ACTOR,
  dateInput,
  fmtDate,
  fmtDateTime,
  gradeOf,
  gradeWarnings,
  hrOf,
  internshipById,
  internshipStatus,
  inviteStudent,
  meetingStats,
  meetingsOf,
  monthStatus,
  monthsOf,
  nextReport,
  reportStats,
  reportStatus,
  reportsOf,
  run,
  submitGrade,
  useP04,
  type Directory,
  type Internship,
  type P04State,
  type Result,
} from "@/lib/p04";

export const Route = createFileRoute("/p04/internship/$id")({
  head: () => ({ meta: [{ title: "Internship · Faculty review · IPP" }] }),
  component: InternshipPage,
});

type Tab = "overview" | "reports" | "meetings" | "feedback" | "grade";
const TAB_IDS: Tab[] = ["overview", "reports", "meetings", "feedback", "grade"];

function InternshipPage() {
  const { id } = Route.useParams();
  const d = useP04();
  const hash = useRouterState({ select: (s) => s.location.hash });
  const [tab, setTab] = useState<Tab>("overview");
  const [flash, setFlash] = useState<Flash>(null);
  useEffect(() => {
    if (TAB_IDS.includes(hash as Tab)) setTab(hash as Tab);
  }, [hash]);
  const now = Date.now();
  const p = d ? internshipById(d.s, id) : undefined;
  const show = (r: Result) => {
    if (r.msg) setFlash({ ok: r.ok, msg: r.msg });
  };

  return (
    <AppShell wide>
      <Link to="/p04" className={`mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline ${focus}`}>
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Faculty dashboard
      </Link>
      {!d ? (
        <Loading />
      ) : !p ? (
        <P04Header title="Internship not found" subtitle={`There is no internship ${id}. Go back to the dashboard to pick one.`} />
      ) : (
        <>
          <P04Header
            title={d.dir.studentName(p.studentId)}
            subtitle={`${d.dir.listing(p.listingId)?.title ?? p.listingId} at ${d.dir.company(p.companyId)?.name ?? p.companyId} · ${fmtDate(p.start)} – ${fmtDate(p.end)} · ${p.id}`}
            actions={<P04Status>{internshipStatus(d.s, p, now)}</P04Status>}
          />
          <FlashBar flash={flash} />
          <Tabs
            label="Internship sections"
            value={tab}
            onChange={(t) => {
              setTab(t);
              setFlash(null);
            }}
            tabs={[
              ["overview", "Overview"],
              ["reports", "Reports"],
              ["meetings", "Meetings"],
              ["feedback", `Supervisor feedback (${hrOf(d.s, p.id).length})`],
              ["grade", "Grade"],
            ]}
          />
          {tab === "overview" && <Overview s={d.s} dir={d.dir} p={p} now={now} />}
          {tab === "reports" && <Reports s={d.s} p={p} now={now} />}
          {tab === "meetings" && <Meetings s={d.s} dir={d.dir} p={p} now={now} show={show} />}
          {tab === "feedback" && (
            <Panel>
              <h2 className="mb-1 text-base font-bold">Supervisor feedback</h2>
              <p className="mb-4 text-sm text-muted-foreground">Comments from the workplace supervisor (HR). Only faculty see them.</p>
              <HrList items={hrOf(d.s, p.id)} />
            </Panel>
          )}
          {tab === "grade" && <GradeTab s={d.s} dir={d.dir} p={p} now={now} show={show} />}
        </>
      )}
    </AppShell>
  );
}

function Overview({ s, dir, p, now }: { s: P04State; dir: Directory; p: Internship; now: number }) {
  const nx = nextReport(s, p, now);
  const rs = reportStats(s, p, now);
  const ms = meetingStats(s, p, now);
  const cur = monthsOf(p).find((m) => now >= Date.parse(m.start) && now < Date.parse(m.end));
  const co = dir.company(p.companyId);
  const activity = [
    ...reportsOf(s, p.id).flatMap((r) => r.history.map((h) => ({ h, what: `Report ${r.number}` }))),
    ...meetingsOf(s, p.id).flatMap((m) => m.history.map((h) => ({ h, what: `Meeting, Month ${m.month}` }))),
    ...hrOf(s, p.id).map((c) => ({ h: { to: c.rating, by: c.author, role: "Employer HR" as const, at: c.at, from: "(new)", note: "" }, what: "Supervisor feedback" })),
  ]
    .sort((a, b) => Date.parse(b.h.at) - Date.parse(a.h.at))
    .slice(0, 8);
  return (
    <>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <AiPanel kind="brief" id={p.id} s={s} dir={dir} now={now} />
        <AiPanel kind="warn" id={p.id} s={s} dir={dir} now={now} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-base font-bold">Internship</h2>
          <Facts
            rows={[
              ["Student", dir.studentName(p.studentId)],
              ["Company", co?.name ?? p.companyId],
              ["Workplace supervisor", co?.hr ?? "–"],
              ["Faculty advisor", FACULTY.name],
              ["Reports", `${rs.submitted} of ${rs.total} submitted, ${rs.reviewed} reviewed, ${rs.late} late, ${rs.missing.length} missing or overdue`],
              ["Meetings", `${ms.done} of ${ms.required} months done`],
              ["Next report", nx ? `Report ${nx.number}, due ${fmtDate(nx.due)}` : "None"],
              ["This month", cur ? `Month ${cur.month}: ${monthStatus(s, p, cur, now)}` : "–"],
            ]}
          />
          <h3 className="mb-2 mt-5 text-sm font-bold">Monthly meetings</h3>
          <MonthTracker s={s} p={p} now={now} />
        </Panel>
        <Panel>
          <h2 className="mb-3 text-base font-bold">Recent activity</h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {activity.map(({ h, what }, i) => (
                <li key={i} className="border-l-2 border-border pl-3">
                  <span className="font-medium text-heading">{what}:</span> {h.from === "(new)" ? h.to : `${h.from} → ${h.to}`}
                  <span className="block text-xs text-muted-foreground">
                    {h.by} · {fmtDateTime(h.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Reports({ s, p, now }: { s: P04State; p: Internship; now: number }) {
  const list = reportsOf(s, p.id);
  return (
    <Panel className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Progress reports</caption>
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="px-5 py-2 font-semibold">Report</th>
              <th scope="col" className="px-3 py-2 font-semibold">Period</th>
              <th scope="col" className="px-3 py-2 font-semibold">Due</th>
              <th scope="col" className="px-3 py-2 font-semibold">Status</th>
              <th scope="col" className="px-3 py-2 font-semibold"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3 font-semibold text-heading">Report {r.number}</td>
                <td className="whitespace-nowrap px-3 py-3">{fmtDate(r.periodStart)} – {fmtDate(r.due)}</td>
                <td className="whitespace-nowrap px-3 py-3">{fmtDate(r.due)}</td>
                <td className="px-3 py-3">
                  <span className="inline-flex flex-wrap gap-1">
                    <P04Status>{reportStatus(s, r, now)}</P04Status>
                    {r.late && <P04Status>Late</P04Status>}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  {r.content && (
                    <Link to="/p04/report/$id" params={{ id: r.id }} className={`text-sm font-semibold text-primary hover:underline ${focus}`}>
                      Open
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Meetings({ s, dir, p, now, show }: { s: P04State; dir: Directory; p: Internship; now: number; show: (r: Result) => void }) {
  const st = internshipStatus(s, p, now);
  const [f, setF] = useState({ date: dateInput(now + 86_400_000), time: "11:00", length: "30", agenda: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fid = (k: string) => `inv-${k}`;
  return (
    <>
      <AiPanel kind="prep" id={p.id} s={s} dir={dir} now={now} className="mb-4" />
      <Panel className="mb-4">
        <h2 className="mb-3 text-base font-bold">Monthly meetings</h2>
        <MonthTracker s={s} p={p} now={now} />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <h2 className="mb-3 text-base font-bold">Meetings</h2>
          <MeetingList meetings={meetingsOf(s, p.id)} actor={FACULTY_ACTOR} now={now} onResult={show} showHistory />
        </Panel>
        <Panel>
          <h2 className="mb-1 text-base font-bold">Invite {dir.studentName(p.studentId).split(" ")[0]}</h2>
          {st !== "In progress" || gradeOf(s, p.id) ? (
            <p className="text-sm text-muted-foreground">You can invite a student only while the internship is in progress.</p>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const r = run((x) => inviteStudent(x, FACULTY_ACTOR, Date.now(), { internshipId: p.id, ...f }));
                setErrors(!r.ok && r.errors ? r.errors : {});
                if (r.ok) setF({ ...f, agenda: "" });
                show(r);
              }}
            >
              <p className="mb-3 text-sm text-muted-foreground">The student accepts or declines. One meeting per month.</p>
              <Field id={fid("date")} label="Date" error={errors["date"]}>
                <input id={fid("date")} type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} {...errProps(fid("date"), errors["date"])} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field id={fid("time")} label="Time (Gulf time)" error={errors["time"]}>
                  <input id={fid("time")} type="time" className={inputCls} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} {...errProps(fid("time"), errors["time"])} />
                </Field>
                <Field id={fid("length")} label="Length" error={errors["length"]}>
                  <select id={fid("length")} className={inputCls} value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })}>
                    <option value="30">30 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </Field>
              </div>
              <Field id={fid("agenda")} label="Agenda" hint="10–300 characters." error={errors["agenda"]}>
                <textarea id={fid("agenda")} rows={3} className={inputCls} value={f.agenda} onChange={(e) => setF({ ...f, agenda: e.target.value })} {...errProps(fid("agenda"), errors["agenda"])} />
              </Field>
              <button type="submit" className={primaryBtn}>
                Send invitation
              </button>
            </form>
          )}
        </Panel>
      </div>
    </>
  );
}

function GradeTab({ s, dir, p, now, show }: { s: P04State; dir: Directory; p: Internship; now: number; show: (r: Result) => void }) {
  const g = gradeOf(s, p.id);
  const rs = reportStats(s, p, now);
  const ms = meetingStats(s, p, now);
  const warnings = gradeWarnings(s, p, now);
  const [f, setF] = useState({ result: "", reason: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const open = internshipStatus(s, p, now) === "Ended – awaiting grade";
  const name = dir.studentName(p.studentId);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <h2 className="mb-4 text-base font-bold">Grading summary</h2>
        <Facts
          rows={[
            ["Reports submitted", `${rs.submitted} of ${rs.total}`],
            ["Reports reviewed", String(rs.reviewed)],
            ["Late reports", String(rs.late)],
            ["Missing reports", String(rs.missing.length)],
            ["Meetings", `${ms.done} of ${ms.required} months done`],
            ["Missed months", ms.missedMonths.length ? ms.missedMonths.map((n) => `Month ${n}`).join(", ") : "None"],
          ]}
        />
        {warnings.length > 0 && (
          <div className="mt-4 rounded-xl bg-warn px-4 py-3 text-sm text-warn-foreground">
            <p className="font-semibold">Before you grade</p>
            <ul className="mt-1 list-disc pl-5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs">These are warnings only. You decide.</p>
          </div>
        )}
      </Panel>
      <Panel>
        <h2 className="mb-4 text-base font-bold">Final grade</h2>
        {g ? (
          <div className="text-sm">
            <p className="mb-2 flex items-center gap-2">
              <P04Status>{g.result}</P04Status>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Lock aria-hidden="true" className="h-3.5 w-3.5" /> Locked
              </span>
            </p>
            <p>{g.reason}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {g.by} · {fmtDateTime(g.at)} · {g.id}
            </p>
          </div>
        ) : !open ? (
          <p className="text-sm text-muted-foreground">Grading opens on {fmtDate(p.end)}.</p>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (f.result && f.reason.trim().length >= 20 && !window.confirm(`Submit a ${f.result} grade for ${name}? Grades are final once submitted.`)) return;
              const r = run((x) => submitGrade(x, p.id, FACULTY_ACTOR, Date.now(), f));
              setErrors(!r.ok && r.errors ? r.errors : {});
              show(r);
            }}
          >
            <fieldset className="mb-3">
              <legend className="mb-1 text-sm font-medium text-heading">Result</legend>
              <div className="flex gap-4">
                {(["Pass", "Fail"] as const).map((v) => (
                  <label key={v} className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="result" value={v} checked={f.result === v} onChange={() => setF({ ...f, result: v })} />
                    {v}
                  </label>
                ))}
              </div>
              {errors["result"] && (
                <p role="alert" className="mt-1 text-xs font-medium text-danger-foreground">
                  {errors["result"]}
                </p>
              )}
            </fieldset>
            <Field id="grade-reason" label="Reason" hint="At least 20 characters. The student sees it." error={errors["reason"]}>
              <textarea id="grade-reason" rows={4} className={inputCls} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} {...errProps("grade-reason", errors["reason"])} />
            </Field>
            <div className="flex gap-2">
              <button type="submit" className={primaryBtn}>
                Submit grade
              </button>
              <button type="button" className={quietBtn} onClick={() => setF({ result: "", reason: "" })}>
                Clear
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
