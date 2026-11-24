# P01: Student profiles and internship interests (Team 1)

Layla Hassan (COOP-B001, synthetic) writes her goals, availability and skills and submits them. A coordinator asks for clarification or marks a version reviewed, and accepts skill evidence that P06 recorded as demonstrated. The reviewed version is what P01 hands over to P04 and P05.

| Page                 | What it does                                                                                                   | Data                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/p01/profile`       | Draft, save, submit, revise; skills with evidence status; profile assistant; version history | Browser (`store.ts`, key `ipp-p01-v1`); skills and skill suggestions read live from the class database |
| `/p01/coordinator`   | Review queue with changed fields, clarification, evidence, hand-off export, unanswered questions, activity     | Same                                                                                                       |
| `/api/p01/assistant` | Assistant answers with `GROQ_API_KEY` (server only); rules answers without it                                  | Nothing is stored                                                                                          |

## Files

| File           | Role                                                                                               |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `index.ts`     | Public API for other teams (`currentReviewed`, `toFeedRow`, `exportVersion`, …)                    |
| `rules.ts`     | Statuses, versions, access, validation and evidence rules. Pure functions                          |
| `contract.ts`  | Hand-off contract `p01-profile/1`: the row shape of the class database's `profile_feed`            |
| `assistant.ts` | Facts, rules answers, model instructions and checks on model output                                |
| `seed.ts`      | Starting records: copies of the database's COOP-B001 versions 2 and 3, plus declared P06 stand-ins |
| `store.ts`     | Browser store, synced across tabs                                                                  |

## Rules

| Rule                                                                                                                  | Where it is enforced              |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| A submitted version is locked; a change is a new version                                                              | `saveDraft`, `startRevision`      |
| Only the student edits; only a coordinator reviews and accepts evidence                                               | `need()` in every action          |
| An action on an out-of-date page is refused                                                                           | `checkSeen()`                     |
| A skill is reviewed only with demonstrated evidence for that student, with reviewer and date; the evidence ID is kept | `acceptEvidence`, `protectSkills` |
| Only submitted or reviewed versions leave P01; a pending evidence reference does not                                  | `toFeedRow`                       |
| The assistant proposes; the student applies; people decide                                                            | `sanitizePatch`, `parseAssistant` |

Not done yet: writing versions to the class database with `P01_TEAM_KEY` (stage 3 of the data plan).
