import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { auth } from "@/server/auth";
import { env } from "@/lib/env";
import { getAdvisorMetrics } from "@/server/advisor/metrics";
import { buildAdvisorSystemPrompt } from "@/server/advisor/prompt";
import { toLocale } from "@/i18n/locale";

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json(
      { error: "Advisor chat is not configured (missing Google API key)." },
      { status: 503 }
    );
  }

  // userId comes from the server session, never from the request body.
  const userId = session.user.id;
  const locale = toLocale(session.user.locale);

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: buildAdvisorSystemPrompt(locale),
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(3),
    tools: {
      getPortfolioMetrics: tool({
        description:
          "Returns the user's current portfolio balance (by sector, country, asset type) and their risk profile. Call this whenever the question depends on the real composition of the portfolio.",
        inputSchema: z.object({}),
        // userId captured from the session closure — the model cannot request another user's data.
        execute: async () => getAdvisorMetrics(userId, locale),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
