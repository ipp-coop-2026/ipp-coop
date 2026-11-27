/** Meeting list with the actions each side may take (P04, FAC-12 to FAC-15). Used by faculty and students. */
import { Video } from "lucide-react";
import { useState } from "react";
import {
  OPEN_MEETING,
  fmtDate,
  fmtTime,
  meetingAction,
  run,
  type Actor,
  type Meeting,
  type Result,
} from "@/lib/p04";
import { Field, HistoryList, P04Status, errProps, inputCls, primaryBtn, quietBtn } from "./ui";

type Act = "accept" | "decline" | "cancel" | "complete" | "missed";
const NEEDS: Partial<Record<Act, { label: string; key: "reason" | "notes"; button: string }>> = {
  decline: { label: "Reason for declining", key: "reason", button: "Decline" },
  cancel: { label: "Reason for cancelling", key: "reason", button: "Cancel meeting" },
  complete: { label: "Meeting notes (10–1000 characters, only faculty see them)", key: "notes", button: "Mark completed" },
};

export function MeetingList({
  meetings,
  actor,
  now,
  onResult,
  showHistory = false,
}: {
  meetings: Meeting[];
  actor: Actor;
  now: number;
  onResult: (r: Result) => void;
  showHistory?: boolean;
}) {
  const [open, setOpen] = useState<{ id: string; act: Act } | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [video, setVideo] = useState<string | null>(null);

  const go = (m: Meeting, act: Act, extra: { reason?: string; notes?: string } = {}) => {
    const r = run((s) => meetingAction(s, m.id, act, actor, Date.now(), extra));
    if (!r.ok && r.errors) setErr(Object.values(r.errors)[0]);
    else {
      setOpen(null);
      setText("");
      setErr(undefined);
    }
    onResult(r);
  };

  if (!meetings.length) return <p className="text-sm text-muted-foreground">No meetings yet.</p>;
  const faculty = actor.role === "Faculty";
  return (
    <ul className="space-y-3">
      {[...meetings].reverse().map((m) => {
        const started = now >= Date.parse(m.start);
        const canRespond = (m.status === "Requested" && faculty) || (m.status === "Invited" && !faculty);
        const formFor = open?.id === m.id ? open.act : null;
        const need = formFor ? NEEDS[formFor] : undefined;
        const fid = `mtg-${m.id}-${formFor ?? ""}`;
        return (
          <li key={m.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-heading">
                  Month {m.month} · {fmtDate(m.start)}, {fmtTime(m.start)}–{fmtTime(m.end)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.origin} · <span className="font-mono">{m.id}</span>
                </p>
              </div>
              <P04Status>{m.status}</P04Status>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-medium text-heading">Agenda:</span> {m.agenda}
            </p>
            {m.reason && <p className="mt-1 text-sm text-muted-foreground">Reason: {m.reason}</p>}
            {m.notes && faculty && <p className="mt-1 text-sm text-muted-foreground">Notes: {m.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {m.status === "Scheduled" && (
                <button type="button" className={quietBtn} onClick={() => setVideo(video === m.id ? null : m.id)}>
                  <Video aria-hidden="true" className="h-4 w-4" /> Join video call
                </button>
              )}
              {canRespond && (
                <>
                  <button type="button" className={primaryBtn} onClick={() => go(m, "accept")}>
                    Accept
                  </button>
                  <button type="button" className={quietBtn} onClick={() => { setOpen({ id: m.id, act: "decline" }); setErr(undefined); }}>
                    Decline
                  </button>
                </>
              )}
              {OPEN_MEETING.includes(m.status) && (
                <button type="button" className={quietBtn} onClick={() => { setOpen({ id: m.id, act: "cancel" }); setErr(undefined); }}>
                  Cancel
                </button>
              )}
              {faculty && m.status === "Scheduled" && (
                <>
                  <button type="button" className={quietBtn} disabled={!started} title={started ? undefined : "Available after the meeting starts."} onClick={() => { setOpen({ id: m.id, act: "complete" }); setErr(undefined); }}>
                    Mark completed
                  </button>
                  <button type="button" className={quietBtn} disabled={!started} title={started ? undefined : "Available after the meeting starts."} onClick={() => go(m, "missed")}>
                    Mark missed
                  </button>
                  {!started && <span className="self-center text-xs text-muted-foreground">Outcome available after the meeting starts.</span>}
                </>
              )}
            </div>
            {video === m.id && (
              <p role="status" className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
                Video call link: <span className="font-mono">{m.videoLink}</span>. This demo has no real call; in the live app the link opens the call.
              </p>
            )}
            {formFor && need && (
              <form
                className="mt-3 rounded-lg bg-muted p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  go(m, formFor, need.key === "reason" ? { reason: text } : { notes: text });
                }}
              >
                <Field id={fid} label={need.label} error={err}>
                  <textarea id={fid} rows={2} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} {...errProps(fid, err)} />
                </Field>
                <div className="flex gap-2">
                  <button type="submit" className={primaryBtn}>
                    {need.button}
                  </button>
                  <button type="button" className={quietBtn} onClick={() => { setOpen(null); setText(""); }}>
                    Back
                  </button>
                </div>
              </form>
            )}
            {showHistory && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-muted-foreground">History</summary>
                <div className="mt-2">
                  <HistoryList items={m.history} />
                </div>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
