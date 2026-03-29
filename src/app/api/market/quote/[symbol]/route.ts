import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { getQuote } from "@/server/market-data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol } = await params;

  try {
    const quote = await getQuote(decodeURIComponent(symbol));
    return NextResponse.json(quote);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
