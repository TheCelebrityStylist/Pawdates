# Stripe test plan

Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

Use `4242 4242 4242 4242` for success, `4000 0000 0000 9995` for a decline, and `4000 0025 0000 3155` for a 3DS challenge. Use any future expiry and CVC.

1. Complete checkout and confirm `profiles.is_premium`, subscription ID, and `premium_until` update.
2. Cancel in the portal. Confirm access remains through the paid period, then ends.
3. Trigger `invoice.payment_failed` and confirm the friendly dunning email arrives.
4. Replay the same event with `stripe events resend EVENT_ID`; confirm `stripe_events` prevents a second update/email.
