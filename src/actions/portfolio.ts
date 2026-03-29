"use server";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/require-session";
import { revalidatePath } from "next/cache";

interface UpsertPositionInput {
  symbol: string;
  name?: string;
  assetType: string;
  currency?: string;
  quantity: number;
  avgBuyPrice: number;
  tae?: number | null;
  faceValue?: number | null;
  couponRate?: number | null;
  couponFrequency?: number | null;
  maturityDate?: string | null;
}

export async function upsertPosition(input: UpsertPositionInput) {
  const session = await requireSession();
  const userId = session.user.id;

  const symbol = input.symbol.toUpperCase();
  const currency = (input.currency || "USD").toUpperCase();

  // Upsert asset
  const asset = await prisma.asset.upsert({
    where: {
      symbol_assetType: { symbol, assetType: input.assetType },
    },
    update: {
      name: input.name || symbol,
      currency,
    },
    create: {
      symbol,
      name: input.name || symbol,
      assetType: input.assetType,
      currency,
    },
  });

  // Upsert portfolio position
  await prisma.userPortfolio.upsert({
    where: {
      userId_assetId: { userId, assetId: asset.id },
    },
    update: {
      quantity: input.quantity,
      avgBuyPrice: input.avgBuyPrice,
      tae: input.tae ?? null,
      faceValue: input.faceValue ?? null,
      couponRate: input.couponRate ?? null,
      couponFrequency: input.couponFrequency ?? null,
      maturityDate: input.maturityDate ? new Date(input.maturityDate) : null,
    },
    create: {
      userId,
      assetId: asset.id,
      quantity: input.quantity,
      avgBuyPrice: input.avgBuyPrice,
      tae: input.tae ?? null,
      faceValue: input.faceValue ?? null,
      couponRate: input.couponRate ?? null,
      couponFrequency: input.couponFrequency ?? null,
      maturityDate: input.maturityDate ? new Date(input.maturityDate) : null,
    },
  });

  revalidatePath("/overview");
  revalidatePath("/assets");
}

export async function deletePosition(positionId: number) {
  const session = await requireSession();
  const userId = session.user.id;

  const deleted = await prisma.userPortfolio.deleteMany({
    where: { id: positionId, userId },
  });

  if (deleted.count === 0) {
    throw new Error("Position not found");
  }

  revalidatePath("/overview");
  revalidatePath("/assets");
}

export async function updateTae(positionId: number, tae: number) {
  const session = await requireSession();
  const userId = session.user.id;

  if (tae < 0 || tae > 100) {
    throw new Error("TAE must be between 0 and 100");
  }

  const updated = await prisma.userPortfolio.updateMany({
    where: { id: positionId, userId },
    data: { tae },
  });

  if (updated.count === 0) {
    throw new Error("Position not found");
  }

  revalidatePath("/assets");
}
