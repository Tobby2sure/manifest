import { NextRequest, NextResponse } from "next/server";
import { sendWeeklyDigest } from "@/app/actions/digest";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const emailsSent = await sendWeeklyDigest();

  return NextResponse.json({
    ok: true,
    emailsSent,
    timestamp: new Date().toISOString(),
  });
}
