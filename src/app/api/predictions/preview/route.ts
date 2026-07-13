import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { getPreviewPrediction } from "@/server/prediction-preview";

const VALID_HORIZONS = ["3m", "6m", "1y", "2y", "5y"];

/**
 * Preview forecast for the add-asset flow. Takes the symbol as a query param
 * (not a path segment) so it never collides with /api/predictions/[symbol],
 * and runs Chronos without requiring the asset to exist in the DB.
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol")?.trim().toUpperCase();
  const horizon = searchParams.get("horizon") || "1y";

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  if (!VALID_HORIZONS.includes(horizon)) {
    return NextResponse.json({ error: "Invalid horizon" }, { status: 400 });
  }

  try {
    const prediction = await getPreviewPrediction(symbol, horizon);
    if (!prediction) {
      return NextResponse.json({ error: "Predictions unavailable" }, { status: 503 });
    }
    return NextResponse.json(prediction);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get predictions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
