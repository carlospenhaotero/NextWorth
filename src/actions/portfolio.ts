"use server";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/require-session";
import { ensureAssetProfile } from "@/server/asset-profile";
import { revalidatePath } from "next/cache";

interface UpsertPositionInput {
  symbol: string;
  name?: string;
  assetType: string;
  currency?: string;
  quantity: number;
  avgBuyPrice: number | null;
  tae?: number | null;
  faceValue?: number | null;
  couponRate?: number | null;
  couponFrequency?: number | null;
  maturityDate?: string | null;
}

function specialFields(input: UpsertPositionInput) {
  return {
    tae: input.tae ?? null,
    faceValue: input.faceValue ?? null,
    couponRate: input.couponRate ?? null,
    couponFrequency: input.couponFrequency ?? null,
    maturityDate: input.maturityDate ? new Date(input.maturityDate) : null,
  };
}

async function upsertAsset(input: UpsertPositionInput) {
  const symbol = input.symbol.toUpperCase();
  const currency = (input.currency || "USD").toUpperCase();
  const asset = await prisma.asset.upsert({
    where: { symbol_assetType: { symbol, assetType: input.assetType } },
    update: { name: input.name || symbol, currency },
    create: { symbol, name: input.name || symbol, assetType: input.assetType, currency },
  });

  // Best-effort profile enrichment; don't block the add/edit flow on it.
  void ensureAssetProfile(asset.id).catch(() => {});

  return asset;
}

function revalidate() {
  revalidatePath("/overview");
  revalidatePath("/assets");
  revalidatePath("/advisor");
}

/**
 * Create a position or REPLACE an existing one (overwrites quantity and price).
 */
export async function upsertPosition(input: UpsertPositionInput) {
  const session = await requireSession();
  const userId = session.user.id;

  const asset = await upsertAsset(input);

  await prisma.userPortfolio.upsert({
    where: { userId_assetId: { userId, assetId: asset.id } },
    update: {
      quantity: input.quantity,
      avgBuyPrice: input.avgBuyPrice,
      ...specialFields(input),
    },
    create: {
      userId,
      assetId: asset.id,
      quantity: input.quantity,
      avgBuyPrice: input.avgBuyPrice,
      ...specialFields(input),
    },
  });

  revalidate();
}

/**
 * Add to an existing position, recomputing the weighted-average buy price.
 * Falls back to creating the position if it does not exist yet.
 * If either side has no known cost, the resulting avg price is left unknown (null).
 */
export async function addToPosition(input: UpsertPositionInput) {
  const session = await requireSession();
  const userId = session.user.id;

  const asset = await upsertAsset(input);

  const existing = await prisma.userPortfolio.findUnique({
    where: { userId_assetId: { userId, assetId: asset.id } },
  });

  if (!existing) {
    await prisma.userPortfolio.create({
      data: {
        userId,
        assetId: asset.id,
        quantity: input.quantity,
        avgBuyPrice: input.avgBuyPrice,
        ...specialFields(input),
      },
    });
    revalidate();
    return;
  }

  const oldQty = Number(existing.quantity);
  const addQty = input.quantity;
  const newQty = oldQty + addQty;

  const oldAvg = existing.avgBuyPrice != null ? Number(existing.avgBuyPrice) : null;
  const addAvg = input.avgBuyPrice;

  let newAvg: number | null;
  if (oldAvg == null || addAvg == null || newQty === 0) {
    // Unknown cost on either side -> can't compute a meaningful average.
    newAvg = null;
  } else {
    newAvg = (oldQty * oldAvg + addQty * addAvg) / newQty;
  }

  await prisma.userPortfolio.update({
    where: { id: existing.id },
    data: { quantity: newQty, avgBuyPrice: newAvg },
  });

  revalidate();
}

interface EditPositionInput {
  quantity: number;
  avgBuyPrice: number | null;
  tae?: number | null;
  faceValue?: number | null;
  couponRate?: number | null;
  couponFrequency?: number | null;
  maturityDate?: string | null;
}

/**
 * Edit an existing position's quantity, cost and special fields.
 * Symbol, name and currency belong to the shared Asset and are not editable here.
 */
export async function editPosition(positionId: number, input: EditPositionInput) {
  const session = await requireSession();
  const userId = session.user.id;

  const updated = await prisma.userPortfolio.updateMany({
    where: { id: positionId, userId },
    data: {
      quantity: input.quantity,
      avgBuyPrice: input.avgBuyPrice,
      tae: input.tae ?? null,
      faceValue: input.faceValue ?? null,
      couponRate: input.couponRate ?? null,
      couponFrequency: input.couponFrequency ?? null,
      maturityDate: input.maturityDate ? new Date(input.maturityDate) : null,
    },
  });

  if (updated.count === 0) {
    throw new Error("Position not found");
  }

  revalidate();
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

  revalidate();
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
