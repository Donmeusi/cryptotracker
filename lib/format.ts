// Formatierung und einfache Portfolio-Kennzahlen.
// Bewusst ohne Bezug zu lib/mock: Diese Datei ist auch dann nutzbar, wenn
// keine Demo-Daten mehr im Projekt liegen.

export function formatCurrency(
  value: number,
  currency: string = "EUR",
  compact: boolean = false
): string {
  try {
    if (compact && Math.abs(value) >= 1000000) {
      return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);
    }

    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2,
    }).format(value);
  } catch {
    // Ungültiger Währungscode: lieber EUR anzeigen als die Seite crashen.
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.abs(value) < 1 ? 6 : 2,
    }).format(value);
  }
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatAmount(value: number, symbol: string): string {
  const decimals = value < 1 ? 6 : value < 100 ? 4 : 2;
  return `${value.toFixed(decimals)} ${symbol}`;
}

export type HoldingView = {
  symbol: string;
  amount: number;
  avgBuyPrice: number;
};

export type AssetView = {
  symbol: string;
  price?: number;
};

export function calculatePortfolioValue(
  holdings: HoldingView[],
  assets: AssetView[]
): number {
  return holdings.reduce((total, holding) => {
    const asset = assets.find((a) => a.symbol === holding.symbol);
    if (!asset) return total;
    return total + holding.amount * (asset.price ?? 0);
  }, 0);
}

export function calculatePnL(
  holdings: HoldingView[],
  assets: AssetView[]
): { absolute: number; percent: number } {
  let currentValue = 0;
  let costBasis = 0;

  holdings.forEach((holding) => {
    const asset = assets.find((a) => a.symbol === holding.symbol);
    if (!asset) return;
    currentValue += holding.amount * (asset.price ?? 0);
    costBasis += holding.amount * holding.avgBuyPrice;
  });

  const absolute = currentValue - costBasis;
  const percent = costBasis > 0 ? (absolute / costBasis) * 100 : 0;

  return { absolute, percent };
}
