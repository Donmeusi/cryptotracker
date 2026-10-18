import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreatePortfolio } from "@/lib/portfolio";
import { calculateTaxes, type Trade } from "@/lib/tax/taxCalculator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || String(new Date().getFullYear());
    const methodStr = searchParams.get("method") || "FIFO";

    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: "Ungültiges Steuerjahr." }, { status: 400 });
    }

    if (!["FIFO", "LIFO", "HIFO"].includes(methodStr)) {
      return NextResponse.json(
        { error: "Unbekanntes Berechnungsverfahren." },
        { status: 400 }
      );
    }

    const method = methodStr as "FIFO" | "LIFO" | "HIFO";
    const portfolio = await getOrCreatePortfolio(session.user.id);

    const rows = await db.trade.findMany({
      where: { portfolioId: portfolio.id },
      include: { asset: true, exchange: true },
      orderBy: { executedAt: "asc" },
    });

    // Der Rechner verarbeitet die gesamte Historie und gibt nur die Ereignisse
    // des gewünschten Jahres zurück.
    const trades: Trade[] = rows.map((row) => ({
      id: row.id,
      asset: row.asset.symbol,
      type: row.type,
      exchange: row.exchange?.displayName || row.exchange?.name || "",
      amount: row.amount,
      price: row.price,
      fee: row.fee,
      executedAt: row.executedAt.toISOString(),
    }));

    const result = calculateTaxes(trades, year, method);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Steuerberechnung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Steuerberechnung fehlgeschlagen." },
      { status: 500 }
    );
  }
}
