# Tailtend final ship summary

## Fixes made

- Consolidated the database schema into an idempotent migration covering all nine required tables, RLS, policies, indexes, profile trigger, reminder function and treatment-completion function. The migration explicitly notifies PostgREST to reload its schema cache.
- Added `db:apply`, `db:verify` and `db:seed`. Verification fails on a missing table or disabled RLS. The seed creates a confirmed test user, Milo, three treatments due at −1, +3 and +60 days, and one completed log entry.
- Changed onboarding species selection to accessible buttons with `type="button"`, `aria-pressed`, keyboard activation, visible health rings and a name/species completion gate with specific helper text.
- Centralised API error responses so backend details are logged with a digest while clients receive plain-language recovery actions.
- Expanded `/api/health` with boolean-only environment, database and complete-table checks.
- Added sign-out and a deployed-preview-only Playwright final gate. It records video, trace and failure screenshots and refuses localhost.
- Added the interaction audit at `design-review/interaction-audit.md` and verified the repository contains no former-brand strings outside Git history.

## Required passing evidence

Run these with `SUPABASE_DB_URL`, normal production variables and `PLAYWRIGHT_BASE_URL` set to the deployed preview:

```bash
npm run db:apply
npm run db:verify
npm run db:seed
npm run ship:check
```

The final gate is complete only when all four commands pass and `design-review/test-results` contains the Playwright video and trace.
