import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Clock3 } from "lucide-react";
import {
  applyPatch,
  approvals,
  buildFacts,
  contentOf,
  currentReviewed,
  latest,
  RuleError,
  saveDraft,
  startRevision,
  submitProfile,
  updateP01,
  useP01,
  validateProfile,
  type FieldErrors,
  type P01State,
  type ProfileContent,
  type ProfilePatch,
  type Seen,
} from "@/lib/p01";
import { Assistant } from "./Assistant";
import { ProfileForm } from "./ProfileForm";
import { Button, Input, Label } from "./kit";
import { fmt, now, Panel, StatusChip, useVocabulary } from "./shared";

export function StudentProfile() {
  const state = useP01();
  return state ? <Workspace state={state} /> : <p role="status">Loading the profile…</p>;
}

const APPROVAL_ICON = { done: CheckCircle2, waiting: Clock3, later: Circle } as const;

function Workspace({ state }: { state: P01State }) {
  const v = latest(state);
  const key = `${v.profile_version}:${v.status}`;
  const [seen, setSeen] = useState<Seen>({ profile_version: v.profile_version, status: v.status });
  const [form, setForm] = useState<ProfileContent>(contentOf(v));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = useRef(false);
  const { vocab, live: vocabLive } = useVocabulary();

  // A new version or status replaces the form, unless the student has unsaved edits: then the version rule
  // refuses the save and says why.
  useEffect(() => {
    if (dirty.current) return;
    setSeen({ profile_version: v.profile_version, status: v.status });
    setForm(contentOf(v));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, state.versions]);

  const editable = v.status === "draft";
  const reviewed = currentReviewed(state);
  const facts = buildFacts(state, form, vocab, now().slice(0, 10));

  const change = (c: ProfileContent) => {
    dirty.current = true;
    setForm(c);
    if (Object.keys(errors).length) setErrors(validateProfile(c, now().slice(0, 10)));
  };
  const run = (rule: (s: P01State) => P01State, ok: string) => {
    try {
      const next = updateP01(rule);
      dirty.current = false;
      const n = latest(next);
      setSeen({ profile_version: n.profile_version, status: n.status });
      setForm(contentOf(n));
      setErrors({});
      setMessage({ ok: true, text: ok });
    } catch (e) {
      if (!(e instanceof RuleError)) throw e;
      if (e.code === "invalid") setErrors(validateProfile(form, now().slice(0, 10)));
      setMessage({ ok: false, text: e.message });
    }
  };
  const reload = () => {
    dirty.current = false;
    setSeen({ profile_version: v.profile_version, status: v.status });
    setForm(contentOf(v));
    setErrors({});
    setMessage(null);
  };
  const apply = (p: ProfilePatch) => change(applyPatch(form, p, vocab));
  const stale = seen.profile_version !== v.profile_version || seen.status !== v.status;

  const next = {
    draft: "Finish the draft and submit it when it is ready.",
    submitted: "A coordinator is reviewing this version, so it is locked.",
    clarification_requested: "Read the comment, then start a new version to answer it.",
    reviewed: "Other teams can use this version. Start a new version if something changes.",
  }[v.status];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
          >
            {v.full_name
              .split(" ")
              .map((w) => w[0])
              .join("")}
          </span>
          <div className="min-w-0 space-y-1.5">
            <h2 className="text-xl font-bold text-heading">
              {v.full_name}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {v.student_id} · version {v.profile_version}
              </span>
            </h2>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <StatusChip status={v.status} />
              <span>{next}</span>
            </p>
          </div>
        </div>
        {(v.status === "reviewed" || v.status === "clarification_requested") && (
          <Button
            variant="outline"
            className="shrink-0"
            onClick={() =>
              run(
                (s) => startRevision(s, "student", seen, now()),
                `Version ${v.profile_version + 1} is open as a draft. Version ${v.profile_version} stays in the history.`,
              )
            }
          >
            Start version {v.profile_version + 1}
          </Button>
        )}
      </div>

      {v.coordinator_comment && v.status !== "reviewed" && (
        <p className="rounded-xl bg-warn px-4 py-3 text-sm text-warn-foreground">
          <span className="font-semibold">Coordinator asked: </span>
          {v.coordinator_comment}
        </p>
      )}
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-status text-status-foreground" : "bg-danger text-danger-foreground"}`}
        >
          {message.text}{" "}
          {stale && (
            <button
              type="button"
              className="font-semibold underline underline-offset-2"
              onClick={reload}
            >
              Load the newest version
            </button>
          )}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <Panel
            title={editable ? `Edit version ${v.profile_version}` : `Version ${v.profile_version}`}
            note={`${vocab.length} shared skills${vocabLive ? ", live from the class database" : ", built-in copy"}`}
          >
            <ProfileForm
              value={form}
              errors={errors}
              vocab={vocab}
              disabled={!editable}
              onChange={change}
            />
            {editable && (
              <div className="mt-6 border-t border-border pt-5">
                <Label htmlFor="p01-note">What changed in this version</Label>
                <Input
                  id="p01-note"
                  value={note}
                  maxLength={160}
                  placeholder="For example: new dates and a clearer goal"
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      run(
                        (s) => submitProfile(s, "student", seen, form, note, now()),
                        `Version ${v.profile_version} was submitted. It is locked until a coordinator reviews it.`,
                      )
                    }
                  >
                    Submit for review
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      run(
                        (s) => saveDraft(s, "student", seen, form, now()),
                        "Draft saved. Only you can see it.",
                      )
                    }
                  >
                    Save draft
                  </Button>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Where your profile goes">
            <p className="text-sm">
              {reviewed
                ? `Version ${reviewed.profile_version} is your newest reviewed version, so it is the one ready to hand over. `
                : "No version has been reviewed yet, so nothing is ready to hand over. "}
              Drafts and evidence that is still waiting for review stay here.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Recommendations and applications are in{" "}
              <Link to="/opportunities" className="font-semibold text-primary hover:underline">
                Opportunities
              </Link>
              .
            </p>
          </Panel>

          <Panel title="Version history" note="Old versions never change">
            <ol>
              {[...state.versions].reverse().map((x) => (
                <li
                  key={x.profile_version}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border py-2.5 text-sm first:border-t-0"
                >
                  <span className="font-mono text-xs font-semibold">v{x.profile_version}</span>
                  <StatusChip status={x.status} />
                  <span className="min-w-0 flex-1">{x.change_note ?? "Not submitted yet"}</span>
                  <span className="text-xs text-muted-foreground">
                    {x.published_at ? fmt(x.published_at) : ""}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          <Assistant facts={facts} vocab={vocab} onApply={apply} />
          <Panel title="Who still decides">
            <ol className="space-y-3">
              {approvals(state).map((a) => {
                const Icon = APPROVAL_ICON[a.state];
                return (
                  <li
                    key={a.step}
                    className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2.5 text-sm"
                  >
                    <Icon
                      aria-hidden="true"
                      className={`mt-0.5 h-4 w-4 ${a.state === "done" ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <div>
                      <p className="font-semibold text-heading">
                        {a.step}{" "}
                        <span className="font-normal text-muted-foreground">· {a.who}</span>
                      </p>
                      <p className="text-muted-foreground">
                        {a.state === "done"
                          ? "Done. "
                          : a.state === "waiting"
                            ? "Waiting. "
                            : "Later. "}
                        {a.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
          {state.questions.length > 0 && (
            <Panel title="My questions to the co-op office">
              <ul className="space-y-3 text-sm">
                {state.questions.map((q) => (
                  <li key={q.id}>
                    <p className="font-medium">{q.question}</p>
                    <p className="text-muted-foreground">
                      {q.answer ? `Answer: ${q.answer}` : "Waiting for a person to answer."}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
