import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { getAssetHistory } from "@/server/market-data";

const VALID_INTERVALS = ["1d", "1wk", "1mo"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol } = await params;
  const searchParams = request.nextUrl.searchParams;

  const range = searchParams.get("range") || "24m";
  const interval = searchParams.get("interval") || "1mo";

  // Parse range to months
  const months = parseInt(range.replace("m", ""));
  if (isNaN(months) || months < 1 || months > 120) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  if (!VALID_INTERVALS.includes(interval as (typeof VALID_INTERVALS)[number])) {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }

  try {
    const data = await getAssetHistory(
      decodeURIComponent(symbol),
      months,
      interval as "1d" | "1wk" | "1mo",
      3600 // 1 hour TTL
    );
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get history";
    const status = message === "SERVICE_UNAVAILABLE" ? 503 : message === "SYMBOL_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
