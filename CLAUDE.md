# Working in this repo (for Claude Code, Codex and other coding agents)

The common IPP app for all seven BUS 2010 Co-op teams. One app, one module per team. Read these before changing anything:

1. `docs/ARCHITECTURE.md`: folder ownership and module rules.
2. `docs/WORKFLOW.md`: branches (`p0X/topic`), rules on `main`, releases.
3. `INTEGRATION.md`: team ownership, shared-database mapping, each team's section.
4. `AGENTS.md`: Team 1's notes on the base app.

## Commands

```bash
npx -y bun@1.4.0 install --frozen-lockfile
npx -y bun@1.4.0 run dev            # http://localhost:8080
npx -y bun@1.4.0 x tsc --noEmit     # CI runs these three
npx -y bun@1.4.0 run test
npx -y bun@1.4.0 run build
```

Run eslint only on files you touch (`npx -y bun@1.4.0 x eslint --fix <files>`); the base app does not pass a full-repo lint yet.

## Where things are

| Need | Use |
| --- | --- |
| Read the shared Supabase database | `import { selectAll, getOpenListings, ... } from "@/lib/db"` (read-only, publishable key, safe in the browser) |
| Write to the shared database | A server route in `src/routes/api/p0X.*.ts` that reads your team key from `process.env` (see `src/lib/p03/shared-write.ts` for a worked example) |
| Demo records (browser only) | `src/lib/ipp-store.ts` (Team 1) |
| Add a page | `src/routes/p0X.<name>.tsx`, wrapped in `<AppShell>`; one nav line in `AppShell.tsx` |
| Not ported yet | Add your site to `EXTERNAL` in `AppShell.tsx` |
| Colours, fonts | Tokens in `src/styles.css` (`bg-card`, `text-primary`, `bg-status`, `font-display`); never hard-code colours |
| P03 (review, desk) API | `src/lib/p03/index.ts` and `src/lib/p03/README.md` |

## Rules

- Stay in your team's folders. Shared core (`ipp-store.ts`, `lib/db/`, `AppShell.tsx`, `components/ui/`, `styles.css`, `__root.tsx`, `package.json`, `deploy/`) needs a maintainer review.
- Never commit keys. Team keys and model keys live in `.env.local` or host settings (`.env.example` lists them). The publishable Supabase key is public and fine in code.
- Synthetic data only. Never write to the demo thread `OP-026`…`OP-031`, `COOP-B001`…`B006`; practise on `OP-999`, `EMP-999`, `COOP-Z001`.
- Every AI feature needs a non-AI fallback and a person who decides.
- Open a pull request into `main` with the template filled in; CI must pass and someone from another team approves.
