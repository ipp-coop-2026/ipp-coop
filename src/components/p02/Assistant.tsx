import { MessageCircle, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FAQ } from "@/lib/p02/data";
import { askAi } from "@/lib/p02/ai";
import { companyName, focus } from "./ui";
import { commit, logAi, useLaunchpad } from "@/lib/p02/store";

type Turn = { who: "you" | "bot"; text: string; model?: boolean };

/** Questions per browser session, as on Team 2's FAQ assistant. Keeps AI use (and cost) small. */
export const SESSION_LIMIT = 10;
const USED_KEY = "ipp-assistant-used";
const readUsed = () => {
  try {
    return Number(window.sessionStorage.getItem(USED_KEY)) || 0;
  } catch {
    return 0;
  }
};

/**
 * Launchpad's assistants. Students: "IPP Assistant", answers only from the approved FAQ.
 * Employers: "AI assistant", limited to the employer's own listings and applicants.
 */
export function Assistant() {
  const s = useLaunchpad();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(0);
  useEffect(() => {
    setUsed(readUsed());
  }, []);
  const end = useRef<HTMLDivElement>(null);
  const employer = s?.view === "employer";
  useEffect(() => {
    setTurns([]);
  }, [employer]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [turns]);
  if (!s || s.view === "admin") return null;

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    if (used >= SESSION_LIMIT) return;
    const n = used + 1;
    setUsed(n);
    try {
      window.sessionStorage.setItem(USED_KEY, String(n));
    } catch {
      /* ignore */
    }
    setText("");
    setTurns((t) => [...t, { who: "you", text: question }]);
    if (question === "Talk to a human") {
      commit((st) =>
        logAi(st, {
          kind: "Chatbot",
          title: "Hand-off to a person",
          detail: "Student asked to talk to a human.",
          model: false,
        }),
      );
      setTurns((t) => [
        ...t,
        {
          who: "bot",
          text: "I have passed your request to the co-op coordinator. They will reply to your university email within two working days.",
        },
      ]);
      return;
    }
    setBusy(true);
    const context = employer
      ? {
          company: companyName(s.companyId),
          listings: s.listings
            .filter((l) => l.companyId === s.companyId)
            .map((l) => ({
              title: l.title,
              status: l.status,
              deadline: l.deadline,
              applicants: s.applications.filter((a) => a.listingId === l.id).length,
            })),
          applications: s.applications
            .filter((a) => s.listings.find((l) => l.id === a.listingId)?.companyId === s.companyId)
            .map((a) => ({
              listing: s.listings.find((l) => l.id === a.listingId)?.title,
              status: a.status,
            })),
        }
      : undefined;
    const a = await askAi(
      {
        task: employer ? "employer_chat" : "chat",
        text: question,
        ...(context ? { context } : {}),
      },
      {
        kind: "Chatbot",
        title: `${employer ? "Employer" : "Student"} asked: "${question.slice(0, 80)}"`,
      },
    );
    setTurns((t) => [...t, { who: "bot", text: a.text, model: a.model }]);
    setBusy(false);
  };

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={employer ? "AI assistant" : "IPP Assistant"}
          className="fixed bottom-20 right-4 z-40 flex h-[32rem] max-h-[75vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
        >
          <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-heading">
                {employer ? "AI assistant" : "IPP Assistant"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {employer
                  ? "AI-generated · only your own listings and applicants"
                  : "AI-generated · answers from approved FAQ"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => setOpen(false)}
              className={`rounded-md p-1 hover:bg-muted ${focus}`}
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm" aria-live="polite">
            <p className="rounded-xl bg-muted px-3 py-2">
              {employer
                ? `Hi! I can answer questions about ${companyName(s.companyId)}'s listings and applicants.`
                : "Hi! I am the IPP assistant. I can answer questions about applying, your application status and eligibility."}
            </p>
            {turns.map((t, i) =>
              t.who === "you" ? (
                <p key={i} className="ml-8 rounded-xl bg-primary px-3 py-2 text-primary-foreground">
                  {t.text}
                </p>
              ) : (
                <div key={i} className="mr-6 rounded-xl border border-border px-3 py-2">
                  {t.model !== undefined && (
                    <p className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.48_0.15_300)]">
                      <Sparkles aria-hidden="true" className="h-3 w-3" />{" "}
                      {t.model ? "AI-generated" : "Approved FAQ"}
                    </p>
                  )}
                  <p className="whitespace-pre-line">{t.text}</p>
                </div>
              ),
            )}
            {busy && <p className="text-xs text-muted-foreground">Thinking…</p>}
            {used >= SESSION_LIMIT && (
              <p className="rounded-xl bg-warn px-3 py-2 text-xs text-warn-foreground">
                You have used your {SESSION_LIMIT} questions for this session. For anything else,
                contact the co-op coordinator.
              </p>
            )}
            <div ref={end} />
          </div>
          {!employer && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {[...FAQ.map((f) => f.q), "Talk to a human"].map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={busy || used >= SESSION_LIMIT}
                  onClick={() => void send(q)}
                  className={`rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50 ${focus}`}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <label htmlFor="assistant-q" className="sr-only">
              Your question
            </label>
            <input
              id="assistant-q"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask a question"
              className={`min-w-0 flex-1 rounded-lg border border-input px-3 py-2 text-sm ${focus}`}
            />
            <button
              type="submit"
              aria-label="Send"
              disabled={busy || !text.trim() || used >= SESSION_LIMIT}
              className={`rounded-lg bg-primary px-3 text-primary-foreground disabled:opacity-50 ${focus}`}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="px-3 pb-2 text-[11px] text-muted-foreground">
            {Math.max(SESSION_LIMIT - used, 0)} of {SESSION_LIMIT} questions left in this session
          </p>
        </section>
      )}
      {employer ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full bg-heading px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${focus}`}
        >
          <Sparkles aria-hidden="true" className="h-4 w-4" /> Ask AI assistant
        </button>
      ) : (
        <button
          type="button"
          aria-label="Open IPP assistant"
          onClick={() => setOpen((o) => !o)}
          className={`fixed bottom-4 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ${focus}`}
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      )}
    </>
  );
}
