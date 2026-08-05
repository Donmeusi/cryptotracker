import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { MOCK_ASSETS } from "@/lib/mock/data";
import { fetchLivePrices, injectLivePrices } from "@/lib/livePrices";
import LiveDashboard from "@/components/dashboard/LiveDashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const currency = (session?.user as { currency?: string })?.currency || "EUR";
  const userName = session?.user?.name?.split(" ")[0] || "Investor";

  const livePrices = await fetchLivePrices();
  const liveAssets = injectLivePrices(MOCK_ASSETS, livePrices);

  return (
    <LiveDashboard
      userName={userName}
      currency={currency}
      initialAssets={liveAssets}
    />
  );
}
