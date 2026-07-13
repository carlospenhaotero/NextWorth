import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    // A cookie present but no valid session means the token was revoked or
    // expired; route through session-expired to clear it, otherwise the
    // middleware (which only checks cookie presence) would loop us back here.
    const cookieStore = await cookies();
    const hasStaleCookie = SESSION_COOKIES.some((name) => cookieStore.has(name));
    redirect(hasStaleCookie ? "/api/auth/session-expired" : "/login");
  }

  return session;
}
