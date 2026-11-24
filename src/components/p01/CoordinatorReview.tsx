import { useEffect, useMemo, useState } from "react";
import { getProfileFeed } from "@/lib/db";
import {
  acceptEvidence,
  answerQuestion,
  compareRows,
  CONTRACT_VERSION,
  currentReviewed,
  diffVersions,
  exportVersion,
  latest,
  markReviewed,
  recordEvidenceOutcome,
  requestClarification,
  RuleError,
  SEED_ROWS,
  updateP01,
  useP01,
  type EvidenceItem,
  type P01State,
} from "@/lib/p01";
import { Status } from "@/components/AppShell";
import { Button, Input, Label, Textarea } from "./kit";
import { fmt, now, Panel, skillName, StatusChip, useVocabulary } from "./shared";

export function CoordinatorReview() {
  const state = useP01();
  return state ? <Workspace state={state} /> : <p role="status">Loading the review queue…</p>;
}

const OUTCOME_TONE = {
  pending: "blue",
  revision_requested: "amber",
  demonstrated: "green",
  not_demonstrated: "red",
} as const satisfies Record<EvidenceItem["review_outcome"], string>;
const OUTCOME_LABEL: Record<EvidenceItem["review_outcome"], string> = {
  pending: "Pending",
  revision_requested: "Revision requested",
  demonstrated: "Demonstrated",
  not_demonstrated: "Not demonstrated",
};

type Check = { state: "loading" } | { state: "ok" | "diff"; text: string } | { state: "offline" };

/** Compares P01's starting versions with the class database, field by field, through the hand-off contract. */
function useSharedCheck(studentId: string): Check {
  const [check, setCheck] = useState<Check>({ state: "loading" });
  useEffect(() => {
    let on = true;
    getProfileFeed(studentId)
      .then((rows) => {
        if (!on) return;
        const diffs = SEED_ROWS.flatMap((seed) => {
          const row = rows.find((r) => r.profile_version === seed.profile_version);
          return row
            ? compareRows(seed, row).map((f) => `v${seed.profile_version} ${f}`)
            : [`v${seed.profile_version} missing`];
        });
        setCheck(
          diffs.length
            ? { state: "diff", text: `Different from the class database: ${diffs.join(", ")}.` }
            : {
                state: "ok",
                text: `Versions ${SEED_ROWS.map((r) => r.profile_version).join(" and ")} match the class database: 0 differences in 14 fields each.`,
              },
        );
      })
      .catch(() => {
        if (on) setCheck({ state: "offline" });
      });
    return () => {
      on = false;
    };
  }, [studentId]);
  return check;
}

