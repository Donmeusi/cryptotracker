import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { publicLoginUrl } from "@/lib/serverUrl";
import { db } from "@/lib/db";
import { fetchLivePrices, injectLivePrices } from "@/lib/livePrices";
import { getOrCreatePortfolio, toHoldingDto } from "@/lib/portfolio";
import LiveDashboard from "@/components/dashboard/LiveDashboard";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect(await publicLoginUrl());

  const currency = (session?.user as { currency?: string })?.currency || "EUR";
  const userName = session?.user?.name?.split(" ")[0] || "Investor";

  const portfolio = await getOrCreatePortfolio(session.user.id);
  if (!portfolio) redirect(await publicLoginUrl());
  const holdings = await db.holding.findMany({
    where: { portfolioId: portfolio.id },
    include: { asset: true },
    orderBy: { updatedAt: "desc" },
  });

  const livePrices = await fetchLivePrices();
  const liveAssets = injectLivePrices(
    holdings.map((holding) => ({
      symbol: holding.asset.symbol,
      name: holding.asset.name,
      price: holding.currentPrice,
      priceChange24h: 0,
    })),
    livePrices
  );

  return (
    <LiveDashboard
      userName={userName}
      currency={currency}
      initialHoldings={holdings.map((holding) => toHoldingDto(holding))}
      initialAssets={liveAssets}
    />
  );
}
