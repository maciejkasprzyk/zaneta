import { getDb } from "@/db";
import { sendDueReminders } from "@/lib/push/reminders";
import { isPushConfigured, webPushSender } from "@/lib/push/web-push";
import { getStorageMode } from "@/lib/storage-mode";

/**
 * Called every 5 minutes by an external cron (cron-job.org) with
 * `Authorization: Bearer <CRON_SECRET>`; sends reminders that are due.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (getStorageMode() !== "database" || !isPushConfigured()) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  const result = await sendDueReminders(getDb(), webPushSender);
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
