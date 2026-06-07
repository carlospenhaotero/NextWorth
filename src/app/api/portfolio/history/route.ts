import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { getPortfolioHistory, type PortfolioRange } from "@/server/portfolio-history";

const VALID_RANGES: PortfolioRange[] = ["1w", "1m", "3m", "6m", "1y", "all"];

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rangeParam = request.nextUrl.searchParams.get("range") || "all";
  if (!VALID_RANGES.includes(rangeParam as PortfolioRange)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  try {
    const data = await getPortfolioHistory(session.user.id, rangeParam as PortfolioRange);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get portfolio history";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
