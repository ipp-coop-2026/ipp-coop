import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { focus } from "@/components/p02/ui";
import { suggestSkillsLive, type SkillSuggestion } from "@/lib/db";
import {
  addSkills,
  ARRANGEMENTS,
  GOALS_MAX,
  mapSkill,
  type FieldErrors,
  type ProfileContent,
  type Term,
} from "@/lib/p01";
import { Button, Input, Label, Textarea, labelCls } from "./kit";
import { SkillBadge, skillName } from "./shared";

const FieldError = ({ id, text }: { id: string; text: string | undefined }) =>
  text ? (
    <p id={id} className="mt-1 text-xs text-destructive">
      {text}
    </p>
  ) : null;

function Chips({
  label,
  hint,
  values,
  error,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  values: string[];
  error: string | undefined;
  disabled: boolean;
  onChange: (v: string[]) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const add = () => {
    const t = text.trim().slice(0, 60);
    if (t && !values.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...values, t]);
    setText("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  };
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div
        className={`flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border px-2 py-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring ${error ? "border-destructive" : "border-input"} ${disabled ? "bg-muted" : "bg-card"}`}
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {v}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className={`rounded ${focus}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            id={id}
            value={text}
            placeholder={values.length ? "Add another" : hint}
            autoComplete="off"
            className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground/70"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            onBlur={add}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        )}
        {!values.length && disabled && <span className="text-sm text-muted-foreground">none</span>}
      </div>
      <FieldError id={`${id}-error`} text={error} />
    </div>
  );
}

function Skills({
  value,
  vocab,
  error,
  disabled,
  onChange,
}: {
  value: ProfileContent;
  vocab: Term[];
  error: string | undefined;
  disabled: boolean;
  onChange: (c: ProfileContent) => void;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [hints, setHints] = useState<{ phrase: string; list: SkillSuggestion[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const add = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    setHints(null);
    onChange(addSkills(value, [t], vocab));
    if (mapSkill(t, vocab)) return;
    // Not in the shared list: ask P05's live model for the nearest terms. A person still decides.
    setBusy(true);
    try {
      const list = (await suggestSkillsLive(t)).filter((s) => s.suggested);
      setHints({ phrase: t, list });
    } catch {
      setHints({ phrase: t, list: [] });
    } finally {
      setBusy(false);
    }
  };
  const use = (s: SkillSuggestion, phrase: string) => {
    const without = {
      ...value,
      unmapped_skills: value.unmapped_skills.filter(
        (x) => x.toLowerCase() !== phrase.toLowerCase(),
      ),
    };
    onChange(addSkills(without, [s.skill_id], vocab));
    setHints(null);
  };
  return (
    <div>
      <Label htmlFor={id}>Skills</Label>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {value.skills.map((s) => (
          <li
            key={s.skill_id}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
          >
            <SkillBadge skill={s} name={skillName(vocab, s.skill_id)} />
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${skillName(vocab, s.skill_id)}`}
                onClick={() =>
                  onChange({
                    ...value,
                    skills: value.skills.filter((x) => x.skill_id !== s.skill_id),
                  })
                }
              >
                Remove
              </Button>
            )}
          </li>
        ))}
        {value.unmapped_skills.map((u) => (
          <li key={u} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <span>
              <span className="block font-medium">{u}</span>
              <span className="text-xs text-muted-foreground">
                Not in the shared list. Kept for a person to map, never matched silently.
              </span>
            </span>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${u}`}
                onClick={() =>
                  onChange({
                    ...value,
                    unmapped_skills: value.unmapped_skills.filter((x) => x !== u),
                  })
                }
              >
                Remove
              </Button>
            )}
          </li>
        ))}
        {!value.skills.length && !value.unmapped_skills.length && (
          <li className="px-4 py-3 text-sm text-muted-foreground">No skills yet.</li>
        )}
      </ul>
      {!disabled && (
        <div className="mt-2 flex gap-2">
          <Input
            id={id}
            value={text}
            list={`${id}-list`}
            placeholder="Add a skill, for example Tableau"
            autoComplete="off"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void add();
              }
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          <datalist id={`${id}-list`}>
            {vocab.map((t) => (
              <option key={t.skill_id} value={t.label} />
            ))}
          </datalist>
          <Button type="button" variant="outline" onClick={() => void add()}>
            Add
          </Button>
        </div>
      )}
      {busy && (
        <p role="status" className="mt-2 text-sm text-muted-foreground">
          Looking for the nearest shared skill…
        </p>
      )}
      {hints && !disabled && (
        <p role="status" className="mt-2 text-sm">
          {hints.list.length ? (
            <>
              “{hints.phrase}” is not in the shared list. Did you mean{" "}
              {hints.list.map((s) => (
                <button
                  key={s.skill_id}
                  type="button"
                  className="mr-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
                  onClick={() => use(s, hints.phrase)}
                >
                  {s.label} ({Math.round(s.similarity * 100)}%)
                </button>
              ))}
            </>
          ) : (
            <>“{hints.phrase}” is kept as written for a coordinator to map.</>
          )}
        </p>
      )}
      <FieldError id={`${id}-error`} text={error} />
    </div>
  );
}

const Row = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-5 sm:grid-cols-2">{children}</div>
);

export function ProfileForm({
  value,
  errors,
  vocab,
  disabled,
  onChange,
}: {
  value: ProfileContent;
  errors: FieldErrors;
  vocab: Term[];
  disabled: boolean;
  onChange: (c: ProfileContent) => void;
}) {
  const set = <K extends keyof ProfileContent>(k: K, v: ProfileContent[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="p01-goals">What I want to learn</Label>
        <Textarea
          id="p01-goals"
          rows={3}
          value={value.goals}
          disabled={disabled}
          maxLength={GOALS_MAX + 50}
          onChange={(e) => set("goals", e.target.value)}
          aria-invalid={!!errors.goals}
          aria-describedby={errors.goals ? "p01-goals-error" : undefined}
        />
        <FieldError id="p01-goals-error" text={errors.goals} />
      </div>
      <Row>
        <Chips
          label="Sectors"
          hint="For example aviation"
          values={value.sectors}
          error={errors.sectors}
          disabled={disabled}
          onChange={(v) => set("sectors", v)}
        />
        <Chips
          label="Roles"
          hint="For example data analyst"
          values={value.roles}
          error={errors.roles}
          disabled={disabled}
          onChange={(v) => set("roles", v)}
        />
      </Row>
      <Row>
        <Chips
          label="Locations"
          hint="For example Dubai"
          values={value.locations}
          error={errors.locations}
          disabled={disabled}
          onChange={(v) => set("locations", v)}
        />
        <fieldset>
          <legend className={labelCls}>Ways of working</legend>
          <div className="flex min-h-11 flex-wrap items-center gap-4">
            {ARRANGEMENTS.map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={value.work_arrangements.includes(a)}
                  disabled={disabled}
                  onChange={(e) =>
                    set(
                      "work_arrangements",
                      e.target.checked
                        ? [...value.work_arrangements, a]
                        : value.work_arrangements.filter((x) => x !== a),
                    )
                  }
                />
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </label>
            ))}
          </div>
          <FieldError id="p01-arr-error" text={errors.work_arrangements} />
        </fieldset>
      </Row>
      <Row>
        {(
          [
            ["available_from", "Available from"],
            ["available_to", "Available to"],
          ] as const
        ).map(([k, label]) => (
          <div key={k}>
            <Label htmlFor={`p01-${k}`}>{label}</Label>
            <Input
              id={`p01-${k}`}
              type="date"
              value={value[k] ?? ""}
              disabled={disabled}
              onChange={(e) => set(k, e.target.value || null)}
              aria-invalid={!!errors[k]}
              aria-describedby={errors[k] ? `p01-${k}-error` : undefined}
            />
            <FieldError id={`p01-${k}-error`} text={errors[k]} />
          </div>
        ))}
      </Row>
      <Skills
        value={value}
        vocab={vocab}
        error={errors.skills}
        disabled={disabled}
        onChange={onChange}
      />
    </div>
  );
}
