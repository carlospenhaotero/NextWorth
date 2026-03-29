# NextWorth

AI-powered portfolio management app.

## Stack

- **Framework:** Next.js 16 (App Router, RSC, Server Actions)
- **Language:** TypeScript
- **Database:** PostgreSQL 17 + Prisma 7 (PrismaPg adapter)
- **Auth:** BetterAuth (email+password, session cookies)
- **UI:** Tailwind CSS v4 + shadcn/ui (new-york style) + Recharts
- **ML:** Python Flask service with Amazon Chronos (separate Docker container)
- **Package manager:** pnpm

## Commands

```bash
pnpm dev              # Start dev server
pnpm build            # Generate Prisma client + build
pnpm db:migrate       # Run Prisma migrations
pnpm db:seed          # Seed test data
pnpm db:studio        # Open Prisma Studio
pnpm db:reset         # Reset database
docker compose up -d  # Start PostgreSQL + ML service
```

## Architecture

- `src/server/` — Server-only modules: db, auth, market-data, yahoo-finance, chronos, prediction
- `src/queries/` — Server-only data fetching (portfolio, user)
- `src/actions/` — Server Actions with `requireSession()` (portfolio, settings)
- `src/app/api/` — API Routes for client-side fetches (market data, predictions)
- `src/components/` — React components (dashboard/, shared/, ui/)
- `src/lib/` — Shared utilities (env, utils, auth-client, assets-catalog)
- `prisma/` — Schema, migrations, seed

## Key patterns

- **Auth guard:** `requireSession()` in server components/actions, cookie check in middleware
- **3-tier cache:** in-memory promise dedup -> DB with TTL -> stale fallback (market-data, predictions)
- **User.id is String (cuid)** — required by BetterAuth. Business tables use Int autoincrement.
- **API routes only for client-side fetches** — market data and predictions called from client components
- **Server components + server actions** for everything else (portfolio CRUD, settings)
