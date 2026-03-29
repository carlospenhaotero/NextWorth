import path from "node:path";
import { defineConfig } from "prisma/config";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
