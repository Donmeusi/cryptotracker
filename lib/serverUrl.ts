import { headers } from "next/headers";

/**
 * Baut die Anmelde-URL aus den Proxy-Headern. So bleibt die Instanz
 * host-unabhängig: keine AUTH_URL nötig, wenn der Proxy Host und
 * X-Forwarded-Proto weiterreicht.
 */
export async function publicLoginUrl(): Promise<string> {
  const headerList = await headers();
  const proto =
    headerList.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host =
    headerList.get("x-forwarded-host") ??
    headerList.get("host") ??
    "localhost:3000";
  return `${proto}://${host}/anmelden`;
}
