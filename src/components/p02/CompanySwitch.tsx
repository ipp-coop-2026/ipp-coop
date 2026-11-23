import { COMPANIES, EMPLOYER_SWITCH } from "@/lib/p02/data";
import { commit, useLaunchpad } from "@/lib/p02/store";
import { focus } from "./ui";

/** "Viewing as" switch between the three demo employers, as on Launchpad. */
export function CompanySwitch() {
  const lp = useLaunchpad();
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Viewing as:
      </span>
      <div
        role="group"
        aria-label="Employer"
        className="flex flex-wrap rounded-full border border-border bg-muted p-0.5"
      >
        {EMPLOYER_SWITCH.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={lp?.companyId === id}
            onClick={() => commit((s) => ({ ...s, companyId: id }))}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${focus} ${lp?.companyId === id ? "bg-card text-heading shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {COMPANIES.find((c) => c.id === id)?.name}
          </button>
        ))}
      </div>
    </div>
  );
}
