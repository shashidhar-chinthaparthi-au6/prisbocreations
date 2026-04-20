import { z } from "zod";

function emptyToUndefined(v: unknown) {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
}

const schema = z.object({
  MONGODB_URI: z.string().min(1),
  /** Used for admin JWT (`prisbo_session`) and, unless AUTH_SECRET is set, for Auth.js storefront sessions. */
  JWT_SECRET: z.string().min(16),
  /** Optional: separate secret for Auth.js only (min 16). When unset, JWT_SECRET is used. */
  AUTH_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  /** Legacy alias; optional. When unset, JWT_SECRET / AUTH_SECRET apply. */
  NEXTAUTH_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  /** Public site URL (emails, absolute links). Recommended in production. */
  NEXT_PUBLIC_APP_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  /** Canonical URL for Auth.js in production (e.g. https://yoursite.com). Optional if `trustHost` works for your host. */
  AUTH_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  /** Set to `true` to send auth/transactional email via SES instead of logging in dev. */
  EMAIL_ENABLED: z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return undefined;
    if (v === true || v === "true") return true;
    if (v === false || v === "false") return false;
    return undefined;
  }, z.boolean().optional()),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
});

export type Env = z.infer<typeof schema>;

export function getEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
    );
  }
  return parsed.data;
}
