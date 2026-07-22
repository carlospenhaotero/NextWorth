import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { getAssetNews } from "@/server/asset-news";
import { toLocale } from "@/i18n/locale";

// The AI summary can take a few seconds; give it room beyond the default.
export const maxDuration = 30;

/**
 * Recent news for an owned asset, with an optional AI overview. Client-fetched
 * from the asset detail view. Returns an empty list (never an error) when the
 * asset is not owned or Yahoo has nothing, so the client just hides the panel.
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
  const locale = toLocale(request.nextUrl.searchParams.get("locale"));

  try {
    const news = await getAssetNews(session.user.id, decodedSymbol, locale);
    return NextResponse.json(news);
  } catch {
    return NextResponse.json({
      symbol: decodedSymbol,
      items: [],
      summary: null,
      summarySource: null,
    });
  }
}
