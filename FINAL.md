# Growth Layer + Care Profile — FINAL

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
