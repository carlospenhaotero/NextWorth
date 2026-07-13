"use server";

import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { requireSession } from "@/server/require-session";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";

const VALID_CURRENCIES = ["USD", "EUR", "GBP"];
const VALID_LOCALES = ["en", "es"];
const NAME_MAX_LENGTH = 64;

export type ProfileResult =
  | { ok: true }
  | { ok: false; code: "invalid_name" | "error" };

export async function updateBaseCurrency(currency: string) {
  const session = await requireSession();
  const upper = currency.toUpperCase();

  if (!VALID_CURRENCIES.includes(upper)) {
    throw new Error(`Invalid currency. Must be one of: ${VALID_CURRENCIES.join(", ")}`);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { baseCurrency: upper },
  });

  revalidatePath("/overview");
  revalidatePath("/assets");
  revalidatePath("/settings");
}

export async function updateLocale(locale: string) {
  const session = await requireSession();

  if (!VALID_LOCALES.includes(locale)) {
    throw new Error(`Invalid locale. Must be one of: ${VALID_LOCALES.join(", ")}`);
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { locale },
  });

  // Persist the preference for guest/SSR resolution in i18n/request.ts.
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
  });

  // Re-render the whole tree so every server component picks up the new language.
  revalidatePath("/", "layout");
}

/**
 * Updates the logged-in user's display name. Goes through BetterAuth's updateUser
 * so the session stays in sync. Server-side validation is authoritative: the
 * name is trimmed and length-checked regardless of what the client sends.
 */
export async function updateDisplayName(name: string): Promise<ProfileResult> {
  await requireSession();

  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > NAME_MAX_LENGTH) {
    return { ok: false, code: "invalid_name" };
  }

  try {
    await auth.api.updateUser({ body: { name: trimmed }, headers: await headers() });
  } catch {
    return { ok: false, code: "error" };
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
