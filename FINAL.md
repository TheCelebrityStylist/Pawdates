# Growth Layer + Care Profile — FINAL

## Mobile bug fix + daily-use mechanics — this pass

**Mobile ghost-text bug (fixed):** the passport redesign put the paper grain on a
`position:fixed; z-index:99; mix-blend-mode:multiply` overlay composited over
content, which ghosts/duplicates text on some mobile GPUs. Both grain layers now
sit behind content (`z-index:-1/-2`) with no blend mode.

**Daily-use mechanics (apply `0018_daily_use.sql` after 0016/0017):**
- **Feeding log** — `feeding_log` table; each scheduled feeding time is a tappable
  "Mark fed" on the Today card (reuses the treatment mark-done pattern), with a
  unique(pet,slot,day) index as the household double-feeding guard.
- **Daily mood prompt** — "How was [pet] today?" quick taps write `observation_log`
  (widened tag CHECK with bright_day/quiet_day/off_day); flows to the vet views.
- **Weekly weight nudge** on the Today card when the last weight is 7+ days old.
- **On-time seal** — the honest "% on time" stat promoted to a third status seal.
Verified on local Postgres (RLS, double-feed guard, mood tag) and by screenshotting
the real dashboard at 390/1280.

**Deferred (item 4):** the companion daily digest email (unlogged-feeding / weight
nudges) — it's cron+email infrastructure that can't be verified here and risks the
existing `due_reminder_digest`. Grooming already rides that digest (0017).

---

## Live-DB fix + Phase C (daily care) — this pass

**Migration order to apply against production (Supabase SQL editor):** run
`0016_consolidate_household_and_life_admin.sql` first (idempotent catch-up for
0005→0015 — fixes the "function household_read_scope does not exist" error, which
proved the tracked migrations were never applied to the live DB), then
`0017_daily_care.sql`. Both are safe to re-run.

**Phase C shipped:** `expenses` (+ private receipts), `nutrition_plans` (one per
pet), `grooming_schedule`. Grooming reuses the treatments reminder engine — a
generated `next_due` column plus a UNION into `due_reminder_digest`, so grooming
rides the same daily reminder email, not a parallel system. Household RLS on all
three; backfills from `pet_profile.feeding` and `pets.grooming_interval_days`.
Scope matrix: **expenses = full only**; **nutrition + grooming = full + sitter**
(a sitter needs feeding + grooming); neither on medical.

**Verified on a local Postgres 16** seeded to the live core-only state (the exact
state that broke 0014): 0016 then 0017 apply clean and idempotent; RLS isolates
households at the database level (cross-household reads return 0, viewer writes
rejected); grooming's generated `next_due` computes; and `due_reminder_digest`
returns treatments and grooming together. The reveal matrix + link status were
asserted from source. NOTE: the actual production DB was not reachable from the
build session (no direct URL; the Supabase MCP authenticates but its DB socket
returns ECONNREFUSED) — production QA still requires applying 0016/0017 there.

**Still explicitly out of scope:** a polymorphic `reminders` table (grooming
instead reuses the existing treatments engine) and ES/DE/PT locales.

---

## Life-admin layer (Phase B — this pass)

Three first-class tables, gated green (typecheck / lint / build / SEO). **Apply
migration `0015_life_admin.sql`** before use (it also creates a private
`pet-documents` storage bucket). The pet edit page degrades to empty sections if
it isn't applied yet.

```
npm run db:apply supabase/migrations/0015_life_admin.sql
```

**Shipped:** `insurance_policies` (provider, policy number, coverage summary,
renewal date, private file reference), `providers` (typed vet/groomer/sitter/
walker/boarding directory), `emergency_info` (one row per pet). All household-RLS
scoped. Idempotent backfills move insurance out of `pets.insurance_*` columns and
emergency vet/backup-contact out of `pet_profile` JSONB — app code no longer reads
or writes those old locations (the pets columns are left inert/deprecated, not
dropped). Full CRUD API + UI sections on the pet edit page; a printable
`/app/pets/[id]/emergency` sheet; policy documents in a **private** bucket served
via short-lived signed URLs (never public).

