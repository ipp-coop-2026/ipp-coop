import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MeetingList } from "@/components/p04/Meetings";
import { ReportBody } from "@/components/p04/ReportBody";
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
  fmtDate,
  fmtDateTime,
  fmtTime,
  freeSlots,
  gradeOf,
  internshipStatus,
  meetingsOf,
  monthOf,
  monthStatus,
  monthsOf,
  nextReport,
  reportAction,
  reportStatus,
  reportsOf,
  requestMeeting,
  run,
  useP04,
  weekday,
  type Actor,
  type Directory,
  type Internship,
  type P04State,
  type Report,
  type ReportInput,
  type Result,
} from "@/lib/p04";

export const Route = createFileRoute("/p04/student")({
  head: () => ({ meta: [{ title: "My internship · Faculty review · IPP" }] }),
  component: StudentPage,
});

type Tab = "reports" | "meetings" | "grade";

function StudentPage() {
  const d = useP04();
  const now = Date.now();
  const [who, setWho] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("reports");
  const [flash, setFlash] = useState<Flash>(null);
  const show = (r: Result) => {
    if (r.msg) setFlash({ ok: r.ok, msg: r.msg });
  };
  const interns = d ? [...new Set(d.s.internships.map((p) => p.studentId))] : [];
  const current = who ?? interns.find((id) => d && d.s.internships.some((p) => p.studentId === id && internshipStatus(d.s, p, now) === "In progress")) ?? interns[0] ?? null;
  const p = d && current ? [...d.s.internships].reverse().find((x) => x.studentId === current) : undefined;

  return (
    <AppShell wide>
      <P04Header title="My internship" subtitle="Send a progress report every two weeks, meet your faculty advisor once a month and see your final grade." />
      {!d ? (
        <Loading />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Student:</span>
            <div role="group" aria-label="Student" className="flex flex-wrap rounded-full border border-border bg-muted p-0.5">
              {interns.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={current === id}
                  onClick={() => {
                    setWho(id);
                    setFlash(null);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${focus} ${current === id ? "bg-card text-heading shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {d.dir.studentName(id)}
                </button>
              ))}
            </div>
          </div>
          <FlashBar flash={flash} />
          {!p ? (
            <Panel className="py-10 text-center">
              <p className="text-sm text-muted-foreground">This section opens once your placement is confirmed.</p>
            </Panel>
          ) : (
            <StudentInternship s={d.s} dir={d.dir} p={p} now={now} tab={tab} setTab={(t) => { setTab(t); setFlash(null); }} show={show} />
          )}
        </>
      )}
    </AppShell>
  );
}

function StudentInternship({ s, dir, p, now, tab, setTab, show }: { s: P04State; dir: Directory; p: Internship; now: number; tab: Tab; setTab: (t: Tab) => void; show: (r: Result) => void }) {
  const actor: Actor = { role: "Student", name: dir.studentName(p.studentId), studentId: p.studentId };
  const nx = nextReport(s, p, now);
  const cur = monthsOf(p).find((m) => now >= Date.parse(m.start) && now < Date.parse(m.end));
  const g = gradeOf(s, p.id);
  return (
    <>
      <Panel className="mb-4">
        <Facts
          rows={[
            ["Role", dir.listing(p.listingId)?.title ?? p.listingId],
            ["Company", dir.company(p.companyId)?.name ?? p.companyId],
            ["Dates", `${fmtDate(p.start)} – ${fmtDate(p.end)}`],
            ["Faculty advisor", FACULTY.name],
            ["Status", <P04Status key="st">{internshipStatus(s, p, now)}</P04Status>],
            ["Next report", nx ? `Report ${nx.number}, due ${fmtDate(nx.due)}` : "None"],
            ["This month's meeting", cur ? `Month ${cur.month}: ${monthStatus(s, p, cur, now)}` : "–"],
          ]}
        />
      </Panel>
      <Tabs
        label="My internship"
        value={tab}
        onChange={setTab}
        tabs={[
          ["reports", "Reports"],
          ["meetings", "Meetings"],
          ["grade", "Grade"],
        ]}
      />
      {tab === "reports" && (
        <div className="space-y-3">
          {reportsOf(s, p.id).map((r) => (
            <StudentReport key={r.id} s={s} r={r} actor={actor} now={now} show={show} closed={!!g} />
          ))}
        </div>
      )}
      {tab === "meetings" && <StudentMeetings s={s} p={p} actor={actor} now={now} show={show} />}
      {tab === "grade" && (
        <Panel>
          <h2 className="mb-3 text-base font-bold">Final grade</h2>
          {g ? (
            <div className="text-sm">
              <p className="mb-2 flex items-center gap-2">
                <P04Status>{g.result}</P04Status>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Lock aria-hidden="true" className="h-3.5 w-3.5" /> Final
                </span>
              </p>
              <p>{g.reason}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {g.by} · {fmtDateTime(g.at)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your faculty advisor gives a Pass or Fail after the internship ends on {fmtDate(p.end)}.
            </p>
          )}
        </Panel>
      )}
    </>
  );
}

const EMPTY: ReportInput = { workedOn: "", learned: "", challenges: "", helpNeeded: "", nextPlan: "", hours: "", attachment: "" };
const FORM_FIELDS: [keyof ReportInput, string, string, number][] = [
  ["workedOn", "What I worked on", "30–1000 characters.", 4],
  ["learned", "What I learned", "30–1000 characters.", 3],
  ["challenges", "Challenges (optional)", "", 2],
  ["helpNeeded", "Help needed (optional)", "", 2],
  ["nextPlan", "Plan for the next 2 weeks", "20–500 characters.", 2],
];

function StudentReport({ s, r, actor, now, show, closed }: { s: P04State; r: Report; actor: Actor; now: number; show: (r: Result) => void; closed: boolean }) {
  const st = reportStatus(s, r, now);
  const canSubmit = !closed && (st === "Due" || st === "Overdue" || st === "Missing");
  const canRevise = !closed && st === "Changes requested";
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(false);
  const [f, setF] = useState<ReportInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const startForm = () => {
    setF(
      canRevise && r.content
        ? { workedOn: r.content.workedOn, learned: r.content.learned, challenges: r.content.challenges, helpNeeded: r.content.helpNeeded, nextPlan: r.content.nextPlan, hours: r.content.hours === null ? "" : String(r.content.hours), attachment: "" }
        : EMPTY,
    );
    setErrors({});
    setOpen(true);
  };
  const fid = (k: string) => `${r.id}-${k}`;
  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-heading">Report {r.number}</p>
          <p className="text-xs text-muted-foreground">
            {fmtDate(r.periodStart)} – {fmtDate(r.due)} · due {fmtDate(r.due)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <P04Status>{st}</P04Status>
          {r.late && <P04Status>Late</P04Status>}
          {(canSubmit || canRevise) && !open && (
            <button type="button" className={primaryBtn} onClick={startForm}>
              {canRevise ? "Revise report" : "Write report"}
            </button>
          )}
          {r.content && !open && (
            <button type="button" className={quietBtn} aria-expanded={view} onClick={() => setView((v) => !v)}>
              {view ? "Hide" : "View"}
            </button>
          )}
        </div>
      </div>
      {r.facultyComment && (st === "Changes requested" || st === "Reviewed") && (
        <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-medium text-heading">Advisor's comment:</span> {r.facultyComment}
        </p>
      )}
      {view && r.content && !open && (
        <div className="mt-3">
          <ReportBody c={r.content} attachment={r.attachment} />
        </div>
      )}
      {open && (
        <form
          noValidate
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const res = run((x) => reportAction(x, r.id, canRevise ? "revise" : "submit", actor, Date.now(), { content: f }));
            setErrors(!res.ok && res.errors ? res.errors : {});
            if (res.ok) setOpen(false);
            show(res);
          }}
        >
          {FORM_FIELDS.map(([k, label, hint, rows]) => (
            <Field key={k} id={fid(k)} label={label} hint={hint} error={errors[k]}>
              <textarea id={fid(k)} rows={rows} className={inputCls} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...errProps(fid(k), errors[k])} />
            </Field>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <Field id={fid("hours")} label="Hours worked (optional)" hint="0–120." error={errors["hours"]}>
              <input id={fid("hours")} inputMode="decimal" className={inputCls} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} {...errProps(fid("hours"), errors["hours"])} />
            </Field>
            <Field id={fid("attachment")} label="Attachment file name (optional)" hint="Name only; no upload in this demo.">
              <input id={fid("attachment")} className={inputCls} value={f.attachment} onChange={(e) => setF({ ...f, attachment: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="submit" className={primaryBtn}>
              {canRevise ? "Resubmit" : "Submit report"}
            </button>
            <button type="button" className={quietBtn} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}

function StudentMeetings({ s, p, actor, now, show }: { s: P04State; p: Internship; actor: Actor; now: number; show: (r: Result) => void }) {
  const [pick, setPick] = useState<string | null>(null);
  const [agenda, setAgenda] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const closed = !!gradeOf(s, p.id) || internshipStatus(s, p, now) !== "In progress";
  const slots = freeSlots(s, now)
    .filter((x) => monthOf(p, x.start) !== null)
    .slice(0, 12);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Panel>
          <h2 className="mb-3 text-base font-bold">Monthly meetings</h2>
          <MonthTracker s={s} p={p} now={now} />
        </Panel>
        <Panel>
          <h2 className="mb-3 text-base font-bold">My meetings</h2>
          <MeetingList meetings={meetingsOf(s, p.id)} actor={actor} now={now} onResult={show} />
        </Panel>
      </div>
      <Panel>
        <h2 className="mb-1 text-base font-bold">Book a meeting</h2>
        <p className="mb-3 text-sm text-muted-foreground">Free times in {FACULTY.name}'s calendar. One meeting a month.</p>
        {closed ? (
          <p className="text-sm text-muted-foreground">Booking is open while the internship is in progress.</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No free times right now. Your advisor can also invite you.</p>
        ) : (
          <ul className="space-y-2">
            {slots.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  aria-pressed={pick === x.id}
                  onClick={() => {
                    setPick(pick === x.id ? null : x.id);
                    setErr(undefined);
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${focus} ${pick === x.id ? "border-primary bg-accent text-accent-foreground" : "border-border hover:bg-muted"}`}
                >
                  {weekday(x.start)} {fmtDate(x.start)}, {fmtTime(x.start)}–{fmtTime(x.end)}
                </button>
                {pick === x.id && (
                  <form
                    noValidate
                    className="mt-2 rounded-lg bg-muted p-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const r = run((st) => requestMeeting(st, actor, Date.now(), { slotId: x.id, agenda }));
                      setErr(!r.ok ? (r.errors?.["agenda"] ?? r.msg) : undefined);
                      if (r.ok) {
                        setPick(null);
                        setAgenda("");
                      }
                      show(r);
                    }}
                  >
                    <Field id={`agenda-${x.id}`} label="Agenda" hint="10–300 characters." error={err}>
                      <textarea id={`agenda-${x.id}`} rows={3} className={inputCls} value={agenda} onChange={(e) => setAgenda(e.target.value)} {...errProps(`agenda-${x.id}`, err)} />
                    </Field>
                    <button type="submit" className={primaryBtn}>
                      Request meeting
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
