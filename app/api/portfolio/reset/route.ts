import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreatePortfolio } from "@/lib/portfolio";

export const dynamic = "force-dynamic";

/**
 * Löscht alle Portfolio-Daten (Trades und Positionen) des angemeldeten
 * Benutzers. Das Portfolio selbst und der globale Asset-Katalog bleiben
 * bestehen, damit die App sofort weiter benutzbar ist.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const portfolio = await getOrCreatePortfolio(session.user.id);
    if (!portfolio) {
      return NextResponse.json(
        { error: "Sitzung ungültig – bitte neu anmelden." },
        { status: 401 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const trades = await tx.trade.deleteMany({
        where: { portfolioId: portfolio.id },
      });
      const holdings = await tx.holding.deleteMany({
        where: { portfolioId: portfolio.id },
      });
      return { trades: trades.count, holdings: holdings.count };
    });

    return NextResponse.json({ success: true, deleted: result });
  } catch (error) {
    console.error("Portfolio-Reset fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Daten konnten nicht gelöscht werden." },
      { status: 500 }
    );
  }
}
