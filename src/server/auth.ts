import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/server/db";
import { sendPasswordResetEmail } from "@/server/email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    process.env.BETTER_AUTH_URL!,
    process.env.NEXT_PUBLIC_APP_URL!,
  ].filter(Boolean),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url,
        userName: user.name,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60, // refresh every 1 hour
  },
  user: {
    additionalFields: {
      baseCurrency: {
        type: "string",
        defaultValue: "USD",
        input: false,
      },
      locale: {
        type: "string",
        defaultValue: "en",
        input: false,
      },
    },
  },
});
