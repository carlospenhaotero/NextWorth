import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { getAssetSignal } from "@/server/asset-signal";

/**
 * Educational per-asset signal (momentum, volatility, risk class + portfolio
 * fit). Client-fetched from the asset detail view. Returns { signal: null } when
 * the asset has no market series or not enough history, so the client just hides
 * the panel instead of showing an error.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol);
  const locale = request.nextUrl.searchParams.get("locale") || "en";

  try {
    const signal = await getAssetSignal(session.user.id, decodedSymbol, locale);
    return NextResponse.json({ signal });
  } catch {
    // History unavailable / symbol not found: hide the panel gracefully.
    return NextResponse.json({ signal: null });
  }
}
