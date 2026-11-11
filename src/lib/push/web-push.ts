import "server-only";
import * as webpush from "web-push";
import type { PushSender } from "./reminders";

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

let configured = false;

/** Sends through the browser's push service (FCM on Android) with VAPID. */
export const webPushSender: PushSender = async (subscription, payload) => {
  if (!configured) {
    // Must be an https: or mailto: URL identifying the sender.
    const subject = [process.env.VAPID_SUBJECT, process.env.BETTER_AUTH_URL]
      .filter((url): url is string => Boolean(url))
      .find((url) => /^(https|mailto):/.test(url));
    webpush.setVapidDetails(
      subject ?? "https://zaneta-sigma.vercel.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
      process.env.VAPID_PRIVATE_KEY ?? "",
    );
    configured = true;
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60, urgency: "high" },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    throw error;
  }
};
