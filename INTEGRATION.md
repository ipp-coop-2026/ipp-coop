# Integration handoff: IPP app from Team 1 (P01)

For the cross-team merge into one repository, one deployed app and one database. Read this first, then `README.md`, `docs/data-dictionary.md` and `sprint-2/README.md`.

**This repository:** the common app for all teams (ipp-coop-2026/ipp-coop), started from a snapshot of Team 1's private working repository (GravityCodez/ipp-master) at commit deb1d61, 22 Nov 2026. Sections 1 to 10 are Team 1's handoff and describe their working repository where they say "this repository" or `main`; sections 11 onward cover what has been added here. People are named by team role.

**State on 22 Nov 2026:** `main` builds and deploys. All 52 unit tests pass (`vitest run`). The live app answers on https://ipp-master.onrender.com with the chatbot model on. All data is synthetic.

## 1. What this repository is

- **One web app** built with TanStack Start (React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Vite) and synced two-way with the Lovable project "IPP - Master".
- **Four role views** from Sprint 1, built to the Lab 3 sample structure (one app, four role teams): Student, Employer HR, University Administrator and Faculty Reviewer.
- **Sprint 2 AI features:** the FAQ page and the "Ask IPP" chatbot on every page, and ranked internship recommendations on Student → Recommended.
- **Storage:** records live only in each browser's localStorage (key `ipp-master-demo-v2`). There is no database or login yet. The only server code is `POST /api/chat` and `GET /api/chat`.

## 2. The class teams (LMS, 22 Nov 2026)

| Team | Domain | Contact for the merge |
| --- | --- | --- |
| S1-Team 1 | P01 Student profiles and internship interests | Team 1 integrator; backup: Team 1 data dictionary owner |
| S1-Team 2 | P02 Employer opportunity submission | to name |
| S1-Team 3 | P03 University staff review and publication | Merge lead (proposed) |
| S1-Team 4 | P04 AI discovery and application tracking | to name |
| S1-Team 5 | P05 AI-assisted matching; hosts the shared database | Database host (keys and schema changes) |
| S1-Team 6 | P06 Internship preparation LMS | to name |
| S1-Team 7 | P07 Co-op learning and progress | Chief Product Owner / Product Integration Coordinator (role given by the instructor, per the Scrum of Scrums chat, 16 Nov) |

## 3. Which parts of this app belong to which team

Team 1 built every view here. For Employer HR, Admin and Faculty it used the instructor's bundle text, and the owning teams have not yet accepted those stories (D-15 in `docs/decisions.md`). In the seven-team split, ownership is:

| Route / feature | What it does | Owner in the 7-team split | Merge advice |
| --- | --- | --- | --- |
| `/student` → My profile | Student record, display name | **P01 (Team 1)** | Keep. Move to `students` and `profile_versions` in the shared database |
| `/student` → Opportunities, My applications | Search approved listings, apply, track status | P04 (Team 4) | Replace with or merge into Team 4's version |
| `/student` → Recommended | Rules-based top three with reasons and gaps | P05 (Team 5) | Stand-in; Team 5's engine and `recommendations` table should replace it |
| `/employer` | Submit an opportunity (Pending Review) | P02 (Team 2) | Stand-in built from the bundle text |
| `/admin` | Review queue, approve | **P03 (Team 3)** | Stand-in built from the bundle text |
| `/faculty` | Read-only list of applications with REV-### | No P0x owner (a Lab 3 role) | Decide at the Scrum of Scrums: drop it, or give it to P04 or P07 |
| `/faq`, Ask IPP chatbot | Answers only from approved FAQ v1 (8 questions), cites sources, hands anything else to the co-op office | Cross-cutting (Sprint 2) | Keep as a shared component; the FAQ text needs Product Owner sign-off |

## 4. Code map

| Path | Contents |
| --- | --- |
| `src/routes/` | One file per role view (`student`, `employer`, `admin`, `faculty`, `faq`), `__root.tsx` (layout, `AppShell`), `index.tsx` (redirects to `/student`), `api/chat.ts` (server route) |
| `src/lib/ipp-store.ts` | Record types, seed data, ID rules and pure helpers (`addOpportunity`, `approveOpportunity`, `submitApplication`, `facultyApplicationRecords`). **This is the one place to swap localStorage for the shared database.** |
| `src/lib/ai/knowledge.ts` | FAQ v1, the SK- skill vocabulary, synthetic match profiles and listings |
| `src/lib/ai/matching.ts` | `recommend()`: scoring, reasons, gaps; eligibility kept out of the score |
| `src/lib/ai/chat.ts` | Prompt building, FAQ lookup fallback and answer safeguards |
| `src/components/` | `AppShell`, `ChatWidget`, `Recommendations`, shadcn/ui in `ui/` |
| `src/test/` | Unit tests for the store, routing, matching and chatbot safeguards |
| `docs/`, `sprint-1/`, `sprint-2/` | Requirements, data dictionary, decisions, test cases and results, Scrum of Scrums records |