**Share-scope enforcement (spec item 6):** the reveal matrix in `lib/share-links.ts`
sets `insurance` and `providers` to `true` for `full` **only** — a `medical` or
`sitter` link can never expose policy numbers or the provider directory (the
recipient view doesn't even fetch them off-scope). `emergency` is `true` for all
scopes on purpose: anyone trusted with any link should be able to reach help.

**Not verified against a live DB this pass:** no `.env.local`/`SUPABASE_DB_URL`
and the Supabase MCP still needs interactive OAuth unavailable in this
non-interactive session, so the create-policy/provider/emergency → full-vs-sitter
share check was not run live — see the session report.

**Still remaining (explicitly out of scope this pass):** expenses, nutrition_plans,
grooming_schedule (as tables), polymorphic reminders, ES/DE/PT locales.

---

## Scoped share links (Phase D — this pass)

The sitter-link feature graduated from two per-pet boolean toggles
(`pets.share_token` / `pets.vet_share_token`) into a full `share_links` system.
Shipped and gated green (typecheck / lint / build / SEO). **Not** applied to any
live database yet — apply migration `0014_share_links.sql` before the feature is
used in production, or the settings section and `/s/[token]` routes will find no
table (the settings page already degrades to "no links" rather than crashing):

```
npm run db:apply supabase/migrations/0014_share_links.sql
```

**What shipped:**
- `share_links` (scope `full`/`medical`/`sitter`, `expires_at`, `view_count`,
  `created_by`, `revoked_at`) + `share_link_access_log`, both with household-scoped
  RLS matching the 0011/0012 convention. A pet can now hold any number of links,
  each scoped, expiring, and revocable independently.
- `record_share_access()` — a `security definer` RPC the logged-out recipient view
  calls (service role) to bump the view count and log access atomically.
- `lib/share-links.ts` — scope definitions plus a single reveal matrix so scope is
  enforced in exactly one place, not scattered across the render.
- API: `POST`/`GET /api/pets/[id]/share-links`, `PATCH`/`DELETE /api/share-links/[linkId]`
  (create, list, re-limit expiry, soft-revoke). Sharing stays Premium-gated, same as
  the existing `/api/pets/[id]/share`.
- `/s/[token]` — one recipient page rendering only the sections its scope allows;
  clean "expired"/"revoked" pages instead of a 404; "Powered by Tailtend" footer;
  noindex. Live check-off works from the new tokens too.
- Owner dashboard (`components/share-link-manager.tsx`, in Settings): mint scoped
  links, copy, see view counts + last-opened, re-limit or revoke (with confirm).

**Still on the legacy path (left intact, not removed):** `/share/[token]` and
`/vet/[token]` with their toggles remain wired so current production links keep
working. The new `/s/[token]` system supersedes them; a later pass can migrate
existing enabled pets to `share_links` rows and retire the old routes.

**Not covered this pass** (the broader "full product build" prompt): the remaining
net-new life-admin tables the spec lists as separate entities — `pet_documents`,
dedicated `insurance_policies`/`providers`/`emergency_info`/`travel_records`/
`nutrition_plans`/`grooming_schedule`/`expenses`, a generalized `vitals_log`
(only weight exists), a polymorphic `reminders` table (reminders are still derived
from `treatments.next_due`), and ES/DE/PT locales (only EN/NL exist). Much of that
functionality exists today inside `pets` columns and `pet_profile` JSONB rather
than as first-class tables. None of the DB-dependent QA checklist (live RLS probing,
Stripe webhook test-mode runs, end-to-end signup→share flow) could be executed
here: no `.env.local`, no `SUPABASE_DB_URL`, and the Supabase MCP needs interactive
OAuth unavailable in this non-interactive session.

---

Status as of this pass: Layers 1a, 1c, 2, 3, 5 shipped and gated green. Layer 1b (product pages) not started — blocked on a decision (see below). Layer 4 partial — share link + PDF shipped, referral system deliberately skipped. The Care Profile (sitter handover) feature is also shipped — see its own section below. Not merged to `main`; everything is on `claude/tailtend-baseline-execution-6zdah9` / PR #4.

## Care Profile (sitter handover record)

Data model, owner editor, Sitter Mode view, live check-off, and handover PDF are all built and gated green (typecheck/lint/build/SEO gate). Not independently verified against a live database — see migration note below.

**What shipped:**
- `pet_profile` + `routine_items` + `routine_checks` tables (migration `0006_care_profile.sql`), same RLS convention as every other table.
- `/app/pets/[id]/care-profile` — owner editor covering every section from the spec (food, routine timeline, toilet/hygiene, behaviour, house logistics, house access, play/enrichment, essentials flag, forbidden foods), plus a "checked off today" readout so the live check-off loop is actually visible to the owner, not just written to the DB.
- `/share/[token]` rewritten into Sitter Mode: Essentials strip (flag, vet contact, next medication, feeding times) pinned at the top, today's timeline, forbidden-foods warning in `--stamp` red, every other section rendered only when it has content, "Message the owner" mailto link. Works logged-out (admin-client + token pattern, same as the ical feed) and offline-once-visited (the existing service worker's cache-first strategy for page routes already covers this — no new SW code needed).
- Live check-off: sitter enters their name, ticks a routine item, write goes through `/api/share/[token]/checkoff` (public, token-gated, mirrors the established admin-client pattern rather than a public RLS policy) with a `unique(routine_item_id, checked_for_date)` constraint so the same item can't double-log in one day.
- Handover PDF extended from the Layer 4 PDF route: essentials/forbidden-foods warnings, today's timeline, feeding/behaviour highlights, treatment table, QR footer.
- Funnel events: `care_profile_completed` (via `app_events`, same mechanism as `pet_created`/`marked_done`), `sitter_view_opened`, `sitter_checked_item`, `handover_downloaded` (via `@vercel/analytics`, same as the tools).

