import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { getPortfolioProjection, type ProjectionHorizon } from "@/server/portfolio-projection";

const VALID_HORIZONS: ProjectionHorizon[] = ["3m", "6m", "1y", "2y", "5y"];

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const horizonParam = request.nextUrl.searchParams.get("horizon") || "1y";
  if (!VALID_HORIZONS.includes(horizonParam as ProjectionHorizon)) {
    return NextResponse.json({ error: "Invalid horizon" }, { status: 400 });
  }

  try {
    const data = await getPortfolioProjection(session.user.id, horizonParam as ProjectionHorizon);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get portfolio projection";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
