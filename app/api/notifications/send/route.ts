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

  try {
    switch (type) {
      case "price-alert":
        await sendPriceAlert(to, {
          asset: "Bitcoin",
          symbol: "BTC",
          currentPrice: 64_250.00,
          changePercent: -5.34,
          currency: (session.user as { currency?: string }).currency ?? "EUR",
        });
        break;

      case "portfolio-summary":
        await sendPortfolioSummary(to, {
          name,
          totalValue: 24_387.50,
          change24h: -312.40,
          topAssets: [
            { name: "Bitcoin", symbol: "BTC", value: 14_200.00, change: -5.34 },
            { name: "Ethereum", symbol: "ETH", value: 7_430.00, change: 2.11 },
            { name: "Solana", symbol: "SOL", value: 2_757.50, change: 8.92 },
          ],
          currency: (session.user as { currency?: string }).currency ?? "EUR",
        });
        break;

      case "trade-confirm":
        await sendTradeConfirmation(to, {
          type: "BUY",
          asset: "Bitcoin",
          symbol: "BTC",
          amount: 0.05,
          price: 64_250.00,
          total: 3_212.50,
          fee: 9.64,
          exchange: "Binance",
          currency: (session.user as { currency?: string }).currency ?? "EUR",
        });
        break;

      case "security":
        await sendSecurityAlert(to, {
          event: "test",
          device: "Windows · Chrome",
          location: "Deutschland",
          ip: "127.0.0.1",
        });
        break;

      case "tax-reminder":
        await sendTaxReminder(to, {
          year: new Date().getFullYear() - 1,
          totalGainLoss: 5_923.00,
          taxableEvents: 14,
          currency: (session.user as { currency?: string }).currency ?? "EUR",
        });
        break;
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
