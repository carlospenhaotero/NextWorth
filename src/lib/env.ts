import { z } from "zod/v4";

const optionalStr = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().min(1).optional()
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  ML_SERVICE_URL: optionalStr,
  // Optional so the app still boots without it; the advisor chat route checks it at runtime.
  GOOGLE_GENERATIVE_AI_API_KEY: optionalStr,
  // Optional asset-logo provider; the UI falls back to a placeholder when unset.
  NEXT_PUBLIC_LOGO_DEV_TOKEN: optionalStr,
  LOGO_DEV_SECRET_KEY: optionalStr,
});

export const env = envSchema.parse(process.env);
