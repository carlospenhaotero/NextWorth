// One-off backfill: enrich existing assets that have no profile yet.
// Run with: pnpm tsx prisma/backfill-asset-profiles.ts
//
// Safe to re-run: it only touches assets whose profileStatus is null, and the
// lazy enrichment in the /advisor metrics layer covers anything this misses.
import { PrismaClient } from "../src/generated/prisma/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import { getYahooProfile } from "../src/server/yahoo-profile";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Be gentle with Yahoo's unofficial endpoint.
const DELAY_MS = 400;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const assets = await prisma.asset.findMany({
    where: { profileStatus: null },
    select: { id: true, symbol: true, assetType: true },
    orderBy: { id: "asc" },
  });

  console.log(`Backfilling ${assets.length} asset profile(s)...`);

  const counts: Record<string, number> = { ok: 0, unavailable: 0, unsupported: 0 };

  for (const asset of assets) {
    const profile = await getYahooProfile(asset.symbol, asset.assetType);
    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        sector: profile.sector,
        industry: profile.industry,
        country: profile.country,
        sectorWeightings: profile.sectorWeightings ?? undefined,
        profileStatus: profile.status,
        profileFetchedAt: new Date(),
      },
    });
    counts[profile.status] = (counts[profile.status] ?? 0) + 1;
    console.log(`  ${asset.symbol} (${asset.assetType}) -> ${profile.status}`);
    if (profile.status !== "unsupported") await sleep(DELAY_MS);
  }

  console.log(
    `Done. ok=${counts.ok} unavailable=${counts.unavailable} unsupported=${counts.unsupported}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