**Deliberately not built:**
- **AI summary button** — skipped entirely. No LLM API key or infrastructure exists anywhere in this repo, and the spec's referenced "20/20 red-team gate" isn't defined here. Building an AI feature that generates care-instruction summaries without a real safety review would be worse than not building it.
- **House-access fields in the PDF** — the owner's own session can read `house_access` (lockbox/alarm/door notes), but the PDF generator deliberately omits it. A printed sheet that "gets physically passed between people" can't be revoked the way a web link can; those fields stay web-only, gated by the separate `house_access_shared` toggle, for now.

**Referenced-but-missing context**: the task described this as adding to `complete-record-spec.md §1` — that file doesn't exist anywhere in this repo, same situation as `products.ts` and `conductor-detailed.md` earlier in this session. Built from the spec text alone; if a real `complete-record-spec.md` exists elsewhere, worth diffing against it.

**Migration not applied**: `0006_care_profile.sql` has the same status as `0005` — written, gated, not run against any real database. Apply both before this reaches real traffic:
```
npm run db:apply supabase/migrations/0005_share_and_pdf.sql
npm run db:apply supabase/migrations/0006_care_profile.sql
```

## URL inventory (new in this pass)

| Type | Count | Path pattern |
|---|---|---|
| Comparison pages | 2 | `/compare/[slug]` |
| Life-stage guides | 3 | `/guides/[slug]` |
| Interactive tools | 4 | `/tools/[slug]` |
| E-E-A-T pages | 2 | `/about`, `/about/veterinary-reviewer` |
| Public share pages | dynamic, unbounded | `/share/[token]` (noindexed, one per pet with sharing enabled) |
| Product-intelligence pages | 0 | not built — see Open Items |

Pre-existing inventory (unchanged, for context): 24 English schedules, 6 Dutch schedules, 6 blog posts.

Total statically-listed, indexable content pages after this pass: **41** (schedules + nl + guides + compare + blog), plus 4 tool pages and 2 about pages that are live but dynamic/lighter-weight. All verified via `npm run seo:validate` — zero gated orphans.

## Tools — share-URL examples

Every tool's state lives in the query string, so any URL below reproduces the exact result and has a matching dynamic OG image at `{path}/og` with the same params:

