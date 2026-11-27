# P04: Faculty Review (Team 4)

Faculty follow each intern **after the placement is confirmed**: a progress report every 2 weeks, one video meeting a month, feedback from the workplace supervisor, and a final Pass/Fail grade from the faculty advisor. Four rules-based AI helpers support faculty. They only suggest; faculty decide.

A placement counts as confirmed when a Launchpad application (P02) has the status **Approved**. P04 then creates the internship that day.

## Pages

| Page | Who | What it does |
| --- | --- | --- |
| `/p04` | Faculty | Dashboard: interns, reports to review, meeting requests, ready to grade, AI early warning for all interns |
| `/p04/internship/$id` | Faculty | Overview (AI internship brief, AI early warning), Reports, Meetings (AI meeting prep, invite), Supervisor feedback, Grade |
| `/p04/report/$id` | Faculty | Read a report, AI report summary, mark reviewed or request changes |
| `/p04/calendar` | Faculty | Free times, meeting requests, next three weeks |
| `/p04/student` | Student | My internship: submit and revise reports, book or answer meetings, see the grade |
| `/p04/employer` | Employer HR | Intern feedback for the faculty advisor (students do not see it) |

The footer link "Faculty review (Team 4)" opens `/p04`. "Reset demo data" also resets P04.

## Data

Browser only for now, under `ipp-p04-faculty-v1`. Students, listings and companies are read from Launchpad (`src/lib/p02`), never copied. P04 keeps internships (`PLC-###`), reports (`RPT-###`), slots (`SLOT-###`), meetings (`MTG-###`), grades (`GRD-###`) and supervisor feedback (`HRC-###`). All synthetic.

Seed, dated relative to the reset:

| Intern | Launchpad application | State | Early warning |
| --- | --- | --- | --- |
| Latifa Al Suwaidi, UX/UI Design Intern, Hikma Health Tech | `app-02` | Ended 3 days ago, ready to grade | On track |
| Rashed Al Falasi, Machine Learning Co-op, Falcon AI Labs | `app-06` | In progress, one late report, supervisor has some concerns | Watch |
| Aisha Al Zaabi, Data Analyst Co-op, Aldar Digital Studio | `app-13` | In progress, report overdue, changes pending, missed meeting, serious concerns | Needs attention |

Approving Hamad Al Blooshi (`app-03`, Shortlisted) in Employer → Applicants starts a fourth internship ("Too early to tell").

## Rules

- Reports are due every 14 days from the start; the last is due on the end date. Statuses: Not yet due, Due, Overdue, Missing (after the end), Submitted, Changes requested, Reviewed.
- One completed meeting per 30-day month. A slot holds one meeting; a student has at most one open meeting per month.
- Grading opens on the end date: Pass or Fail with a reason of 20+ characters, then locked. Late or missing work shows as warnings and never blocks the grade.
- Supervisor feedback comes only from the intern's own company, from the start until the grade.

## AI helpers (`ai.ts`)

| Helper | Where | Uses |
| --- | --- | --- |
| Internship brief | Internship → Overview | Listing, company, dates |
| Report summary | Report page | The report, the one before, due and sent dates |
| Meeting prep | Internship → Meetings | Last reports, supervisor feedback, meeting history |
| Early warning | Dashboard, Internship → Overview | A points score: missing (+3) or overdue (+2) reports, changes waiting 7+ days (+2), each late report (+1), each missed month (+2), no meeting by day 15 (+1), supervisor serious (+4) or some (+2) concerns, no feedback after 28 days (+1), problem words in the latest report (+1). 0–1 On track, 2–4 Watch, 5+ Needs attention; first 14 days "Too early to tell" |

Each helper is labelled "Rules-based", shows its steps, then writes the answer word by word, with stop, regenerate, copy and a helpful rating. It works without any model key and never changes a record.

## Next

- Read confirmed placements from the shared database (`placements` is P04's table) instead of Launchpad's local applications.
- Write reports, meetings and grades through a server route with `P04_TEAM_KEY`, once Team 5 adds the tables.
- Optionally log each AI answer in the Admin AI Review Log.

Tests: `src/test/p04-faculty-review.test.ts`.
