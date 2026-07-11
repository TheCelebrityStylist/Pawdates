# PawDates Web

Production-oriented Next.js 15 app for Vercel. Copy `.env.example` to `.env.local` and fill every required value.

## Setup

1. Create a Supabase project in an EU region. Run `supabase/migrations/0001_initial.sql`, add the production callback URL in Auth, and create a private `pet-photos` bucket.
2. In Stripe, create a €9.99/year recurring price. Configure the customer portal, add `/api/stripe/webhook`, subscribe to checkout, subscription, and failed-invoice events, then set the price and webhook secrets.
3. Verify `pawdates.app` in Resend and use `reminders@pawdates.app` as the sender.
4. Import the repository into Vercel, add the environment variables, and deploy. `vercel.json` runs reminders daily at 06:00 UTC.

## Local development

```sh
npm install
npm run dev
```

## Launch checklist

- [ ] Magic link works on the production domain
- [ ] RLS verified with two separate test users
- [ ] Full Stripe test plan passed in test mode
- [ ] Live keys enabled; one real €9.99 purchase and refund completed
- [ ] Cron invoked manually; digest received and settings opt-out verified
- [ ] Lighthouse ≥95 on `/`, `/blog`, and one post
- [ ] Sitemap submitted in Google Search Console
- [ ] OG cards validated for `/`, `/blog`, and one post

The six supplied launch articles live in `content/blog` as MDX. Their frontmatter drives metadata, FAQ schema, related posts, reading time, sitemap entries, and per-post Open Graph images.
