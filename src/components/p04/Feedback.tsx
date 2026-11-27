/** Supervisor (HR) feedback: the list faculty read and the form HR fills in (P04, FAC-19). */
import { useState } from "react";
import {
  HR_RATINGS,
  addHrComment,
  fmtDateTime,
  run,
  type Actor,
  type HrComment,
  type Result,
} from "@/lib/p04";
import { Field, P04Status, errProps, inputCls, primaryBtn, quietBtn } from "./ui";

export function HrList({ items }: { items: HrComment[] }) {
  if (!items.length)
    return <p className="text-sm text-muted-foreground">No supervisor feedback yet. The workplace supervisor adds it from the Employer HR view.</p>;
  return (
    <ul className="divide-y divide-border">
      {[...items].reverse().map((c) => (
        <li key={c.id} className="py-3 first:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <P04Status>{c.rating}</P04Status>
            <span className="text-sm font-semibold text-heading">{c.author}</span>
            <span className="text-xs text-muted-foreground">Workplace supervisor · {fmtDateTime(c.at)}</span>
          </div>
          <p className="mt-2 text-sm">{c.comment}</p>
          {c.strengths && (
            <p className="mt-1 text-sm">
              <span className="font-medium text-heading">Strengths:</span> {c.strengths}
            </p>
          )}
          {c.improve && (
            <p className="mt-1 text-sm">
              <span className="font-medium text-heading">To improve:</span> {c.improve}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function HrForm({
  internshipId,
  studentName,
  actor,
  onDone,
}: {
  internshipId: string;
  studentName: string;
  actor: Actor;
  onDone: (r: Result) => void;
}) {
  const [f, setF] = useState({ rating: "", comment: "", strengths: "", improve: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const id = (k: string) => `hr-${internshipId}-${k}`;
  return (
    <form
      noValidate
      className="mt-3 rounded-xl border border-border bg-muted/50 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const r = run((s) => addHrComment(s, internshipId, actor, Date.now(), f));
        setErrors(!r.ok && r.errors ? r.errors : {});
        onDone(r);
      }}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Feedback on {studentName} goes to the faculty advisor. The student does not see it.
      </p>
      <Field id={id("rating")} label="Overall" error={errors["rating"]}>
        <select id={id("rating")} className={inputCls} value={f.rating} onChange={set("rating")} {...errProps(id("rating"), errors["rating"])}>
          <option value="">Choose…</option>
          {HR_RATINGS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>
      <Field id={id("comment")} label="Comment for the faculty advisor" hint="At least 20 characters." error={errors["comment"]}>
        <textarea id={id("comment")} rows={4} maxLength={1000} className={inputCls} value={f.comment} onChange={set("comment")} {...errProps(id("comment"), errors["comment"])} />
      </Field>
      <Field id={id("strengths")} label="Strengths (optional)" error={errors["strengths"]}>
        <textarea id={id("strengths")} rows={2} maxLength={500} className={inputCls} value={f.strengths} onChange={set("strengths")} />
      </Field>
      <Field id={id("improve")} label="To improve (optional)" error={errors["improve"]}>
        <textarea id={id("improve")} rows={2} maxLength={500} className={inputCls} value={f.improve} onChange={set("improve")} />
      </Field>
      <div className="flex gap-2">
        <button type="submit" className={primaryBtn}>
          Send to faculty
        </button>
        <button type="button" className={quietBtn} onClick={() => onDone({ ok: false, msg: "" })}>
          Close
        </button>
      </div>
    </form>
  );
}
