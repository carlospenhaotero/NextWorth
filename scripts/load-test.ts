/**
 * Test de carga de la cartera (Fase 3). Mide, contra la cuenta sembrada por
 * `pnpm db:seed:load`, el coste de las dos rutas caras a escala de 1000 activos:
 *   - getPortfolioForUser    (quote + FX por posición -> N+1 de red)
 *   - getPortfolioHistory    (histórico por activo de mercado)
 *
 * Ejecutar con las condiciones de módulo de servidor para neutralizar
 * `server-only` fuera de Next:
 *   pnpm loadtest
 * (el script `loadtest` en package.json pasa NODE_OPTIONS con --conditions).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Kept in sync with prisma/seed-load.ts (imported statically to avoid running its seed).
const LOAD_EMAIL = "loadtest@nextworth.app";

async function main() {
  const { prisma } = await import("../src/server/db");
  const { getPortfolioForUser } = await import("../src/queries/portfolio");
  const { getPortfolioHistory } = await import("../src/server/portfolio-history");

  const user = await prisma.user.findUnique({ where: { email: LOAD_EMAIL }, select: { id: true } });
  if (!user) {
    console.error(`No load user found. Run \`pnpm db:seed:load\` first.`);
    process.exit(1);
  }

  const count = await prisma.userPortfolio.count({ where: { userId: user.id } });
  console.log(`\nLoad test against ${count} positions (user ${LOAD_EMAIL})\n`);

  const time = async (label: string, fn: () => Promise<unknown>) => {
    const t0 = performance.now();
    const res = await fn();
    const ms = performance.now() - t0;
    console.log(`  ${label.padEnd(28)} ${ms.toFixed(0).padStart(8)} ms`);
    return { ms, res };
  };

  console.log("Cold run (empty caches):");
  const cold = await time("getPortfolioForUser", () => getPortfolioForUser(user.id));
  await time("getPortfolioHistory(all)", () => getPortfolioHistory(user.id, "all"));

  console.log("\nWarm run (DB history cache primed):");
  await time("getPortfolioForUser", () => getPortfolioForUser(user.id));
  await time("getPortfolioHistory(all)", () => getPortfolioHistory(user.id, "all"));

  const p = cold.res as Awaited<ReturnType<typeof getPortfolioForUser>>;
  const marketPositions = p.positions.filter((x) =>
    ["stock", "etf", "fund", "crypto", "commodity"].includes(x.assetType)
  ).length;
  console.log(
    `\nMarket positions (each triggers a sequential quote + FX): ${marketPositions}`
  );
  console.log(
    `Per-market-position quote latency (cold): ~${(cold.ms / Math.max(1, marketPositions)).toFixed(0)} ms\n`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
