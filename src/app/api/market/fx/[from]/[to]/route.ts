import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { getFxRate } from "@/server/market-data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ from: string; to: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { from, to } = await params;

  try {
    const rate = await getFxRate(from, to);
    return NextResponse.json({ from, to, rate });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get FX rate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
