/** Browser side of push notifications (service worker + subscription). */

export type PushStatus =
  | "unsupported"
  | "not-configured"
  | "denied"
  | "off"
  | "on";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function supported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function registration() {
  return navigator.serviceWorker.register("/sw.js");
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!supported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  if (Notification.permission === "denied") return "denied";
  const reg = await registration();
  return (await reg.pushManager.getSubscription()) ? "on" : "off";
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Asks for permission, subscribes this device and saves it on the server. */
export async function enablePush(): Promise<PushStatus> {
  if (!supported()) return "unsupported";
  if ((await Notification.requestPermission()) !== "granted") {
    return Notification.permission === "denied" ? "denied" : "off";
  }
  const reg = await registration();
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
    }));
  const response = await fetch("/api/push/subscription", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!response.ok) throw new Error(`Subscribe failed: ${response.status}`);
  return "on";
}

export async function disablePush(): Promise<PushStatus> {
  if (!supported()) return "unsupported";
  const reg = await registration();
  const subscription = await reg.pushManager.getSubscription();
  if (subscription) {
    await fetch("/api/push/subscription", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    await subscription.unsubscribe();
  }
  return "off";
}

export async function sendTestPush(): Promise<number> {
  const response = await fetch("/api/push/test", { method: "POST" });
  if (!response.ok) throw new Error(`Test push failed: ${response.status}`);
  return ((await response.json()) as { sent: number }).sent;
}
