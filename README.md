<div align="center">

# IPP: Internship Practicum Platform

**One shared app for the BUS 2010 Co-op project.** Employers post internships, the university reviews and publishes them, students apply, and everyone gets help from an AI desk during the internship.

[![CI](https://github.com/ipp-coop-2026/ipp-coop/actions/workflows/ci.yml/badge.svg)](https://github.com/ipp-coop-2026/ipp-coop/actions/workflows/ci.yml)
[![Live demo](https://img.shields.io/badge/live%20demo-online-2f6b3f)](https://coh-ipp-coop-26b134973f81406a.cohesivity.workers.dev)
![TanStack Start](https://img.shields.io/badge/TanStack%20Start-React%2019-1f3b2c)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

[Live demo](https://coh-ipp-coop-26b134973f81406a.cohesivity.workers.dev) · [Architecture](docs/ARCHITECTURE.md) · [Workflow and plan](docs/WORKFLOW.md) · [Contributing](CONTRIBUTING.md) · [Integration guide](INTEGRATION.md)

<img src="docs/screenshots/admin-review.jpg" alt="University Administrator review queue with the AI reviewer and the five-check checklist" width="860">

</div>

> **Demo data only.** Every person, organization and listing is synthetic. Role switching is simulated; there is no real login.

## What it does

The common app uses **Group 2's Launchpad** (P02, Employer) as its interface and base, agreed by the teams on 23 Nov 2026. One listing goes from employer to university to student, with AI that only suggests and a person who decides at every step.

| View | Pages | Built by |
| --- | --- | --- |
| Student | Profile, Opportunities with "Recommended for you", My Applications, IPP Assistant | **Group 2 (P02)** Launchpad; Internship Desk by Team 3 (P03) |
| Employer | Dashboard with insights and top candidates, My Listings, Applicants, Post Opportunity with AI drafting | **Group 2 (P02)** |
| Admin | Admin Review (listings and placements), AI Review Log | **Group 2 (P02)**; listing checklist and AI reviewer by Team 3 (P03); shared listing queue (P03) and match checks (Team 5, P05) |

### AI features

| Feature | Where | Built by | Human in charge |
| --- | --- | --- | --- |
| IPP Assistant (FAQ chatbot) | Student, floating button | Group 2 (P02) | Answers only from the approved FAQ; "Talk to a human" hands off to the co-op coordinator |
| Recommended for you | Student → Opportunities | Group 2 (P02) | Suggestions with reasons; placements are approved by a person |
| Draft with AI, Improve wording, Make shorter, Suggest skills | Employer → Post Opportunity | Group 2 (P02) | The employer edits and submits; the admin approves the listing |
| AI analysis, interview questions, message drafts, AI assistant | Employer → Applicants | Group 2 (P02) | Only a person can shortlist or reject |
| AI Review Log | Admin | Group 2 (P02) | Every AI output is logged |
| AI reviewer and five-check checklist | Admin → pending listings | Team 3 (P03) | The coordinator ticks every check and decides |
| Internship Desk | Student | Team 3 (P03) | Problems go to Career Services |

Every AI feature works without a model key (approved FAQ, rules or templates) and says so on screen.

## Quick start

```bash
npx -y bun@1.4.0 install --frozen-lockfile
npx -y bun@1.4.0 run dev      # http://localhost:8080
npx -y bun@1.4.0 run test     # 73 unit tests
npx -y bun@1.4.0 run build
```

Optional server-side keys (never in git; use `.env.local` locally or the host's settings):

| Variable | Turns on |
| --- | --- |
| `GROQ_API_KEY` | AI answers in the FAQ chatbot |
| `ANTHROPIC_API_KEY` | AI reviewer and AI answers in the Internship Desk |
| `DESK_REDIS_URL` | Desk cases shared across devices (otherwise kept in server memory) |

## Deploying

| Host | Command | Notes |
| --- | --- | --- |
| Cohesivity (shared demo) | `node deploy/cohesivity.mjs` | Needs a `.cohesivity` file (gitignored). See [INTEGRATION.md §12](INTEGRATION.md) |
| Render (Team 1) | [`render.yaml`](render.yaml) | Build: `NITRO_PRESET=node-server bun run build`; start: `node .output/server/index.mjs` |

## Project structure

```text
src/
  routes/            one file per page (/student, /employer, /admin, /faculty, /desk, /faq)
    api/             server routes: chat, ai-review, desk
  components/        AppShell, Internship Desk admin, shadcn/ui
  lib/
    ipp-store.ts     shared records and seed data (Team 1)
    ai/              FAQ chatbot and matching (Team 1)
    p03/             review, publication, AI reviewer and desk (Team 3)
  test/              vitest suites
deploy/              one-command Cohesivity hosting and runtime shims
docs/                requirements, data dictionary, decisions, test cases
sprint-1/, sprint-2/ sprint boards, feature briefs, Scrum of Scrums records
```

## Data

The demo keeps records in each browser (`localStorage`), so two devices do not see each other's changes yet. The class agreed on one shared Supabase database hosted by Team 5; the mapping from this app's records to its tables is in [INTEGRATION.md](INTEGRATION.md).

## Contributing

One repository, one app, one module per team ([architecture](docs/ARCHITECTURE.md)). Each team works on `p0X/...` branches and opens pull requests into `main`; CI and one approval are required ([workflow](docs/WORKFLOW.md)). Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Never commit keys or real personal data (see [SECURITY.md](SECURITY.md)).

## Documents

| File | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | One app with a module per team, folder ownership, module rules, data migration path |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Roles, branches, rules on `main`, releases, the phase plan to the final presentation |
| [INTEGRATION.md](INTEGRATION.md) | Team ownership, code map, shared-database mapping, deploy, merge order |
| [docs/requirements.md](docs/requirements.md) | Product goals, shortlist, traceability |
| [docs/data-dictionary.md](docs/data-dictionary.md) | Records, IDs, statuses, seed data |
| [docs/decisions.md](docs/decisions.md) | Decision log |
| [docs/test-cases.md](docs/test-cases.md) | Acceptance tests and results |
| [sprint-2/crisp-dm-mapping.md](sprint-2/crisp-dm-mapping.md) | CRISP-DM mapping for the AI features |

## Credits

Built by the BUS 2010 (Fall 2026) class teams at MBZUAI.

- **Group 2 (P02, Employer): Launchpad**, the interface and base of this app: the student, employer and admin views and their AI features. Original prototype: launch-path-ipp.base44.app.
- Team 1 (P01): the first common app, Student profiles and the FAQ chatbot.
- Team 3 (P03): listing review and publication, the AI reviewer, the Internship Desk, the shared-database review queue and the common repository.
- Team 5 (P05): matching engine, match checks and the shared Supabase database.

Policy answers in the Internship Desk come from the MBZUAI 2025–2026 Industry Internship Guide.
