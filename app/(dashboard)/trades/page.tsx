import { redirect } from "next/navigation";
import { publicLoginUrl } from "@/lib/serverUrl";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreatePortfolio, toTradeDto } from "@/lib/portfolio";
import TradesClient from "./trades-client";

export const metadata: Metadata = { title: "Trades" };
export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect(await publicLoginUrl());

  const currency =
    (session.user as { currency?: string }).currency || "EUR";
  const portfolio = await getOrCreatePortfolio(session.user.id);
  if (!portfolio) redirect(await publicLoginUrl());
  const trades = await db.trade.findMany({
    where: { portfolioId: portfolio.id },
    include: { asset: true, exchange: true },
    orderBy: { executedAt: "desc" },
    take: 500,
  });

  return (
    <TradesClient
      initialTrades={trades.map((trade) => toTradeDto(trade))}
      currency={currency}
    />
  );
}
