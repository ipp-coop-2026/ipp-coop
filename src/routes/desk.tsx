import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  BookOpenCheck,
  CircleHelp,
  GraduationCap,
  Briefcase,
  Send,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  askDesk,
  getSession,
  newSession,
  SESSION_LIMIT,
  type AskReply,
  type DeskRole,
} from "@/lib/p03/desk-client";

// P03 Internship Desk: students and workplace supervisors ask Career Services during the
// internship. Answers come only from the internship guide; anything the guide says the
// university must handle becomes a case in Sara's queue on /admin.
export const Route = createFileRoute("/desk")({
  head: () => ({
    meta: [
      { title: "Internship Desk · IPP" },
      {
        name: "description",
        content:
          "Ask Career Services during your internship. Answers come from the internship guide.",
      },
      { property: "og:title", content: "Internship Desk · IPP" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => (
    <AppShell>
      <DeskPage />
    </AppShell>
  ),
});
type Turn = { id: number; role: DeskRole; question: string; reply?: AskReply; error?: string };

const EXAMPLES: Record<DeskRole, string[]> = {
  student: [
    "How do I log my weekly hours?",
    "I am sick today, who do I tell?",
    "Can I extend my internship to make up sick days?",
  ],
  supervisor: [
    "My intern missed three days and I want to end the internship",
    "When is the evaluation form due?",
    "Can I change the intern's project?",
  ],
};

// One look per outcome: the coloured rule, the label and the icon tell the asker where the message went.
const OUTCOME = {
  answered: {
    label: "Answered from the guide",
    rule: "border-l-status-foreground",
    chip: "bg-status text-status-foreground",
    Icon: BookOpenCheck,
  },
  escalate: {
    label: "Sent to Career Services",
    rule: "border-l-sent-foreground",
    chip: "bg-sent text-sent-foreground",
    Icon: ShieldAlert,
  },
  unknown: {
    label: "Not in the guide yet",
    rule: "border-l-muted-foreground",
    chip: "bg-muted text-muted-foreground",
    Icon: CircleHelp,
  },
} as const;

function Reply({ r }: { r: AskReply }) {
  const o = OUTCOME[r.outcome];
  return (
    <div
      className={`rounded-2xl rounded-tl-md border border-border border-l-4 ${o.rule} bg-card p-4 shadow-sm`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${o.chip}`}
        >
          <o.Icon aria-hidden="true" className="h-3.5 w-3.5" />
          {o.label}
        </span>
        {r.urgency && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.urgency === "High" ? "bg-danger text-danger-foreground" : "bg-warn text-warn-foreground"}`}
          >
            {r.urgency} urgency
          </span>
        )}
      </div>
      <p className="whitespace-pre-line text-[0.95rem] leading-relaxed">{r.answer}</p>
      {r.case_id && (
        <p className="mt-3 rounded-lg bg-sent/60 px-3 py-2 text-xs text-sent-foreground">
          Case <strong>{r.case_id}</strong> is in the coordinator's queue.{" "}
          <Link to="/admin/desk" className="font-semibold underline underline-offset-2">
            Open it as Career Services
          </Link>
        </p>
      )}
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
        <span>
          {r.source === "ai"
            ? "Claude Haiku read the policy file"
            : "AI off: matched the policy file directly"}
        </span>
        {r.section && (
          <>
            <span aria-hidden="true">/</span>
            <span>Source: Internship Guide, {r.section}</span>
          </>
        )}
      </p>
    </div>
  );
}

function Thinking() {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3"
      aria-label="Looking in the guide"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-primary/60 motion-reduce:animate-none"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">Looking in the guide</span>
    </div>
  );
}

function DeskPage() {
  const [role, setRole] = useState<DeskRole>("student");
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(getSession);
  const [remaining, setRemaining] = useState(SESSION_LIMIT);
  const seq = useRef(0);
  const box = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const id = ++seq.current;
    setBusy(true);
    setText("");
    setTurns((t) => [...t, { id, role, question }]);
    try {
      const reply = await askDesk(role, question, session);
      setRemaining(reply.remaining);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, reply } : x)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "The question was not sent.";
      if (typeof (e as { remaining?: number }).remaining === "number")
        setRemaining((e as { remaining: number }).remaining);
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, error: msg } : x)));
    } finally {
      setBusy(false);
      box.current?.focus();
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(text);
    }
  }

  const out = remaining <= 0;
  const restart = () => {
    setSession(newSession());
    setRemaining(SESSION_LIMIT);
    setTurns([]);
  };

  return (
    <div className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:grid-cols-[19rem_1fr]">
      {/* The desk: who is asking, what happens to a message, quick questions */}
      <aside className="bg-panel p-6 text-panel-foreground">
        <p className="text-sm text-panel-muted">Career Services</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight">
          Internship Desk
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-panel-muted">
          Ask the university during your internship. Answers come only from the MBZUAI 2025-2026
          Industry Internship Guide.
        </p>

        <div
          role="group"
          aria-label="Who is asking"
          className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-black/25 p-1"
        >
          {(
            [
              ["student", "Student", GraduationCap],
              ["supervisor", "Supervisor", Briefcase],
            ] as const
          ).map(([r, label, Icon]) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime ${
                role === r ? "bg-lime text-lime-foreground" : "text-panel-muted hover:bg-white/10"
              }`}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <h2 className="mt-7 text-sm font-semibold">Where your message goes</h2>
        <ol className="mt-3 space-y-3 text-sm">
          <li className="flex gap-3">
            <BookOpenCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
            <span>
              <strong className="font-semibold">Answered</strong> when the guide covers it.
            </span>
          </li>
          <li className="flex gap-3">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sent" />
            <span>
              <strong className="font-semibold">Sent to Career Services</strong> when the guide says
              the university must be told.
            </span>
          </li>
          <li className="flex gap-3">
            <CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-panel-muted" />
            <span>
              <strong className="font-semibold">I do not know</strong> when it is not in the guide.
              The coordinator adds an answer.
            </span>
          </li>
        </ol>

        <h2 className="mt-7 text-sm font-semibold">Try asking</h2>
        <div className="mt-3 flex flex-col gap-2" role="group" aria-label="Example questions">
          {EXAMPLES[role].map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy || out}
              onClick={() => void send(q)}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
        <p className="mt-7 text-xs text-panel-muted">
          Do not type personal information. Demo: all records are synthetic.
        </p>
      </aside>

      {/* The conversation */}
      <section aria-labelledby="conv-heading" className="flex min-h-[36rem] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 id="conv-heading" className="text-sm font-semibold text-primary">
            {role === "student"
              ? "Asking as a student on internship"
              : "Asking as a workplace supervisor"}
          </h2>
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> Start new session
          </button>
        </div>

        <div
          className="flex-1 space-y-5 overflow-y-auto bg-background/60 px-5 py-6"
          aria-live="polite"
        >
          {turns.length === 0 && (
            <div className="mx-auto mt-10 max-w-sm text-center">
              <p className="font-display text-2xl font-bold text-foreground">
                What do you need help with?
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sick days, weekly hours, the evaluation form, a problem at work. Ask in your own
                words, or pick a question on the left.
              </p>
            </div>
          )}
          {turns.map((t) => (
            <div key={t.id} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-[0.95rem] text-primary-foreground">
                <span className="sr-only">
                  {t.role === "student" ? "Student" : "Supervisor"} asked:{" "}
                </span>
                {t.question}
              </p>
              <div className="max-w-[92%]">
                {t.error ? (
                  <p className="rounded-2xl border border-border bg-card p-4 text-sm text-destructive">
                    {t.error}
                  </p>
                ) : t.reply ? (
                  <Reply r={t.reply} />
                ) : (
                  <Thinking />
                )}
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(text);
          }}
          className="border-t border-border p-4"
        >
          <label htmlFor="desk-question" className="sr-only">
            Your question
          </label>
          <div className="flex items-end gap-2 rounded-2xl border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
            <textarea
              id="desk-question"
              ref={box}
              rows={2}
              value={text}
              maxLength={600}
              disabled={out}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKey}
              placeholder={
                out
                  ? "Start a new session to ask more."
                  : "Type your question. Enter sends, Shift+Enter adds a line."
              }
              className="max-h-40 min-h-[2.75rem] flex-1 resize-none bg-transparent px-2 py-1.5 text-base placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 md:text-sm"
            />
            <button
              type="submit"
              disabled={busy || out || !text.trim()}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Send aria-hidden="true" className="h-4 w-4" /> Ask
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground" role="status">
            {out
              ? `You have used all ${SESSION_LIMIT} questions for this session.`
              : `${remaining} of ${SESSION_LIMIT} questions left in this session`}
          </p>
        </form>
      </section>
    </div>
  );
}
