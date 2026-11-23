import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Sparkles, Wand2, Scissors } from "lucide-react";
import { useState } from "react";
import { askAi } from "@/lib/p02/ai";
import { COMPANIES, type Listing } from "@/lib/p02/data";
import {
  commit,
  postListing,
  updateListing,
  useLaunchpad,
  validateListing,
  type ListingInput,
} from "@/lib/p02/store";
import { SkillPicker } from "./SkillPicker";
import { AiBadge, focus, inputCls, Panel, primaryBtn, quietBtn } from "./ui";

const label = "mb-1.5 block text-sm font-semibold text-heading";
const aiBtn = `inline-flex items-center gap-1 rounded-full border border-[oklch(0.85_0.06_300)] bg-[oklch(0.975_0.015_300)] px-2.5 py-1 text-xs font-semibold text-[oklch(0.48_0.15_300)] hover:bg-[oklch(0.955_0.03_300)] disabled:opacity-50 ${focus}`;

const EMPTY: ListingInput = {
  title: "",
  city: "Abu Dhabi",
  type: "Co-op",
  mode: "On-site",
  duration: "",
  minYear: 0,
  deadline: "",
  required: [],
  preferred: [],
  summary: "",
  description: "",
  requirements: [],
};

/** Post Opportunity and Edit listing, as on Launchpad. Saving sends the listing to the admin as Pending Review. */
export function ListingForm({ existing }: { existing?: Listing }) {
  const lp = useLaunchpad();
  const navigate = useNavigate();
  const [f, setF] = useState<ListingInput>(existing ? { ...existing } : EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ListingInput, string>>>({});
  const [busy, setBusy] = useState("");
  const [aiNote, setAiNote] = useState<{ model: boolean; what: string } | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const company = COMPANIES.find((c) => c.id === (existing?.companyId ?? lp?.companyId));

  const set = <K extends keyof ListingInput>(k: K, v: ListingInput[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const err = (k: keyof ListingInput) =>
    errors[k] && (
      <p id={`${k}-error`} className="mt-1 text-xs text-destructive">
        {errors[k]}
      </p>
    );
  const ctx = {
    title: f.title,
    company: company?.name,
    city: f.city,
    type: f.type,
    mode: f.mode,
    duration: f.duration,
    required: f.required,
    preferred: f.preferred,
  };

  const runAi = async (task: "draft" | "improve" | "shorten", what: string) => {
    if (task !== "draft" && !f.description.trim()) {
      setErrors((e) => ({ ...e, description: "Write or draft a description first." }));
      return;
    }
    if (task === "draft" && !f.title.trim()) {
      setErrors((e) => ({ ...e, title: "Enter a title so the draft knows the role." }));
      return;
    }
    setBusy(task);
    const a = await askAi(
      { task, text: f.description, context: ctx },
      { kind: "Employer AI", title: `${what} for "${f.title || "untitled listing"}"` },
    );
    set("description", a.text);
    setAiNote({ model: a.model, what });
    setBusy("");
  };

  const suggest = async () => {
    setBusy("skills");
    const a = await askAi(
      { task: "suggest_skills", text: f.description, context: ctx },
      { kind: "Employer AI", title: `Suggested skills for "${f.title || "untitled listing"}"` },
    );
    setSuggested(
      (a.items ?? []).filter((s) => !f.required.includes(s) && !f.preferred.includes(s)),
    );
    setBusy("");
  };

  const submit = () => {
    const input: ListingInput = {
      ...f,
      summary:
        f.summary.trim() ||
        (f.description.match(/[^.!?]+[.!?]/)?.[0] ?? f.description).trim().slice(0, 140),
      requirements: f.requirements.length ? f.requirements : f.required.map((s) => `${s} skills`),
    };
    const e = validateListing(input);
    setErrors(e);
    if (Object.keys(e).length) return;
    commit((s) => (existing ? updateListing(s, existing.id, input) : postListing(s, input)));
    void navigate({ to: "/employer/listings" });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/employer/listings"
        className={`mb-5 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground ${focus}`}
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to my listings
      </Link>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Employer</p>
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
        {existing ? "Edit listing" : "Post an opportunity"}
      </h1>
      <p className="mb-8 mt-2 max-w-xl text-muted-foreground">
        {existing
          ? "Saving sends the listing back to the admin. Students see the change after approval."
          : "New listings start as Pending Review and appear to students only after the admin approves them."}
      </p>
      <Panel>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label htmlFor="title" className={label}>
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="title"
              className={inputCls}
              placeholder="Data Analyst Co-op"
              value={f.title}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "title-error" : undefined}
              onChange={(e) => set("title", e.target.value)}
            />
            {err("title")}
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="city" className={label}>
                Location <span className="text-destructive">*</span>
              </label>
              <input
                id="city"
                className={inputCls}
                value={f.city}
                aria-invalid={!!errors.city}
                onChange={(e) => set("city", e.target.value)}
              />
              {err("city")}
            </div>
            <div>
              <label htmlFor="company" className={label}>
                Company
              </label>
              <input
                id="company"
                className={`${inputCls} bg-muted`}
                value={company?.name ?? ""}
                readOnly
              />
            </div>
            <div>
              <label htmlFor="type" className={label}>
                Placement type <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                className={inputCls}
                value={f.type}
                onChange={(e) => set("type", e.target.value as ListingInput["type"])}
              >
                <option>Co-op</option>
                <option>Internship</option>
              </select>
            </div>
            <div>
              <label htmlFor="mode" className={label}>
                Work mode <span className="text-destructive">*</span>
              </label>
              <select
                id="mode"
                className={inputCls}
                value={f.mode}
                onChange={(e) => set("mode", e.target.value as ListingInput["mode"])}
              >
                <option>On-site</option>
                <option>Hybrid</option>
                <option>Remote</option>
              </select>
            </div>
            <div>
              <label htmlFor="duration" className={label}>
                Duration <span className="text-destructive">*</span>
              </label>
              <input
                id="duration"
                className={inputCls}
                placeholder="16 weeks"
                value={f.duration}
                aria-invalid={!!errors.duration}
                onChange={(e) => set("duration", e.target.value)}
              />
              {err("duration")}
            </div>
            <div>
              <label htmlFor="minYear" className={label}>
                Minimum year of study <span className="text-destructive">*</span>
              </label>
              <select
                id="minYear"
                className={inputCls}
                value={f.minYear || ""}
                aria-invalid={!!errors.minYear}
                onChange={(e) => set("minYear", Number(e.target.value))}
              >
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
              {err("minYear")}
            </div>
            <div>
              <label htmlFor="deadline" className={label}>
                Application deadline <span className="text-destructive">*</span>
              </label>
              <input
                id="deadline"
                type="date"
                className={inputCls}
                value={f.deadline}
                aria-invalid={!!errors.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
              {err("deadline")}
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="required" className="text-sm font-semibold text-heading">
                Required skills <span className="text-destructive">*</span>
              </label>
              <button
                type="button"
                className={aiBtn}
                disabled={!!busy}
                onClick={() => void suggest()}
              >
                <Sparkles aria-hidden="true" className="h-3 w-3" />{" "}
                {busy === "skills" ? "Suggesting…" : "Suggest skills"}
              </button>
            </div>
            <SkillPicker
              id="required"
              value={f.required}
              onChange={(v) => set("required", v)}
              placeholder="Add a required skill"
              invalid={!!errors.required}
              describedBy="required-help"
            />
            <p id="required-help" className="mt-1 text-xs text-muted-foreground">
              Required skills: press Enter or comma to add.
            </p>
            {err("required")}
            {suggested.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <AiBadge model={false}>Suggested</AiBadge>
                {suggested.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`rounded-full border border-dashed border-primary/50 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-accent ${focus}`}
                    onClick={() => {
                      set("required", [...f.required, s]);
                      setSuggested((x) => x.filter((y) => y !== s));
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mt-5">
            <label htmlFor="preferred" className={label}>
              Preferred skills
            </label>
            <SkillPicker
              id="preferred"
              value={f.preferred}
              onChange={(v) => set("preferred", v)}
              placeholder="Add a preferred skill"
              describedBy="preferred-help"
            />
            <p id="preferred-help" className="mt-1 text-xs text-muted-foreground">
              Preferred skills: press Enter or comma to add.
            </p>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="description" className="text-sm font-semibold text-heading">
                Description <span className="text-destructive">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className={aiBtn}
                  disabled={!!busy}
                  onClick={() => void runAi("draft", "Drafted description")}
                >
                  <Sparkles aria-hidden="true" className="h-3 w-3" />{" "}
                  {busy === "draft" ? "Drafting…" : "Draft with AI"}
                </button>
                <button
                  type="button"
                  className={aiBtn}
                  disabled={!!busy}
                  onClick={() => void runAi("improve", "Improved wording")}
                >
                  <Wand2 aria-hidden="true" className="h-3 w-3" />{" "}
                  {busy === "improve" ? "Improving…" : "Improve wording"}
                </button>
                <button
                  type="button"
                  className={aiBtn}
                  disabled={!!busy}
                  onClick={() => void runAi("shorten", "Shortened description")}
                >
                  <Scissors aria-hidden="true" className="h-3 w-3" />{" "}
                  {busy === "shorten" ? "Shortening…" : "Make shorter"}
                </button>
              </div>
            </div>
            <textarea
              id="description"
              rows={6}
              className={inputCls}
              value={f.description}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? "description-error" : undefined}
              onChange={(e) => set("description", e.target.value)}
            />
            {aiNote && (
              <p className="mt-1 text-xs text-muted-foreground" role="status">
                <AiBadge model={aiNote.model}>{aiNote.model ? "AI-generated" : "Template"}</AiBadge>{" "}
                {aiNote.what}. Read and edit it before you submit.
              </p>
            )}
            {err("description")}
          </div>
          <div className="mt-5">
            <label htmlFor="summary" className={label}>
              Short summary (optional)
            </label>
            <input
              id="summary"
              className={inputCls}
              value={f.summary}
              onChange={(e) => set("summary", e.target.value)}
            />
          </div>

          <hr className="my-5 border-border" />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={primaryBtn}>
              {existing ? "Save and resubmit" : "Submit for review"}
            </button>
            <Link to="/employer/listings" className={quietBtn}>
              Cancel
            </Link>
            <span className="text-xs text-muted-foreground">
              New listings are reviewed by the admin before students can see them.
            </span>
          </div>
        </form>
      </Panel>
    </div>
  );
}
