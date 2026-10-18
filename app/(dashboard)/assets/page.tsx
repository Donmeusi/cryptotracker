import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchLivePrices } from "@/lib/livePrices";
import { getOrCreatePortfolio, toHoldingDto } from "@/lib/portfolio";
import AssetsClient from "./assets-client";

export const metadata: Metadata = { title: "Assets" };
export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/anmelden");

  const currency =
    (session.user as { currency?: string }).currency || "EUR";
  const portfolio = await getOrCreatePortfolio(session.user.id);
  const holdings = await db.holding.findMany({
    where: { portfolioId: portfolio.id },
    include: { asset: true },
    orderBy: { updatedAt: "desc" },
  });
  const initialPrices = await fetchLivePrices();

  return (
    <AssetsClient
      initialHoldings={holdings.map((holding) => toHoldingDto(holding))}
      initialPrices={initialPrices}
      currency={currency}
    />
  );
}
