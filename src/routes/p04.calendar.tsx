import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { MeetingList } from "@/components/p04/Meetings";
import {
  Field,
  FlashBar,
  Loading,
  P04Header,
  P04Status,
  Panel,
  errProps,
  inputCls,
  primaryBtn,
  quietBtn,
  type Flash,
} from "@/components/p04/ui";
import {
  FACULTY,
  FACULTY_ACTOR,
  addSlots,
  dateInput,
  deleteSlot,
  fmtDate,
  fmtTime,
  internshipById,
  pendingRequests,
  run,
  startOfDay,
  useP04,
  weekday,
  type Result,
} from "@/lib/p04";

export const Route = createFileRoute("/p04/calendar")({
  head: () => ({ meta: [{ title: "Calendar · Faculty review · IPP" }] }),
  component: CalendarPage,
});

const DAYS_SHOWN = 21;

function CalendarPage() {
  const d = useP04();
  const now = Date.now();
  const [flash, setFlash] = useState<Flash>(null);
  const [f, setF] = useState({ date: dateInput(now + 86_400_000), time: "10:00", length: "30", repeat: "1" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const show = (r: Result) => {
    if (r.msg) setFlash({ ok: r.ok, msg: r.msg });
  };

  return (
    <AppShell wide>
      <P04Header
        title="Calendar"
        subtitle={`${FACULTY.name}'s free times and meetings for the next three weeks. Students book a free time; you accept or decline. All times are Gulf time.`}
      />
      <FlashBar flash={flash} />
      {!d ? (
        <Loading />
      ) : (
        (() => {
          const { s, dir } = d;
          const from = startOfDay(now);
          const to = from + DAYS_SHOWN * 86_400_000;
          type Item = { at: string; key: string; label: string; status: string; slotId?: string };
          const items: Item[] = [
            ...s.slots
              .filter((x) => !x.deleted && Date.parse(x.start) >= from && Date.parse(x.start) < to)
              .filter((x) => x.status === "Free")
              .map((x) => ({ at: x.start, key: x.id, label: `${fmtTime(x.start)}–${fmtTime(x.end)} free`, status: "Free", slotId: x.id })),
            ...s.meetings
              .filter((m) => ["Requested", "Invited", "Scheduled", "Completed"].includes(m.status) && Date.parse(m.start) >= from && Date.parse(m.start) < to)
              .map((m) => {
                const p = internshipById(s, m.internshipId);
                return { at: m.start, key: m.id, label: `${fmtTime(m.start)}–${fmtTime(m.end)} ${p ? dir.studentName(p.studentId) : ""}, Month ${m.month}`, status: m.status };
              }),
          ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
          const byDay = new Map<string, Item[]>();
          for (const it of items) {
            const k = fmtDate(it.at);
            byDay.set(k, [...(byDay.get(k) ?? []), it]);
          }
          const requests = pendingRequests(s);
          const fid = (k: string) => `slot-${k}`;
          return (
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Panel>
                  <h2 className="mb-3 text-base font-bold">Meeting requests ({requests.length})</h2>
                  {requests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No requests waiting.</p>
                  ) : (
                    <MeetingList meetings={requests} actor={FACULTY_ACTOR} now={now} onResult={show} />
                  )}
                </Panel>
                <Panel>
                  <h2 className="mb-3 text-base font-bold">Next three weeks</h2>
                  {byDay.size === 0 ? (
                    <p className="text-sm text-muted-foreground">No free times or meetings yet. Add your availability.</p>
                  ) : (
                    <ul className="space-y-4">
                      {[...byDay.entries()].map(([day, list]) => (
                        <li key={day}>
                          <h3 className="mb-1 text-sm font-bold text-heading">
                            {list[0] ? weekday(list[0].at) : ""} {day}
                          </h3>
                          <ul className="space-y-1">
                            {list.map((it) => (
                              <li key={it.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                                <span>{it.label}</span>
                                <span className="flex items-center gap-2">
                                  <P04Status>{it.status === "Requested" || it.status === "Invited" ? "Waiting" : it.status}</P04Status>
                                  {it.slotId && (
                                    <button
                                      type="button"
                                      className={`${quietBtn} px-2 py-0.5 text-xs`}
                                      onClick={() => show(run((x) => deleteSlot(x, FACULTY_ACTOR, it.slotId ?? "")))}
                                      aria-label={`Delete free time ${it.label} on ${day}`}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
              <Panel>
                <h2 className="mb-1 text-base font-bold">Add free time</h2>
                <p className="mb-3 text-sm text-muted-foreground">Students see free times only, never other students' meetings.</p>
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    const r = run((x) => addSlots(x, FACULTY_ACTOR, Date.now(), f));
                    setErrors(!r.ok && r.errors ? r.errors : {});
                    show(r);
                  }}
                >
                  <Field id={fid("date")} label="Date" error={errors["date"]}>
                    <input id={fid("date")} type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} {...errProps(fid("date"), errors["date"])} />
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Field id={fid("time")} label="Start" error={errors["time"]}>
                      <input id={fid("time")} type="time" className={inputCls} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} {...errProps(fid("time"), errors["time"])} />
                    </Field>
                    <Field id={fid("length")} label="Length" error={errors["length"]}>
                      <select id={fid("length")} className={inputCls} value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })}>
                        <option value="30">30 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </Field>
                  </div>
                  <Field id={fid("repeat")} label="Repeat weekly" error={errors["repeat"]}>
                    <select id={fid("repeat")} className={inputCls} value={f.repeat} onChange={(e) => setF({ ...f, repeat: e.target.value })}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={String(n)}>
                          {n === 1 ? "Just once" : `For ${n} weeks`}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button type="submit" className={primaryBtn}>
                    Add free time
                  </button>
                </form>
              </Panel>
            </div>
          );
        })()
      )}
    </AppShell>
  );
}
