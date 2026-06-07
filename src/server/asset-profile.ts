import "server-only";
import { prisma } from "./db";
import { getYahooProfile } from "./yahoo-profile";

// Sector/country are quasi-static: refresh successful profiles infrequently.
const PROFILE_OK_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
// Transient failures: retry sooner than a full TTL, but not on every load.
const PROFILE_RETRY_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// In-memory dedup of concurrent enrichment for the same asset.
const inflight = new Map<number, Promise<void>>();

function isFresh(status: string | null, fetchedAt: Date | null): boolean {
  if (!fetchedAt) return false;
  const age = Date.now() - fetchedAt.getTime();
  if (status === "ok") return age < PROFILE_OK_TTL_MS;
  if (status === "unavailable") return age < PROFILE_RETRY_TTL_MS;
  return false;
}

/**
 * Ensures an asset's enriched profile (sector/country/ETF sector breakdown) is
 * populated and reasonably fresh. Best-effort and safe to call repeatedly:
 * dedupes concurrent calls, respects a TTL, and never reuses a Yahoo slot for
 * asset types that have no profile (status "unsupported" is terminal).
 */
export async function ensureAssetProfile(assetId: number): Promise<void> {
  if (inflight.has(assetId)) return inflight.get(assetId)!;

  const promise = enrichInternal(assetId);
  inflight.set(assetId, promise);
  try {
    await promise;
  } finally {
    inflight.delete(assetId);
  }
}

async function enrichInternal(assetId: number): Promise<void> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      symbol: true,
      assetType: true,
      profileStatus: true,
      profileFetchedAt: true,
    },
  });
  if (!asset) return;

  // "unsupported" is terminal; fresh "ok"/"unavailable" needs no refresh.
  if (asset.profileStatus === "unsupported") return;
  if (isFresh(asset.profileStatus, asset.profileFetchedAt)) return;

  const profile = await getYahooProfile(asset.symbol, asset.assetType);

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      sector: profile.sector,
      industry: profile.industry,
      country: profile.country,
      sectorWeightings: profile.sectorWeightings ?? undefined,
      profileStatus: profile.status,
      profileFetchedAt: new Date(),
    },
  });
}
