# Growth Layer — FINAL

Status as of this pass: Layers 1a, 1c, 2, 3, 5 shipped and gated green. Layer 1b (product pages) not started — blocked on a decision (see below). Layer 4 partial — share link + PDF shipped, referral system deliberately skipped. Not merged to `main`; everything is on `claude/tailtend-baseline-execution-6zdah9` / PR #4.

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

1. **`.env.local` / Supabase credentials** — never provided this session. Migration `0005_share_and_pdf.sql` is written but **not applied to any real database**. Run `npm run db:apply supabase/migrations/0005_share_and_pdf.sql` against the real `SUPABASE_DB_URL` before the share/PDF features are used in production, or they'll error at runtime (columns don't exist yet).
2. **Layer 1b (product-intelligence pages, `/products/[slug]`)** — not started. No `products.ts` existed anywhere in this repo's history, and the ~40 curated treatments need either real product-label data (I can research and cite this, per the same approach used for comparisons) or data you supply directly. Held pending your call.
3. **Referral system** — skipped per the spec's own "don't over-build" guidance: no existing referral gate to hook into, and granting Premium time is billing-adjacent logic I couldn't verify without live Stripe/Supabase credentials in this environment.
4. **Dutch (`/nl/schema`) pages** — not retrofitted with the citations/reviewer-schema pattern added to EN schedules and guides.
5. **Lighthouse ≥95 / CLS 0** — not run against a live URL from this sandboxed environment (local Lighthouse runs against `next start` proved unreliable here). Structurally sound — tools ship 2.5–2.8kB of page-specific JS each, most content pages are fully static — but needs a real run against the deployed preview/production URL to confirm the number, not just the reasoning.

## Metric read — stop here

Per the brief: this layer's job is arrival and sharing. Whether it worked is answered by traffic, `tool_used`, and signups in Search Console and `app_events` over the following two weeks — not by building a sixth surface. Reporting, not expanding, from here.