function Workspace({ state }: { state: P01State }) {
  const v = latest(state);
  const { vocab } = useVocabulary();
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string; where: string } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const check = useSharedCheck(v.student_id);
  const label = (id: string) => skillName(vocab, id);
  const seen = { profile_version: v.profile_version, status: v.status };
  const reviewed = currentReviewed(state);
  const previous = state.versions[state.versions.length - 2] ?? null;
  const changes = useMemo(() => diffVersions(previous, v, label), [previous, v, vocab]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (where: string, rule: (s: P01State) => P01State, ok: string) => {
    try {
      updateP01(rule);
      setMessage({ ok: true, text: ok, where });
      return true;
    } catch (e) {
      if (!(e instanceof RuleError)) throw e;
      setMessage({ ok: false, text: e.message, where });
      return false;
    }
  };
  const Note = ({ where }: { where: string }) =>
    message?.where === where ? (
      <p
        role={message.ok ? "status" : "alert"}
        className={`mt-3 rounded-xl px-4 py-3 text-sm ${message.ok ? "bg-status text-status-foreground" : "bg-danger text-danger-foreground"}`}
      >
        {message.text}
      </p>
    ) : null;

  const handoff = reviewed ? exportVersion(state, reviewed.profile_version) : null;
  const pending = v.status === "submitted";

  return (
    <div className="space-y-5">
      <Panel title="Waiting for review" note={pending ? "1 profile" : "Nothing waiting"}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xl font-bold text-heading">{v.full_name}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {v.student_id} · version {v.profile_version}
          </span>
          <StatusChip status={v.status} />
        </div>
        {v.change_note && (
          <p className="mt-1 text-sm text-muted-foreground">
            {v.status === "reviewed" ? "Note" : "Student’s note"}: {v.change_note}
          </p>
        )}
        {v.status === "draft" ? (
          <p className="mt-3 text-sm">
            The student is working on a draft. You will see it when it is submitted.
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Changed field
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      {previous ? `Version ${previous.profile_version}` : "Before"}
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Version {v.profile_version}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.field} className="border-b border-border align-top last:border-b-0">
                      <th scope="row" className="px-4 py-3 font-semibold">
                        {c.field}
                      </th>
                      <td className="px-4 py-3 text-muted-foreground">{c.before}</td>
                      <td className="px-4 py-3">{c.after}</td>
                    </tr>
                  ))}
                  {!changes.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-muted-foreground">
                        No field changed since the last version.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {pending && (
              <div className="mt-4">
                <Label htmlFor="p01-comment">Comment for the student</Label>
                <Textarea
                  id="p01-comment"
                  rows={2}
                  value={comment}
                  maxLength={300}
                  placeholder="For example: which airline question do you want to answer, and from which date?"
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      if (
                        run(
                          "review",
                          (s) => markReviewed(s, "coordinator", seen, now()),
                          `Version ${v.profile_version} is reviewed. Other teams can use it.`,
                        )
                      )
                        setComment("");
                    }}
                  >
                    Mark as reviewed
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (
                        run(
                          "review",
                          (s) => requestClarification(s, "coordinator", seen, comment, now()),
                          "Your comment was sent to the student.",
                        )
                      )
                        setComment("");
                    }}
                  >
                    Request clarification
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  You can review or ask. Only the student can change what a profile says.
                </p>
              </div>
            )}
          </>
        )}
        <Note where="review" />
      </Panel>

      <Panel
        title="Skill evidence from P06"
        note="A skill stays self-declared until evidence is demonstrated and accepted"
      >
        <ul className="divide-y divide-border">
          {state.evidence.map((e) => (
            <li
              key={e.evidence_id}
              className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-heading">
                  {label(e.skill_id)}{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {e.evidence_id} · {e.student_id}
                  </span>
                </p>
                <p className="text-muted-foreground">{e.activity}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <Status tone={OUTCOME_TONE[e.review_outcome]}>
                    {OUTCOME_LABEL[e.review_outcome]}
                  </Status>
                  <span className="text-muted-foreground">
                    {e.reviewer ? `${e.reviewer}, ${fmt(e.reviewed_at)}` : "not reviewed yet"}
                    {e.accepted_in !== null ? ` · on profile version ${e.accepted_in}` : ""}
                  </span>
                </p>
              </div>
              {e.accepted_in === null && (
                <div className="flex flex-wrap gap-2">
                  {e.evidence_id === "E-JIRA-01" && e.review_outcome !== "demonstrated" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          run(
                            "evidence",
                            (s) =>
                              recordEvidenceOutcome(
                                s,
                                e.evidence_id,
                                "revision_requested",
                                "P06 reviewer (stand-in)",
                                now(),
                              ),
                            `${e.evidence_id}: P06 asked the student for a revision.`,
                          )
                        }
                      >
                        Test record: revision
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          run(
                            "evidence",
                            (s) =>
                              recordEvidenceOutcome(
                                s,
                                e.evidence_id,
                                "demonstrated",
                                "P06 reviewer (stand-in)",
                                now(),
                              ),
                            `${e.evidence_id}: P06 recorded the skill as demonstrated.`,
                          )
                        }
                      >
                        Test record: demonstrated
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={() =>
                      run(
                        "evidence",
                        (s) => acceptEvidence(s, "coordinator", e.evidence_id, now()),
                        `${e.evidence_id} accepted. The skill is now reviewed, and the evidence ID is unchanged.`,
                      )
                    }
                  >
                    Accept evidence
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          P06 is not connected yet: E-JIRA-01 and E-PBI-11 are test records. E-SQL-07 and E-PY-02
          are P06’s own records in the class database.
        </p>
        <Note where="evidence" />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Hand-off to other teams" note={`Contract ${CONTRACT_VERSION}`}>
          <p
            className={`rounded-xl px-4 py-3 text-sm ${check.state === "ok" ? "bg-status text-status-foreground" : check.state === "diff" ? "bg-warn text-warn-foreground" : "bg-muted"}`}
          >
            {check.state === "loading"
              ? "Checking the class database…"
              : check.state === "offline"
                ? "The class database could not be reached, so the check did not run."
                : check.text}
          </p>
          {handoff ? (
            <>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  Export of version {handoff.profile.profile_version}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(JSON.stringify(handoff, null, 2));
                    setCopied(true);
                  }}
                >
                  {copied ? "Copied" : "Copy JSON"}
                </Button>
              </div>
              <pre
                tabIndex={0}
                aria-label="Profile export"
                className="mt-2 max-h-64 overflow-auto rounded-xl bg-muted p-3 font-mono text-xs"
              >
                {JSON.stringify(handoff, null, 2)}
              </pre>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing is handed over yet: no version has been reviewed.
            </p>
          )}
        </Panel>

        <div className="min-w-0 space-y-5">
          <Panel
            title="Questions the assistant could not answer"
            note={`${state.questions.filter((q) => q.answer === null).length} open`}
          >
            {state.questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions yet.</p>
            ) : (
              <ul className="space-y-4">
                {state.questions.map((q) => (
                  <li key={q.id} className="text-sm">
                    <p className="font-semibold">
                      {q.question}{" "}
                      <span className="font-mono text-xs font-normal text-muted-foreground">
                        {q.id}
                      </span>
                    </p>
                    {q.answer ? (
                      <p className="text-muted-foreground">Answered: {q.answer}</p>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <Input
                          aria-label={`Answer ${q.id}`}
                          value={answers[q.id] ?? ""}
                          maxLength={300}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        />
                        <Button
                          variant="outline"
                          onClick={() =>
                            run(
                              "questions",
                              (s) =>
                                answerQuestion(s, "coordinator", q.id, answers[q.id] ?? "", now()),
                              `${q.id} answered. The student can see it.`,
                            )
                          }
                        >
                          Answer
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Note where="questions" />
          </Panel>
          <Panel title="Activity" note="Newest first">
            <ol
              className="max-h-64 space-y-2 overflow-y-auto text-sm"
              tabIndex={0}
              aria-label="Activity log"
            >
              {[...state.events].reverse().map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex flex-wrap justify-between gap-x-3">
                  <span>{e.action}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.actor} · {fmt(e.at)}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}
