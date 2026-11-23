import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { SKILLS } from "@/lib/p02/data";
import { focus } from "./ui";

/**
 * Skill chips limited to the 18 standard skills (Team 2's Sprint 3 corrective action: free-typed skills
 * like "Programing" did not match and scores dropped). Type to filter, Enter or comma to add.
 */
export function SkillPicker({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  describedBy,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const listId = useId();
  const options = SKILLS.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(text.trim().toLowerCase()),
  );
  const add = (raw: string) => {
    const hit =
      SKILLS.find((s) => s.toLowerCase() === raw.trim().toLowerCase()) ??
      (raw.trim() ? options[0] : undefined);
    if (!raw.trim()) return;
    if (!hit) {
      setNote(`"${raw.trim()}" is not on the standard skills list.`);
      return;
    }
    if (!value.includes(hit)) onChange([...value, hit]);
    setText("");
    setNote("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(text);
    } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
  };
  return (
    <div>
      <div
        className={`flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border bg-card px-2 py-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring ${invalid ? "border-destructive" : "border-input"}`}
      >
        {value.map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {s}
            <button
              type="button"
              aria-label={`Remove ${s}`}
              className={`rounded ${focus}`}
              onClick={() => onChange(value.filter((x) => x !== s))}
            >
              <X aria-hidden="true" className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          list={listId}
          className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground/70"
          placeholder={placeholder}
          value={text}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(e) => {
            setText(e.target.value);
            setNote("");
          }}
          onKeyDown={onKey}
          onBlur={() => text.trim() && add(text)}
        />
        <datalist id={listId}>
          {options.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>
      {note && (
        <p role="alert" className="mt-1 text-xs text-warn-foreground">
          {note}
        </p>
      )}
    </div>
  );
}
