import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_MONTHLY: z.string().startsWith("price_"),
  STRIPE_PRICE_YEARLY: z.string().startsWith("price_"),
  FOUNDING_PRICE_YEARLY: z.string().startsWith("price_").optional(),
  RESEND_API_KEY: z.string().min(1),
  FROM_EMAIL: z.string().min(3),
  CRON_SECRET: z.string().min(32),
});

function readable(error: z.ZodError) {
  const key = error.issues[0]?.path[0] ?? "environment variable";
  return `Missing or invalid ${key} — see README § Keys`;
}

export function publicEnv() {
  const result = publicSchema.safeParse(process.env);
  if (!result.success) throw new Error(readable(result.error));
  return result.data;
}

export function serverEnv() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) throw new Error(readable(result.error));
  return result.data;
}

export const siteUrl = () =>
  process.env.NEXT_PUBLIC_APP_URL || "https://pawdates.app";
