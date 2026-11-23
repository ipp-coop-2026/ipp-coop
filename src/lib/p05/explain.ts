/**
 * Plain-language wording for P05 results (ported from the prototype's UI). Students are not expected to know
 * recruiting jargon: three answers only, each with a word, and one concrete thing to do.
 */
import type { ConditionResult, Profile, Recommendation, VocabTerm } from "./types";

export type Tone = "go" | "todo" | "no";

const SHORT: Record<string, string> = {
  "SK-SQL-01": "SQL", "SK-PY-01": "Python", "SK-PBI-01": "Power BI", "SK-TAB-01": "Tableau", "SK-XLS-01": "Excel",
  "SK-STAT-01": "Statistics", "SK-JIRA-01": "Jira", "SK-AGL-01": "Agile and Scrum", "SK-ML-01": "Machine learning",
  "SK-AVN-01": "Aviation operations", "SK-SCM-01": "Supply-chain analytics", "SK-GIS-01": "GIS mapping", "SK-ARB-01": "Arabic",
  "SK-COM-01": "Communication",
};

export function skillName(id: string, vocab: VocabTerm[]): string {
  return SHORT[id] ?? vocab.find((v) => v.skill_id === id)?.label ?? id;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "not given";
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MON[Number(m) - 1] ?? ""} ${y}`;
}

export function verdict(r: Recommendation): { tone: Tone; label: string } {
  if (r.status === "eligible") return { tone: "go", label: "Can apply" };
  if (r.status === "cannot_confirm") {
    const n = r.mandatory.filter((c) => c.state === "cannot_confirm").length;
    return { tone: "todo", label: n > 1 ? `${n} things to do` : "One thing to do" };
  }
  if (r.status === "excluded") return { tone: "no", label: "Closed" };
  return { tone: "no", label: "Not a fit now" };
}

function todoText(c: ConditionResult, vocab: VocabTerm[]): string {
  if (c.kind === "skill" && c.skill_id) return `Get ${skillName(c.skill_id, vocab)} verified.`;
  if (c.kind === "availability") return "Add your end date to your profile.";
  return "Say how you want to work.";
}

/** One line under a job: what it means for the student now. */
export function rowLine(r: Recommendation, vocab: VocabTerm[], closedOn: string | null): string {
  if (r.status === "excluded") return closedOn ? `Applications closed on ${fmtDate(closedOn)}.` : "Not open for applications.";
  if (r.status === "eligible") return r.mandatory.length ? "You meet every requirement." : "No fixed requirements, so anyone can apply.";
  if (r.status === "cannot_confirm") return r.mandatory.filter((c) => c.state === "cannot_confirm").map((c) => todoText(c, vocab)).join(" ");
  const n = r.mandatory.find((c) => c.state === "not_met");
  if (!n) return "";
  if (n.kind === "skill" && n.skill_id) return `Needs ${skillName(n.skill_id, vocab)}, which is not on your profile.`;
  if (n.kind === "availability") return "Your dates do not cover the placement.";
  return `Needs ${n.label}.`;
}

/** Up to four plain reasons why a job was suggested. */
export function whyLines(r: Recommendation, vocab: VocabTerm[]): string[] {
  const out: string[] = [];
  r.mandatory.forEach((c) => { if (c.kind === "skill" && c.state === "met" && c.skill_id) out.push(`You have verified ${skillName(c.skill_id, vocab)}, which it requires.`); });
  r.ai_notes.forEach((n) => { if (n.kind === "goal_similarity" && n.via === "embedding" && (n.fit ?? 0) >= 0.5) out.push(`Your goals are close in meaning to this job (AI similarity ${n.score}).`); });
  r.interests.forEach((it) => {
    if (!it.matched || !it.value) return;
    if (it.kind === "sector") out.push(`It is in ${it.value}, a sector you picked.`);
    if (it.kind === "role") out.push(`It is ${/^[aeiou]/i.test(it.value) ? "an" : "a"} ${it.value} role, which you are looking for.`);
    if (it.kind === "city") out.push(it.value === "Remote" ? "It is remote, which you said you are open to." : `It is in ${it.value}, where you want to work.`);
  });
  r.desirable.forEach((c) => { if (c.state === "met" && c.skill_id) out.push(`You have ${skillName(c.skill_id, vocab)}, which is nice to have.`); });
  return out.slice(0, 4);
}

/** Plain wording for one requirement in the details view. */
export function requirementText(c: ConditionResult, r: Recommendation, profile: Profile, vocab: VocabTerm[]): { name: string; text: string } {
  const L = r.listing;
  if (c.kind === "skill" && c.skill_id) {
    const name = skillName(c.skill_id, vocab);
    if (c.state === "met") return { name, text: "Verified by skills training." };
    if (c.state === "cannot_confirm") return { name, text: "You listed it yourself, but it has not been verified yet." };
    return { name, text: "Not on your profile." };
  }
  if (c.kind === "availability") {
    const a = profile.availability;
    if (c.state === "met") return { name: "Your dates", text: `You are free for the whole placement, ${fmtDate(L?.start_date)} to ${fmtDate(L?.end_date)}.` };
    if (c.state === "cannot_confirm") return { name: "Your dates", text: `Your profile is missing ${!a.start ? "a start date" : "an end date"}, so this cannot be checked.` };
    return { name: "Your dates", text: a.start && L?.start_date && a.start > L.start_date ? `You start ${fmtDate(a.start)}, but the job starts ${fmtDate(L.start_date)}.` : `You are free until ${fmtDate(a.end)}, but the job runs until ${fmtDate(L?.end_date)}.` };
  }
  if (c.state === "met") return { name: "How you work", text: `You are open to ${L?.work_arrangement ?? "this"} work.` };
  if (c.state === "cannot_confirm") return { name: "How you work", text: "Your profile does not say how you want to work." };
  return { name: "How you work", text: `The job needs ${c.label}; your profile says ${profile.work_arrangements.join(" or ")} only.` };
}

/** Which source the AI part of a result came from, in words. */
export function aiSourceText(r: Recommendation): string {
  if (r.ai_source === "embedding") return "AI similarity: pretrained gte-small model";
  if (r.ai_source === "lexical-fallback") return "AI helper (simulated: word overlap, because no AI score was available)";
  if (r.ai_source === "lexical") return "AI helper (simulated: word overlap)";
  return "";
}
