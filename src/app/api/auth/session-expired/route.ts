import { NextResponse } from "next/server";

// Session-token cookie names BetterAuth may set (plain dev, __Secure- in prod).
const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

/**
 * Clears a stranded session cookie and sends the user to /login.
 *
 * requireSession() redirects here when a session cookie is present but no longer
 * valid (revoked via revokeOtherSessions, expired, or signed out elsewhere).
 * The middleware only checks for the cookie's presence, so without clearing it
 * the browser would bounce between /login and /overview forever. This route sits
 * outside the middleware matcher, so it can break that loop.
 */
export function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  for (const name of SESSION_COOKIES) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}
