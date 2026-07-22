import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { toLocale } from "@/i18n/locale";
import { getAssetSuggestions } from "@/server/asset-suggestions";

// The Gemini explanation can take a few seconds; the selection itself is instant.
export const maxDuration = 30;

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // userId always from the session, never from the request.
  const locale = toLocale(session.user.locale);

  try {
    const result = await getAssetSuggestions(session.user.id, locale);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build suggestions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