## 5. Run, test, build

```bash
bun install --frozen-lockfile     # or: npx -y bun@1.4.0 install --frozen-lockfile
bun run dev                       # http://localhost:8080
bun run test                      # vitest, 52 tests
NITRO_PRESET=node-server bun run build && node .output/server/index.mjs
```

- Without `NITRO_PRESET=node-server` the build targets Cloudflare (the Lovable default).
- Do not add plugins to `vite.config.ts`: `@lovable.dev/vite-tanstack-config` already includes them.
- Copy `.env.example` to `.env.local` for local keys. Without `GROQ_API_KEY` the chatbot answers from the FAQ lookup.

## 6. Deployment

| Target | How it deploys | Notes |
| --- | --- | --- |
| Render web service `ipp-master` (https://ipp-master.onrender.com) | Automatically on every commit to `main` | Free plan, Frankfurt. The first visit after 15 idle minutes takes about a minute. `GROQ_API_KEY` is set only in Render. `render.yaml` in this repository reproduces the service as a Blueprint |
| Lovable publish (https://ipp-master.lovable.app) | Manual republish by the Lovable workspace owner | Chatbot in FAQ lookup mode (no key there) |

**For the merged app:** deploy one Render web service from the merged repository with the same build and start commands (`render.yaml`). Set secrets only as Render environment variables: `GROQ_API_KEY` and, once the app writes to the shared database, each team's write key (server side only). Nothing secret goes in the code or the repository.

**Lovable sync:** the working repository (not this snapshot) is connected to Lovable on `main`. Never force-push or rewrite `main`'s history, or the Lovable project loses its history. If the merge moves to a new repository, this one can stay as Team 1's archive.

## 7. The shared database and how this app maps to it

Team 5 hosts one Supabase (PostgreSQL) database for all seven teams. The guide is `SUPABASE_GUIDE.md`, shared by Team 5 in the class Scrum of Scrums chat on 16 Nov 2026. Summary:

- Project URL `https://zbcgneyhwuswyxeaufjh.supabase.co`. Anyone can read with the publishable key. To write, send your team's key in the `x-team-key` header (ask Team 5; keys go one to one, never in git).
- Each table has one owner team (`table_owners`). Versions are append-only (a change is a new row with `version + 1`) and nobody can delete through the API.
- Read-friendly views: `current_profiles`, `profile_feed`, `open_listings`, `opportunity_feed`, `latest_recommendations`.
- Team 1 already wrote P01 records with its key: synthetic student COOP-P001 (Mira Haddad) has three profile versions, and v3 shows in `current_profiles`.

### Record mapping (this app → shared database)

| This app (`ipp-store.ts`) | Shared database | Gaps to resolve |
| --- | --- | --- |
| Student `student_id`, `display_name`, `eligibility_status` | `students` (`student_id`, `full_name`, `programme`, `year`) plus `profile_versions` | No eligibility column. Profiles are versioned with a status (draft / submitted / clarification_requested / reviewed) |
| Employer `employer_id`, `organization_name`, `hr_user_id`, `hr_authorized` | `employers` (`employer_id`, `name`, `sector`, `city`) | No HR user or authorization columns |
| Opportunity `opportunity_id`, `title`, `description`, `location`, `work_mode`, `duration`, `approval_status` | `opportunity_versions` (versioned; `city`, `work_arrangement` in lower case, `start_date` and `end_date` instead of `duration`, `submission_status`), `opportunity_conditions`, `listings` (`approved_version`, `listing_status`) | `approval_status` "Approved" = a `listing_reviews` row with decision `approved` plus a `listings` row. Students see only `version = approved_version` |
| Application `application_id`, `opportunity_id`, `student_id`, `application_status`, `submitted_at` | `applications` (adds `opportunity_version`, `profile_version`; `status` in lower case) plus `application_events` | Record the versions at submission |
| Faculty, Faculty review `REV-###` | none | **ID clash:** the shared database uses `REV-0001` for P03 listing reviews |
| Placement status (display only, "Not placed") | `placements` (P04, confirmed by a named person) | none |
| Match fixtures, `recommend()` output | `current_profiles`, `open_listings`, `recommendations` (P05 writes) | See the skill mapping below |

### Seed differences (checked against the shared database on 22 Nov 2026)

| ID | This app | Shared database |
| --- | --- | --- |
| EMP-001 / EMP-002 | Evergreen Labs / Northstar Analytics | Gulf Airside Services / Falcon Freight Logistics |
| OP-026 | Product Design Intern, Boston MA | Airport Ground Operations Data Intern, Dubai |
| OP-027 | Data Analytics Intern, Cambridge MA | Logistics Network Analytics Intern, Abu Dhabi |
| OP-028 | Created live in the demo, On-site | Version 2, hybrid, already approved |
| EMP-003, APP-028, COOP-B001 | Same thread (Emirates Group, Layla Hassan) | Same |

When the app reads the shared database, use its records and drop the local seeds. COOP-B001 to B006 and OP-026 to OP-031 carry P05's planted test problems, so do not edit them; use the sandbox (`COOP-Z001`, `EMP-999`, `OP-999`).

### Skill vocabulary mapping (this app's 14 SK- IDs → the shared 44)

| Same ID | Renamed | No shared term yet |
| --- | --- | --- |
| SK-PY-01, SK-SQL-01, SK-JIRA-01, SK-ML-01, SK-STAT-01, SK-JS-01, SK-GIT-01 | SK-EXCEL-01 → SK-XLS-01; SK-COMM-01 → SK-COM-01; SK-UXR-01 → SK-UX-01; SK-FIGMA-01 and SK-PROTO-01 → SK-FIG-01; SK-VIZ-01 → SK-PBI-01 (Power BI) or SK-TAB-01 (Tableau), by synonym | SK-TEST-01 (software testing): P01 or P06 may add it and tell P05 |

## 8. Suggested merge order (proposal for the Scrum of Scrums)

1. Each team shares its repository or prototype link with a one-paragraph summary: stack, routes, data source, deploy URL.
2. Agree on one shell app and one deploy target. This app already has role routes, a deploy pipeline, tests and the chatbot. Other teams' apps can be ported in as routes (for example `/p02/...`) or linked during the transition.
3. Adopt the shared database as the single system of record. Start read-only (the views in section 7), replacing localStorage and fixtures one view at a time.
4. Add writes only through server routes that read each team's key from the environment. Never put keys in the browser bundle.
5. For each domain, keep the owning team's version. Remove the stand-ins in this app (`/employer`, `/admin`, the Recommended engine) once the owning team's version works against the database, unless that team accepts the stand-in.
6. Run the tests before every push to the deployed branch, keep the shared ID formats, and use synthetic data only.

## 9. Rules for anyone editing this repository

- Synthetic data only. No real names, emails or student records.
- No keys, tokens or passwords in code, commits, issues or chat. `.env.local` is git-ignored.
- Do not rewrite or force-push `main` (Lovable sync, Render deploys from it).
- Shared field names, ID formats and statuses change only through the Scrum of Scrums (`docs/decisions.md`).
- Recommendations are decision support. Placements are confirmed by a named person, never by code. Eligibility stays separate from ranking.

## 10. Open questions

1. Who owns the merged repository, the Render service and the Lovable project? All three are on one student's personal accounts today (D-11 allowed this for Sprint 1).
2. Which app is the shell, and do teams with other stacks port their code or stay linked?
3. Who owns the Faculty view, and what replaces `REV-###`?
4. Has the instructor approved the shared database as a scope change? Team 5's guide says it was agreed; Team 1 has not seen the instructor's confirmation.
5. Employer listings need required and desirable skill IDs (AI-09) before matching can read them.

## 11. Team 3 (P03) additions in the common repository

Added by Team 3 on 23 Nov 2026, on top of Team 1's snapshot (commit 5384ca9).

| Route / file | What it does |
| --- | --- |
| `/admin` | P03 review and publication, replacing the Team 1 stand-in: five-check review checklist, request changes with a reason, resubmission as a new version, approve, publish, close or withdraw, version history and a decision log. Logic in `src/lib/p03/review.ts`, tests in `src/test/p03-review.test.ts`. |
| `/employer` (one section) | "Listings with changes requested": the employer sees the reason and resubmits. A small P03 hook inside Team 2's stand-in. |
| `/desk` | Internship Desk (Sprint 2 AI feature): students and workplace supervisors ask Career Services during the internship. Answers only from the internship guide's policy entries; problems the guide says the university must handle become cases; questions it cannot answer go to an "unanswered" list. |
| `/admin` → Internship desk | Sara's side of the desk: open cases sorted by urgency, "hear both sides" and root cause before closing a case, add policy entries from unanswered questions. |
| `/api/desk/state`, `/api/desk/ask`, `/api/desk/admin` | Server routes in `src/routes/api/desk.$action.ts`, logic in `src/lib/p03/desk-server.ts` and `desk-core.ts`. |

Desk server settings (environment variables, server side only, never in git):

- `ANTHROPIC_API_KEY`: optional. With it, Claude Haiku reads the policy entries and sorts each message. Without it, the desk matches the policy entries directly. Limits: 10 questions per browser session, 150 AI calls per day.
- `DESK_REDIS_URL`: optional Redis REST endpoint so every visitor sees the same cases. Without it, desk records live in server memory and reset on restart. When Team 5 gives P03 a write key for the shared Supabase, `desk-server.ts` is the one file to change.

Added later on 23 Nov (the AI reviewer, review rules, Decline, and the shared-database queue):

| Route / file | What it does |
| --- | --- |
| `/admin` → AI reviewer, review rules, Decline | Claude Haiku reads a listing against the five checks and the coordinator's rules and drafts a reason (`/api/ai-review`, `ANTHROPIC_API_KEY`); suggestions only. Decline needs a reason and is final. |
| `/admin/shared` | Sara's review queue on Team 5's shared database: every team's listings, read live through `@/lib/db`. Stages and rules in `src/lib/p03/README.md`. |
| `/api/p03/review` | P03 writes to `listing_reviews` and `listings` with `P03_TEAM_KEY` (server only). Off without the key; `P03_WRITE_SCOPE=sandbox` (default) allows only `OP-999`, `all` allows every listing except the protected demo thread `OP-026`…`OP-031`. Re-reads the database before every write, so a stale page cannot overwrite a newer decision. Checked live against the sandbox on 23 Nov. |

Review IDs: P03 uses `REV-0001` (four digits), the shared database format. Team 1's faculty reviews use `REV-028`; that clash is still open (section 10, question 3).

## 12. Hosting on Cohesivity (one command)

Besides Render, the app can run on a Cohesivity Cloudflare Worker:

```bash
node deploy/cohesivity.mjs               # build, bundle and deploy (worker name: ipp-coop)
node deploy/cohesivity.mjs --no-deploy   # build and bundle only, to .deploy/worker.js
```

- Needs a `.cohesivity` credentials file at the repository root (gitignored), or `COHESIVITY_FILE=/path/to/.cohesivity`.
- Server keys are embedded only when named: `COH_SECRETS=ANTHROPIC_API_KEY,DESK_REDIS_URL node deploy/cohesivity.mjs`. They go into the worker, never into the browser bundle or the repository.
- Cohesivity workers run with an old Cloudflare compatibility date and without `nodejs_compat`. `deploy/shims/` supplies the four Node modules the build imports and a web streams fallback for React's streaming render. If a new dependency imports another `node:` module, add a shim there.
- Static files are embedded in the worker (about 1.3 MB in total today).

## 13. Team 5 (P05) in the common repository

Added by Team 5 on 23 Nov 2026.

| Step | What | When |
| --- | --- | --- |
| Now | Nav entry "P05 Matching" under **Team modules (external)** opens Team 5's prototype, https://thecyper.github.io/bus2010-p05-opportunity-matcher/, which already reads the shared database live (391 students, 209 published listings) | Sprint 3 |
| Next | `src/lib/p05/`: the P05 matching engine ported to TypeScript with its tests (rules baseline `rules-1.0.0` and the AI method `ai-embed-1.0.0`, gte-small sentence embeddings); Student → Recommended uses it instead of the stand-in in `src/lib/ai/matching.ts` | Phase 2 |
| Ready | `src/lib/db/`: read-only client for the shared Supabase views that every team can import (`getCurrentProfiles`, `getProfileFeed`, `getOpenListings`, `getOpportunityFeed`, `getSkills`, `getDemonstratedEvidence`, `getLatestRecommendations`, plus the AI helpers `getAiSignals`, `scoreGoalLive`, `suggestSkillsLive`). Fetch only, no new dependency; paging, timeouts and `SharedDbError`. Override the project with `VITE_SHARED_DB_URL` and `VITE_SHARED_DB_KEY` | Phase 2 |
| Later | P05 writes (recommendations, skill-gap events) through a server route with `P05_TEAM_KEY` from the host environment | Phase 3 |

Source for the external module: https://github.com/TheCYPER/bus2010-p05-opportunity-matcher (guide for teams: `docs/SUPABASE_GUIDE.md`).

