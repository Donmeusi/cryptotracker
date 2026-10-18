import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  sendPriceAlert,
  sendPortfolioSummary,
  sendTradeConfirmation,
  sendSecurityAlert,
  sendTaxReminder,
} from "@/lib/email";
import { fetchLivePrices } from "@/lib/livePrices";
import { calculateTaxes } from "@/lib/tax/taxCalculator";

type NotificationType =
  | "price-alert"
  | "portfolio-summary"
  | "trade-confirm"
  | "security"
  | "tax-reminder";

const TYPE_TO_SETTING: Record<NotificationType, string> = {
  "price-alert": "priceAlerts",
  "portfolio-summary": "portfolioSummary",
  "trade-confirm": "tradeConfirm",
  "security": "security",
  "tax-reminder": "taxReminder",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const body = await req.json() as { type: NotificationType };
  const { type } = body;

  if (!Object.keys(TYPE_TO_SETTING).includes(type)) {
    return NextResponse.json({ error: "Unbekannter Benachrichtigungstyp" }, { status: 400 });
  }

  // Einstellung prüfen
  const settings = await db.notificationSettings.findUnique({
    where: { userId: session.user.id },
  });

  const settingKey = TYPE_TO_SETTING[type] as keyof typeof settings;
  if (settings && settings[settingKey] === false) {
    return NextResponse.json(
      { error: "Diese Benachrichtigung ist in deinen Einstellungen deaktiviert." },
      { status: 403 }
    );
  }

  const to = session.user.email;
  const name = session.user.name ?? "Nutzer";
  const currency = (session.user as { currency?: string }).currency ?? "EUR";

  try {
    // Echte Portfoliodaten statt Beispielwerten.
    const portfolio = await db.portfolio.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    const holdings = portfolio
      ? await db.holding.findMany({
          where: { portfolioId: portfolio.id },
          include: { asset: true },
        })
      : [];
    const prices = await fetchLivePrices();
    const valued = holdings
      .map((holding) => {
        const live = prices[holding.asset.symbol];
        return {
          name: holding.asset.name,
          symbol: holding.asset.symbol,
          value: holding.amount * (live?.price ?? 0),
          change: live?.change24h ?? 0,
          price: live?.price ?? 0,
        };
      })
      .sort((a, b) => b.value - a.value);
    const totalValue = valued.reduce((sum, item) => sum + item.value, 0);
    const change24h = valued.reduce(
      (sum, item) => sum + item.value * (item.change / 100),
      0
    );
    const main = valued[0];

    switch (type) {
      case "price-alert":
        if (!main) {
          return NextResponse.json(
            { error: "Noch keine Positionen für einen Preisalarm vorhanden." },
            { status: 400 }
          );
        }
        await sendPriceAlert(to, {
          asset: main.name,
          symbol: main.symbol,
          currentPrice: main.price,
          changePercent: main.change,
          currency,
        });
        break;

      case "portfolio-summary":
        await sendPortfolioSummary(to, {
          name,
          totalValue,
          change24h,
          topAssets: valued.slice(0, 3).map((item) => ({
            name: item.name,
            symbol: item.symbol,
            value: item.value,
            change: item.change,
          })),
          currency,
        });
        break;

      case "trade-confirm": {
        const lastTrade = portfolio
          ? await db.trade.findFirst({
              where: { portfolioId: portfolio.id },
              include: { asset: true, exchange: true },
              orderBy: { executedAt: "desc" },
            })
          : null;
        if (!lastTrade) {
          return NextResponse.json(
            { error: "Noch kein Trade für eine Bestätigung vorhanden." },
            { status: 400 }
          );
        }
        await sendTradeConfirmation(to, {
          type: lastTrade.type,
          asset: lastTrade.asset.name,
          symbol: lastTrade.asset.symbol,
          amount: lastTrade.amount,
          price: lastTrade.price,
          total: lastTrade.amount * lastTrade.price,
          fee: lastTrade.fee,
          exchange:
            lastTrade.exchange?.displayName || lastTrade.exchange?.name || "—",
          currency,
        });
        break;
      }

      case "security":
        await sendSecurityAlert(to, {
          event: "test",
          device: "Testbenachrichtigung",
          location: "—",
          ip: "—",
        });
        break;

      case "tax-reminder": {
        const year = String(new Date().getFullYear() - 1);
        const rows = portfolio
          ? await db.trade.findMany({
              where: { portfolioId: portfolio.id },
              include: { asset: true, exchange: true },
              orderBy: { executedAt: "asc" },
            })
          : [];
        const tax = calculateTaxes(
          rows.map((row) => ({
            id: row.id,
            asset: row.asset.symbol,
            type: row.type,
            exchange:
              row.exchange?.displayName || row.exchange?.name || "",
            amount: row.amount,
            price: row.price,
            fee: row.fee,
            executedAt: row.executedAt.toISOString(),
          })),
          year,
          "FIFO"
        );
        await sendTaxReminder(to, {
          year: Number(year),
          totalGainLoss: tax.summary.taxableIncome,
          taxableEvents: tax.events.length,
          currency,
        });
        break;
      }
    }

    return NextResponse.json({ success: true, message: `Test-E-Mail (${type}) wurde gesendet.` });
  } catch (err) {
    console.error("[email/send]", err);
    return NextResponse.json(
      { error: "E-Mail konnte nicht gesendet werden. Bitte SMTP-Konfiguration prüfen." },
      { status: 500 }
    );
  }
}
