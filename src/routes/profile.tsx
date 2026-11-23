import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { SkillPicker } from "@/components/p02/SkillPicker";
import { focus, inputCls, Panel, primaryBtn, RoleGate } from "@/components/p02/ui";
import {
  BIO_LIMIT,
  commit,
  EMPTY_PROFILE,
  saveProfile,
  useLaunchpad,
  validateProfile,
  type Profile,
} from "@/lib/p02/store";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Student profile · IPP" }] }),
  component: ProfilePage,
});

const YEARS = ["2026", "2027", "2028", "2029", "2030"];
const label = "mb-1.5 block text-sm font-semibold text-heading";

function ProfilePage() {
  const lp = useLaunchpad();
  const [p, setP] = useState<Profile>(EMPTY_PROFILE);
  const [errors, setErrors] = useState<Partial<Record<keyof Profile, string>>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (lp?.profile) setP(lp.profile);
  }, [lp?.profile]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
    setSaved(false);
  };
  const err = (k: keyof Profile) =>
    errors[k] && (
      <p id={`${k}-error`} className="mt-1 text-xs text-destructive">
        {errors[k]}
      </p>
    );
  const save = () => {
    const e = validateProfile(p);
    setErrors(e);
    if (Object.keys(e).length) return;
    commit((s) => saveProfile(s, p));
    setSaved(true);
  };

  return (
    <AppShell>
      <RoleGate need="student" view={lp?.view}>
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
                  <label htmlFor="name" className={label}>
                    Full name <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="name"
                    className={inputCls}
                    placeholder="Aisha Al Zaabi"
                    value={p.name}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    onChange={(e) => set("name", e.target.value)}
                  />
                  {err("name")}
                </div>
                <div>
                  <label htmlFor="email" className={label}>
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
                  <label htmlFor="major" className={label}>
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
                  <label htmlFor="year" className={label}>
                    Current year of study
                  </label>
                  <select
                    id="year"
                    className={inputCls}
                    value={p.year}
                    onChange={(e) => set("year", e.target.value)}
                  >
                    <option value="">Select year</option>
                    {[1, 2, 3, 4, 5].map((y) => (
                      <option key={y} value={String(y)}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="gradYear" className={label}>
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
                <div>
                  <label htmlFor="city" className={label}>
                    Preferred location
                  </label>
                  <input
                    id="city"
                    className={inputCls}
                    placeholder="Abu Dhabi"
                    value={p.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="mode" className={label}>
                    Preferred work mode
                  </label>
                  <select
                    id="mode"
                    className={inputCls}
                    value={p.mode}
                    onChange={(e) => set("mode", e.target.value as Profile["mode"])}
                  >
                    <option value="">Any</option>
                    <option>On-site</option>
                    <option>Hybrid</option>
                    <option>Remote</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="interest" className={label}>
                    Career interest
                  </label>
                  <input
                    id="interest"
                    className={inputCls}
                    placeholder="Data or analytics co-op"
                    value={p.interest}
                    onChange={(e) => set("interest", e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="skills" className={label}>
                  Skills
                </label>
                <SkillPicker
                  id="skills"
                  value={p.skills}
                  onChange={(v) => set("skills", v)}
                  placeholder={p.skills.length ? "Add another" : "Type a skill and press Enter"}
                  describedBy="skills-help"
                />
                <p id="skills-help" className="mt-1 text-xs text-muted-foreground">
                  Press Enter or comma to add a skill. Suggestions use the standard skills list.
                </p>
              </div>

              <div className="mt-5">
                <label htmlFor="bio" className={label}>
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
                      See your recommendations
                    </Link>
                  </span>
                )}
              </div>
            </form>
          </Panel>
        </div>
      </RoleGate>
    </AppShell>
  );
}
