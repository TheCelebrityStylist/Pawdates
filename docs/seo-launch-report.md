# Tailtend SEO launch report

## URL inventory

- 1 homepage and pricing section
- 6 English blog posts
- 24 English schedule pages
- 1 Dutch hub and 6 Dutch schedule pages
- 4 segmented sitemaps under one sitemap index
- Terms, privacy, login and the grouped schedule/blog directories

The build-time SEO gate checks 24 English and six Dutch schedules for at least 350 visible words, four schedule rows, three visible FAQs, self-canonical metadata, one connected JSON-LD graph and required internal links. It also checks the 36 content pages for at least two internal inlinks.

## Google Search Console — ten-minute setup

1. Open Google Search Console and choose **Add property**.
2. Choose **Domain**, enter `tailtend.com` (without `www` or a protocol), and copy Google’s DNS TXT value.
3. In the domain registrar’s DNS screen, add that TXT record at the root (`@`). Leave existing mail and web records untouched.
4. Return to Search Console and click **Verify**. DNS propagation can take several minutes.
5. Open **Sitemaps**, enter `https://www.tailtend.com/sitemap.xml`, and click **Submit**.
6. Use **URL inspection** → **Request indexing** for the six priority URLs below. Inspect the canonical result after Google processes each page.

## Bing Webmaster Tools

1. Open Bing Webmaster Tools and sign in with the same Google account used for Search Console.
2. Choose **Import from Google Search Console**.
3. Select the `tailtend.com` property and approve the import.
4. Confirm Bing sees `https://www.tailtend.com/sitemap.xml`.
5. Set `INDEXNOW_KEY` in production and deploy; `/api/indexnow` can then submit changed paths immediately.

## First six URLs to request, by commercial value

1. `https://www.tailtend.com/`
2. `https://www.tailtend.com/schedules/dog-flea-treatment-schedule`
3. `https://www.tailtend.com/schedules/puppy-vaccination-schedule`
4. `https://www.tailtend.com/blog/how-often-flea-treatment-dog`
5. `https://www.tailtend.com/nl`
6. `https://www.tailtend.com/nl/schema/vlooienbehandeling-hond-schema`

## Three likely indexing issues and fixes

1. **DNS or deployment still points at an old host.** Ensure both apex and `www` reach Vercel, make `www` the project domain, and verify the apex returns a 308 to `www`.
2. **Google selects a different canonical during the rename.** Keep all old/preview hosts redirecting, submit only the new sitemap, and inspect representative English and Dutch URLs after recrawl.
3. **New programmatic pages are crawled slowly.** Keep the quality gate mandatory, add editorial links from new weekly articles, submit the six commercial URLs first, and use IndexNow for Bing rather than publishing more pages at once.

## Performance evidence

CI runs Lighthouse against `/`, `/blog`, one post, one schedule and `/nl`, enforcing 95 in all four categories, LCP below 1.8 seconds, CLS 0 and a 200 ms blocking-time proxy for responsiveness. Local Lighthouse could not attach to Chrome inside the Codex macOS sandbox, so no local scores are claimed; the CI workflow is the source of record.
