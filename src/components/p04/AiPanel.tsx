/**
 * P04 AI panel: shows the helper's steps one by one, then writes the answer word by word.
 * Answers come from the rules in src/lib/p04/ai.ts (labelled "Rules-based", as every rules answer in
 * this app is). Stop, regenerate, copy and a helpful / not helpful rating; "New information" when the
 * records change after an answer was made. Respects reduced motion.
 */
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Status } from "@/components/AppShell";
import { AiBadge, focus, quietBtn } from "@/components/p02/ui";
import { AI_KINDS, AI_NAME, generate, hashStr, plural, type AiKind, type Directory, type P04State } from "@/lib/p04";

const PURPLE_BTN = `inline-flex items-center justify-center gap-1.5 rounded-lg bg-[oklch(0.48_0.15_300)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[oklch(0.42_0.15_300)] ${focus}`;

interface Done {
  variant: number;
  text: string;
  steps: string[];
  sources: string[];
  secs: number;
  sig: string;
  stopped: boolean;
  rating: "up" | "down" | null;
}

/** Answers survive page changes within the visit, like a chat history. */
const answers = new Map<string, Done>();

type Phase =
  | { kind: "idle" }
  | { kind: "think"; step: number; started: number }
  | { kind: "stream"; pos: number };

export function AiPanel({
  kind,
  id,
  s,
  dir,
  now,
  className = "",
}: {
  kind: AiKind;
  id: string;
  s: P04State;
  dir: Directory;
  now: number;
  className?: string;
}) {
  const key = `${kind}:${id}`;
  const K = AI_KINDS[kind];
  const probe = useMemo(() => generate(kind, s, dir, id, 0, now), [kind, s, dir, id, now]);
  const sig = "na" in probe ? "na" : String(hashStr(probe.text));
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [done, setDone] = useState<Done | undefined>(() => answers.get(key));
  const [elapsed, setElapsed] = useState(0);
  const [openSteps, setOpenSteps] = useState(false);
  const [note, setNote] = useState("");
  const run = useRef<{ res: { steps: string[]; text: string; sources: string[] }; variant: number; secs: number; timers: number[] } | null>(null);

  useEffect(() => {
    setDone(answers.get(key));
    setPhase({ kind: "idle" });
  }, [key]);
  useEffect(() => () => stopTimers(), []);

  function stopTimers() {
    run.current?.timers.forEach((t) => window.clearTimeout(t));
    run.current?.timers.forEach((t) => window.clearInterval(t));
  }

  function finish(d: Done) {
    answers.set(key, d);
    setDone(d);
    setPhase({ kind: "idle" });
    run.current = null;
  }

  function start(regen: boolean) {
    stopTimers();
    setNote("");
    const prev = answers.get(key);
    const variant = regen && prev ? prev.variant + 1 : (prev?.variant ?? 0);
    const res = generate(kind, s, dir, id, variant, now);
    if ("na" in res) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const seed = hashStr(`${key}:${variant}`);
    const started = Date.now();
    const r = { res, variant, secs: 0, timers: [] as number[] };
    run.current = r;
    setOpenSteps(false);
    setPhase({ kind: "think", step: 0, started });
    setElapsed(0);
    r.timers.push(window.setInterval(() => setElapsed((Date.now() - started) / 1000), 100));
    const stepTime = (i: number) => (reduce ? 120 : 450 + ((seed >>> (i * 3)) % 7) * 90);
    let step = 0;
    const nextStep = () => {
      if (run.current !== r) return;
      step++;
      if (step < res.steps.length) {
        setPhase({ kind: "think", step, started });
        r.timers.push(window.setTimeout(nextStep, stepTime(step)));
        return;
      }
      r.secs = (Date.now() - started) / 1000;
      r.timers.forEach((t) => window.clearInterval(t));
      setPhase({ kind: "stream", pos: 0 });
      r.timers.push(window.setTimeout(() => stream(0), reduce ? 0 : 250));
    };
    const stream = (pos0: number) => {
      if (run.current !== r) return;
      const text = res.text;
      let pos = pos0;
      if (reduce) pos = text.length;
      else {
        let n = 1 + ((seed + pos) % 3);
        while (n-- > 0 && pos < text.length) {
          const m = /^\s*\S+/.exec(text.slice(pos));
          pos += m ? m[0].length : text.length - pos;
        }
      }
      if (pos < text.length) {
        setPhase({ kind: "stream", pos });
        const ch = text[pos - 1];
        r.timers.push(window.setTimeout(() => stream(pos), ch === "." || text[pos] === "\n" ? 140 : 22 + ((seed + pos) % 4) * 9));
        return;
      }
      finish({ variant, text, steps: res.steps, sources: res.sources, secs: r.secs, sig, stopped: false, rating: null });
    };
    r.timers.push(window.setTimeout(nextStep, stepTime(0)));
  }

  function stop() {
    const r = run.current;
    stopTimers();
    if (r && phase.kind === "stream")
      finish({ variant: r.variant, text: r.res.text.slice(0, phase.pos), steps: r.res.steps, sources: r.res.sources, secs: r.secs, sig, stopped: true, rating: null });
    else {
      run.current = null;
      setPhase({ kind: "idle" });
    }
  }

  function copy() {
    if (!done) return;
    const plain = done.text
      .replace(/\{\{badge:([^}]+)\}\}/g, "($1)")
      .replace(/\{\{link:[^}]+\}\}/g, "")
      .replace(/\*\*|^_|_$/gm, "")
      .replace(/^\[!\] /gm, "Check: ")
      .replace(/^- \[!\] /gm, "- Check: ")
      .replace(/^- \[ok\] /gm, "- ");
    if (!navigator.clipboard) {
      setNote("Copy is not available in this browser.");
      return;
    }
    navigator.clipboard.writeText(plain).then(
      () => setNote("Copied."),
      () => setNote("Copy is not available in this browser."),
    );
  }

  function rate(v: "up" | "down") {
    if (!done) return;
    const d = { ...done, rating: done.rating === v ? null : v };
    answers.set(key, d);
    setDone(d);
    setNote(d.rating ? "Thanks for the feedback." : "");
  }

  let body: ReactNode;
  if ("na" in probe) body = <p className="text-sm text-muted-foreground">{probe.na}</p>;
  else if (phase.kind !== "idle" && run.current) {
    const res = run.current.res;
    body = (
      <>
        {phase.kind === "think" ? (
          <>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-heading">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-[oklch(0.48_0.15_300)]" />
              Thinking <span className="text-muted-foreground tabular-nums">{elapsed.toFixed(1)}s</span>
            </p>
            <Steps steps={res.steps} upTo={phase.step} />
          </>
        ) : (
          <p className="mb-2 text-xs text-muted-foreground">
            Thought for {run.current.secs.toFixed(1)}s · {plural(res.steps.length, "step")}
          </p>
        )}
        <div aria-live="polite">
          {phase.kind === "stream" && (
            <Md text={res.text.slice(0, phase.pos)} cursor />
          )}
        </div>
        <button type="button" onClick={stop} className={`mt-3 ${quietBtn}`}>
          Stop generating
        </button>
      </>
    );
  } else if (done && done.sig === sig) {
    body = (
      <>
        <button
          type="button"
          aria-expanded={openSteps}
          onClick={() => setOpenSteps((o) => !o)}
          className={`mb-2 inline-flex items-center gap-1 rounded text-xs text-muted-foreground hover:text-foreground ${focus}`}
        >
          {done.stopped ? "Stopped" : `Thought for ${done.secs.toFixed(1)}s`} · {plural(done.steps.length, "step")}
          <ChevronDown aria-hidden="true" className={`h-3 w-3 transition-transform ${openSteps ? "rotate-180" : ""}`} />
        </button>
        {openSteps && <Steps steps={done.steps} upTo={done.steps.length} />}
        <Md text={done.text} />
        {done.stopped && <p className="mt-2 text-xs text-muted-foreground">Generation stopped.</p>}
        <div className="mt-4 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground">
            {AI_NAME} · rules-based, built from {done.sources.join(", ")}. It can be wrong: check it before you act. Faculty make every decision.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => start(true)} className={quietBtn}>
              Regenerate
            </button>
            <button type="button" onClick={copy} className={quietBtn}>
              Copy
            </button>
            <button type="button" aria-pressed={done.rating === "up"} onClick={() => rate("up")} className={`${quietBtn} ${done.rating === "up" ? "bg-status text-status-foreground" : ""}`}>
              Helpful
            </button>
            <button type="button" aria-pressed={done.rating === "down"} onClick={() => rate("down")} className={`${quietBtn} ${done.rating === "down" ? "bg-danger text-danger-foreground" : ""}`}>
              Not helpful
            </button>
            <span role="status" className="text-xs text-muted-foreground">
              {note}
            </span>
          </div>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="mb-3 text-sm text-muted-foreground">{K.intro}</p>
        {done && (
          <p className="mb-3 text-xs">
            <Status tone="blue">New information</Status>{" "}
            <span className="text-muted-foreground">The records changed since the last answer.</span>
          </p>
        )}
        <button type="button" onClick={() => start(false)} className={PURPLE_BTN}>
          <Sparkles aria-hidden="true" className="h-4 w-4" /> {K.button}
        </button>
      </>
    );
  }

  return (
    <section
      aria-label={K.title}
      className={`rounded-2xl border border-[oklch(0.9_0.05_300)] bg-card shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-[oklch(0.9_0.05_300)] bg-[oklch(0.975_0.015_300)] px-5 py-3">
        <h2 className="inline-flex items-center gap-1.5 text-base font-bold text-heading">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-[oklch(0.48_0.15_300)]" /> {K.title}
        </h2>
        <AiBadge model={false} />
      </div>
      <div className="px-5 py-4">{body}</div>
    </section>
  );
}

function Steps({ steps, upTo }: { steps: string[]; upTo: number }) {
  return (
    <ol className="mb-3 space-y-1 border-l-2 border-[oklch(0.9_0.05_300)] pl-3 text-sm">
      {steps.map((t, i) => (
        <li key={i} className={`flex items-center gap-2 ${i > upTo ? "text-muted-foreground/60" : i === upTo ? "text-heading" : "text-muted-foreground"}`}>
          {i < upTo ? (
            <Check aria-hidden="true" className="h-3.5 w-3.5 text-status-foreground" />
          ) : i === upTo ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-[oklch(0.48_0.15_300)]" />
          ) : (
            <span aria-hidden="true" className="inline-block h-3.5 w-3.5 rounded-full border border-border" />
          )}
          {t}
        </li>
      ))}
    </ol>
  );
}

// ---------- Light markdown: ## and ### headings, - and 1. lists, > quote, **bold**, whole-line _italics_ ----------

const BADGE_TONE: Record<string, "red" | "amber" | "green" | "gray"> = {
  "Needs attention": "red",
  Watch: "amber",
  "On track": "green",
  "Too early to tell": "gray",
};

function Inline({ text }: { text: string }) {
  const clean = text.replace(/\{\{[^}]*\}?$/, "");
  const parts = clean.split(/(\*\*[^*]+\*\*|\{\{badge:[^}]+\}\}|\{\{link:[^:}]+:[^}]+\}\})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**") && p.length > 4)
          return (
            <strong key={i} className="font-semibold text-heading">
              {p.slice(2, -2)}
            </strong>
          );
        const b = /^\{\{badge:([^}]+)\}\}$/.exec(p);
        if (b) return <Status key={i} tone={BADGE_TONE[b[1] ?? ""] ?? "gray"}>{b[1]}</Status>;
        const l = /^\{\{link:([^:}]+):([^}]+)\}\}$/.exec(p);
        if (l)
          return (
            <Link key={i} to="/p04/internship/$id" params={{ id: l[1] ?? "" }} className={`ml-1 font-semibold text-primary hover:underline ${focus}`}>
              {l[2]}
            </Link>
          );
        return <Fragment key={i}>{p.replace(/\*\*/g, "")}</Fragment>;
      })}
    </>
  );
}

type Block =
  | { t: "h"; level: 2 | 3; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "quote"; text: string }
  | { t: "p"; text: string; em: boolean };

function blocks(md: string): Block[] {
  const out: Block[] = [];
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      out.push({ t: "p", text: "", em: false });
      continue;
    }
    const last = out[out.length - 1];
    let m: RegExpExecArray | null;
    if ((m = /^(#{2,3}) (.*)$/.exec(line))) out.push({ t: "h", level: m[1] === "##" ? 2 : 3, text: m[2] ?? "" });
    else if ((m = /^- (.*)$/.exec(line))) {
      if (last?.t === "ul") last.items.push(m[1] ?? "");
      else out.push({ t: "ul", items: [m[1] ?? ""] });
    } else if ((m = /^\d+\. (.*)$/.exec(line))) {
      if (last?.t === "ol") last.items.push(m[1] ?? "");
      else out.push({ t: "ol", items: [m[1] ?? ""] });
    } else if ((m = /^> (.*)$/.exec(line))) out.push({ t: "quote", text: m[1] ?? "" });
    else if (line.startsWith("_")) out.push({ t: "p", text: line.replace(/^_|_$/g, ""), em: true });
    else out.push({ t: "p", text: line, em: false });
  }
  return out.filter((b) => !(b.t === "p" && !b.text));
}

function Item({ text }: { text: string }) {
  if (text.startsWith("[!] "))
    return (
      <>
        <Status tone="amber">Check</Status> <Inline text={text.slice(4)} />
      </>
    );
  if (text.startsWith("[ok] "))
    return (
      <>
        <Status tone="green">Good</Status> <Inline text={text.slice(5)} />
      </>
    );
  return <Inline text={text} />;
}

function Md({ text, cursor = false }: { text: string; cursor?: boolean }) {
  const bs = blocks(text);
  const caret = cursor ? <span aria-hidden="true" className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-[oklch(0.48_0.15_300)]" /> : null;
  return (
    <div className="space-y-2 text-sm text-card-foreground">
      {bs.map((b, i) => {
        const end = i === bs.length - 1 ? caret : null;
        if (b.t === "h")
          return b.level === 2 ? (
            <h3 key={i} className="pt-1 text-sm font-bold text-heading">
              <Inline text={b.text} />
              {end}
            </h3>
          ) : (
            <h4 key={i} className="flex flex-wrap items-center gap-2 pt-2 text-sm font-bold text-heading">
              <Inline text={b.text} />
              {end}
            </h4>
          );
        if (b.t === "ul" || b.t === "ol") {
          const List = b.t === "ul" ? "ul" : "ol";
          return (
            <List key={i} className={`space-y-1 pl-5 ${b.t === "ul" ? "list-disc" : "list-decimal"}`}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <Item text={it} />
                  {j === b.items.length - 1 ? end : null}
                </li>
              ))}
            </List>
          );
        }
        if (b.t === "quote")
          return (
            <blockquote key={i} className="rounded-r-lg border-l-4 border-[oklch(0.8_0.08_300)] bg-[oklch(0.975_0.015_300)] px-3 py-2 text-heading">
              <Inline text={b.text} />
              {end}
            </blockquote>
          );
        return (
          <p key={i} className={b.em ? "italic text-muted-foreground" : ""}>
            <Inline text={b.text} />
            {end}
          </p>
        );
      })}
      {!bs.length && caret}
    </div>
  );
}
