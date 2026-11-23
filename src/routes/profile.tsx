import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { focus, inputCls, Panel, primaryBtn } from "@/components/p02/ui";
import {
  addSkills,
  BIO_LIMIT,
  commitStudent,
  EMPTY_PROFILE,
  saveProfileTo,
  useStudent,
  validateProfile,
  type Profile,
} from "@/lib/p02/student-store";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Student profile · IPP" }] }),
  component: ProfilePage,
});

const YEARS = ["2026", "2027", "2028", "2029", "2030"];

function ProfilePage() {
  const student = useStudent();
  const [p, setP] = useState<Profile>(EMPTY_PROFILE);
  const [skill, setSkill] = useState("");
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (student?.profile) setP(student.profile);
  }, [student?.profile]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setSaved(false);
  };
  const onSkillKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      set("skills", addSkills(p.skills, skill));
      setSkill("");
    } else if (e.key === "Backspace" && !skill && p.skills.length) {
      set("skills", p.skills.slice(0, -1));
    }
  };
  const save = () => {
    const withTyped = { ...p, skills: addSkills(p.skills, skill) };
    const e = validateProfile(withTyped);
    setErrors(e);
    if (Object.keys(e).length) return;
    commitStudent((s) => saveProfileTo(s, withTyped));
    setP(withTyped);
    setSkill("");
    setSaved(true);
  };
  const err = (k: keyof Profile) =>
    errors[k] && (
      <p id={`${k}-error`} className="mt-1 text-xs text-destructive">
        {errors[k]}
      </p>
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <PageHeader
          step="Step 1 of 4"
          title="Student profile"
          subtitle="This is what placement teams see when you apply. It takes about a minute."
        />
        <Panel>
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-1.5 block text-sm font-semibold text-heading"
                >
                  Full name <span className="text-destructive">*</span>
                </label>
                <input
                  id="fullName"
                  className={inputCls}
                  placeholder="Aisha Al Zaabi"
                  value={p.fullName}
                  aria-invalid={!!errors.fullName}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  onChange={(e) => set("fullName", e.target.value)}
                />
                {err("fullName")}
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-heading">
                  University email <span className="text-destructive">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={inputCls}
                  placeholder="aisha@university.ac.ae"
                  value={p.email}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  onChange={(e) => set("email", e.target.value)}
                />
                {err("email")}
              </div>
              <div>
                <label htmlFor="major" className="mb-1.5 block text-sm font-semibold text-heading">
                  Major
                </label>
                <input
                  id="major"
                  className={inputCls}
                  placeholder="Business Analytics"
                  value={p.major}
                  onChange={(e) => set("major", e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="gradYear"
                  className="mb-1.5 block text-sm font-semibold text-heading"
                >
                  Graduation year
                </label>
                <select
                  id="gradYear"
                  className={inputCls}
                  value={p.gradYear}
                  onChange={(e) => set("gradYear", e.target.value)}
                >
                  <option value="">Select year</option>
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5">
              <label htmlFor="skills" className="mb-1.5 block text-sm font-semibold text-heading">
                Skills
              </label>
              <div
                className={`flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-2 py-1.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring`}
              >
                {p.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                  >
                    {s}
                    <button
                      type="button"
                      aria-label={`Remove ${s}`}
                      className={`rounded ${focus}`}
                      onClick={() =>
                        set(
                          "skills",
                          p.skills.filter((x) => x !== s),
                        )
                      }
                    >
                      <X aria-hidden="true" className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  id="skills"
                  className="min-w-40 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground/70"
                  placeholder={p.skills.length ? "Add another" : "Type a skill and press Enter"}
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  onKeyDown={onSkillKey}
                  aria-describedby="skills-help"
                />
              </div>
              <p id="skills-help" className="mt-1 text-xs text-muted-foreground">
                Press Enter or comma to add a skill.
              </p>
            </div>

            <div className="mt-5">
              <label htmlFor="bio" className="mb-1.5 block text-sm font-semibold text-heading">
                Short bio
              </label>
              <textarea
                id="bio"
                rows={4}
                maxLength={BIO_LIMIT}
                className={inputCls}
                placeholder="Two or three sentences about what you study, what you enjoy and what you are looking for."
                value={p.bio}
                onChange={(e) => set("bio", e.target.value)}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {p.bio.length}/{BIO_LIMIT}
              </p>
            </div>

            <hr className="my-5 border-border" />
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className={primaryBtn}>
                Save profile
              </button>
              <span className="text-xs text-muted-foreground">Fields marked * are required.</span>
              {saved && (
                <span role="status" className="text-sm font-medium text-status-foreground">
                  Profile saved.{" "}
                  <Link to="/opportunities" className={`underline ${focus}`}>
                    Browse opportunities
                  </Link>
                </span>
              )}
            </div>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
