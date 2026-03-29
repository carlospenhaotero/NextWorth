"use server";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/require-session";
import { revalidatePath } from "next/cache";

const VALID_CURRENCIES = ["USD", "EUR", "GBP"];

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