- `/tools/pet-age-calculator?species=dog&size=large&age=7&name=Rex` → "Rex is about 54 in human years"
- `/tools/vaccination-schedule-generator?species=dog&birth=2026-05-01&name=Milo` → full first-year table with real calendar dates
- `/tools/flea-worming-cost-calculator?species=dog&band=large&product=both` → "EUR 270 / year"
- `/tools/is-my-pet-treatment-overdue?type=flea_tick&last=2026-05-01` → "Overdue by N days" / "Due today" / "Due in N days"

Each fires `tool_used` on result render, `tool_cta_clicked` on the "Add to Tailtend" CTA, and `tool_shared` on the share button, via `@vercel/analytics`. The CTA hands the entered data to onboarding via `localStorage` (query params don't survive the signup/auth redirect chain) — see `lib/prefill.ts`.

## E-E-A-T reviewer — action needed from Elke

**This is a human action, not a code task.** `lib/eeat.ts` has two config objects, both currently `null`:

```ts
export const veterinaryReviewer:Reviewer|null=null; // name, qualification, bio
export const founder:Founder|null=null;             // name, role, bio
```

Until `veterinaryReviewer` is filled in, every schedule/guide page intentionally omits the "medically reviewed by" line and `reviewedBy` schema rather than showing a placeholder name — publishing a false review claim would be worse than publishing none. The moment a real name/qualification/bio is added, it activates sitewide automatically (visible line, JSON-LD, and the `/about/veterinary-reviewer` bio page) with no other code changes needed. This is the single highest-leverage remaining action in this entire layer.

## Top 8 URLs to request indexing first

Ordered by commercial intent, per the original brief (overdue-checker → vaccination-generator → comparison → product pages — product pages don't exist yet, see Open Items, so comparisons and remaining tools fill that slot):

1. `/tools/is-my-pet-treatment-overdue` — highest-intent, someone anxious right now
2. `/tools/vaccination-schedule-generator` — the clearest product-pitch tool
3. `/compare/best-pet-medication-reminder-apps-2026` — highest commercial-intent comparison
4. `/compare/pet-reminder-app-vs-calendar` — category-defining comparison
5. `/tools/flea-worming-cost-calculator` — cost-anxiety, high intent
6. `/tools/pet-age-calculator` — highest-volume, friendliest front door
7. `/guides/puppy-first-year-schedule` — highest-search-volume life-stage guide
8. `/guides/kitten-first-year-schedule` — second highest-search-volume life-stage guide

Run `npm run indexnow:ping` with `DEPLOY_URL` set to the production host and a real `INDEXNOW_KEY` configured to submit all of these (and everything else in the sitemap) at once — it reads the live sitemap rather than a hardcoded list, so it stays correct as more pages ship.

## Open items (not silently dropped)

1. **`.env.local` / Supabase credentials** — never provided this session. Migrations `0005_share_and_pdf.sql` and `0006_care_profile.sql` are written but **not applied to any real database**. Run both `npm run db:apply` commands (see Care Profile section above) against the real `SUPABASE_DB_URL` before the share/PDF/care-profile features are used in production, or they'll error at runtime (tables/columns don't exist yet).
2. **Layer 1b (product-intelligence pages, `/products/[slug]`)** — not started. No `products.ts` existed anywhere in this repo's history, and the ~40 curated treatments need either real product-label data (I can research and cite this, per the same approach used for comparisons) or data you supply directly. Held pending your call.
3. **Referral system** — skipped per the spec's own "don't over-build" guidance: no existing referral gate to hook into, and granting Premium time is billing-adjacent logic I couldn't verify without live Stripe/Supabase credentials in this environment.
4. **Dutch (`/nl/schema`) pages** — not retrofitted with the citations/reviewer-schema pattern added to EN schedules and guides.
5. **Lighthouse ≥95 / CLS 0** — not run against a live URL from this sandboxed environment (local Lighthouse runs against `next start` proved unreliable here). Structurally sound — tools ship 2.5–2.8kB of page-specific JS each, most content pages are fully static — but needs a real run against the deployed preview/production URL to confirm the number, not just the reasoning.

## Metric read — stop here

Per the brief: this layer's job is arrival and sharing. Whether it worked is answered by traffic, `tool_used`, and signups in Search Console and `app_events` over the following two weeks — not by building a sixth surface. Reporting, not expanding, from here.
