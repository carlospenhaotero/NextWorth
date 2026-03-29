import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { prisma } from "@/server/db";
import { getAssetPrediction } from "@/server/prediction";

const VALID_HORIZONS = ["3m", "6m", "1y", "2y", "5y"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { symbol } = await params;
  const decodedSymbol = decodeURIComponent(symbol).toUpperCase();
  const horizon = request.nextUrl.searchParams.get("horizon") || "6m";

  if (!VALID_HORIZONS.includes(horizon)) {
    return NextResponse.json({ error: "Invalid horizon" }, { status: 400 });
  }

  // Find asset in DB
  const asset = await prisma.asset.findFirst({
    where: { symbol: decodedSymbol },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  try {
    const prediction = await getAssetPrediction(
      asset.id,
      decodedSymbol,
      horizon,
      7200 // 2 hour TTL
    );

    if (!prediction) {
      return NextResponse.json(
        { error: "Predictions unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(prediction);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get predictions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
