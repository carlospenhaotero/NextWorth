import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { searchSymbols } from "@/server/yahoo-finance";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const results = await searchSymbols(q);
    return NextResponse.json({ results });
  } catch {
    // Search service unavailable: return empty rather than failing the UI.
    return NextResponse.json({ results: [] });
  }
}
