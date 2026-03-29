import { z } from "zod/v4";

const optionalStr = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().min(1).optional()
);

const envSchema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NEXT_PUBLIC_APP_URL: z.url(),
  ML_SERVICE_URL: optionalStr,
});

export const env = envSchema.parse(process.env);
