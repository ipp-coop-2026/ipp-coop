# P03: University review and publication (Team 3)

Sara Ahmed (Careers coordinator, synthetic) checks every employer listing before students see it, then publishes it. During the internship, the Internship Desk answers students and supervisors from the MBZUAI 2025–2026 Industry Internship Guide.

| Page | What it does | Data |
| --- | --- | --- |
| `/p03` | Demo review queue: five checks, AI reviewer, request changes, decline, version 2, publish, close, decision log, review rules, desk admin | Browser (`review.ts`, beside Team 1's store) |
| `/p03/shared` | The same review on Team 5's shared database: every team's listings, live | `shared-review.ts` (read), `/api/p03/review` (write) |
| `/desk` | Internship Desk chat for students and supervisors | `/api/desk/*` (`desk-server.ts`) |

## Files

| File | Side | Role |
| --- | --- | --- |
| `index.ts` | both | Public API for other teams |
| `review.ts` | browser | Demo review layer (localStorage key `ipp-p03-review-v1`), pure actions, checklist hints |
| `shared-review.ts` | browser | Reads `opportunity_versions`, `listing_reviews`, `listings`, `employers`; derives the stage of each listing |
| `shared-write.ts` | server | Validates and writes P03 decisions with `P03_TEAM_KEY`; sandbox-only unless `P03_WRITE_SCOPE=all`; never touches OP-026…OP-031 |
| `ai.ts`, `ai-review-core.ts` | browser / server | AI reviewer (Claude Haiku, `ANTHROPIC_API_KEY`); suggestions only |
| `desk-core.ts`, `desk-server.ts`, `desk-client.ts`, `desk-ui.tsx` | mixed | Internship Desk: policy matching, Claude answers, Career Services queue |

## Shared-database stages

| Stage | Rule |
| --- | --- |
| Waiting for review | Latest version is `submitted` or `resubmitted` and has no `listing_reviews` row |
| Waiting for the employer | Latest decision is `clarification_requested` |
| Ready to publish | Latest version approved, `listings.approved_version` is older or missing |
| Open, closed, withdrawn | From `listings.listing_status` |
| Declined | Latest decision is `declined` |

## For other teams

- P02 (employer): submit a new row in `opportunity_versions` with `submission_status = submitted` (or `resubmitted` with `version + 1`); it appears in Sara's shared queue on the next refresh.
- P04 and P05: read `open_listings`; only `version = approved_version` is visible to students.
- Tests: `src/test/p03-*.test.ts`.
