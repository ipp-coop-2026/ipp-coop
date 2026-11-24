# Sprint 3, Team 1 (P01): student profiles and internship interests

Sprint goal: handle exceptions and evidence, connect P01 to the class data, and give students one assistant that can talk about their own profile. Stage from the project binder: "Address exceptions and evidence. Connect agreed interfaces and test status, version and access rules."

## User stories

| ID | Story | Acceptance | Status |
| --- | --- | --- | --- |
| S3-01 | As a student, I submit a complete profile and get a clear message when something is missing or the dates are wrong | Required fields and date ranges block submission; the draft is kept | Done |
| S3-02 | As a coordinator, I ask for clarification or mark a version reviewed; the student sees the comment and revises | Status and comment visible; each revision is a new version; old versions never change | Done |
| S3-03 | As a coordinator, I accept skill evidence only when it was reviewed as demonstrated | Jira stays self-declared until E-JIRA-01 is accepted; reviewer, date and the original evidence ID are recorded | Done |
| S3-04 | As a partner team, I receive one profile format | `p01-profile/1` round-trips the class database rows; a contract test shows P05's engine reads our versions | Done |
| S3-05 | As a student, I talk to an assistant about my profile and it proposes changes I can apply | Proposal shown before anything changes; only draft fields; skills are added as self-declared | Done |
| S3-06 | As a student, I see what people still decide about my profile, and questions the assistant cannot answer go to a person | Profile review and skill evidence shown with owner and state; unanswered questions reach the coordinator and the answer comes back | Done |

## Test results

| Check | Result |
| --- | --- |
| Unit tests (`bun run test`) | 212 of 212 pass, 75 of them for P01 |
| Type check and build | Pass |
| End-to-end run in Chrome (Team 1 build) | 48 of 48 pass, no console errors |
| Class database check | 0 differences in 14 fields for COOP-B001 versions 2 and 3 |
| Widths 390, 820, 1100 and 1280 px | No sideways scroll |

## Exceptions shown

| Exception | What happens |
| --- | --- |
| Missing field, impossible date, end before start, availability already over | Message beside the field; not submitted |
| Submitting a locked version, or a second draft | Refused with the reason |
| Two people act on the same profile | The out-of-date page is refused and told the new state |
| Pending, revision-requested or not-demonstrated evidence | Refused; the skill stays self-declared |
| Evidence of another student, accepted twice, or without a reviewer | Refused |
| A student or the assistant tries to mark a skill reviewed | Put back to self-declared |
| Skill not in the shared list | Kept as written; nearest shared skill suggested for the student to choose |
| Question outside the profile and FAQ | Fixed handoff; a coordinator answers |

## Limits

- Records stay in the browser. Writing to the class database needs the P01 team key and is planned for Sprint 4.
- P06 is not connected: E-JIRA-01 and E-PBI-11 are test records.
- Recommendations, applications, evidence review and listings belong to Teams 5, 4, 6, 2 and 3 and are not part of this module.
- The role switch is simulated; there is no login.
- Tests were scripted by the integrator. Hand repeat and peer tasks are still to do.
