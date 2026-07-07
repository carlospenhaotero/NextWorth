"use server";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/require-session";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const VALID_CURRENCIES = ["USD", "EUR", "GBP"];
const VALID_LOCALES = ["en", "es"];

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
