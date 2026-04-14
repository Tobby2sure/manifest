import { NextRequest, NextResponse } from "next/server";
import { sendEngagementSummaries, sendIntentSuggestions } from "@/app/actions/engagement";

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [summariesSent, suggestionsSent] = await Promise.all([
    sendEngagementSummaries(),
    sendIntentSuggestions(),
  ]);

  return NextResponse.json({
    ok: true,
    summariesSent,
    suggestionsSent,
    timestamp: new Date().toISOString(),
  });
}
