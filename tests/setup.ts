// Dummy env so modules that transitively import `@/lib/env` (via `@/server/db`)
// don't fail schema validation at import time. Unit tests mock the DB and network
// boundaries, so no real connection is ever opened with these values.
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/test";
process.env.BETTER_AUTH_SECRET ||= "test-secret-test-secret-test-secret-1234";
process.env.BETTER_AUTH_URL ||= "http://localhost:3005";
process.env.NEXT_PUBLIC_APP_URL ||= "http://localhost:3005";
