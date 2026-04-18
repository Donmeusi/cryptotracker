export type Trade = {
  id: string;
  asset: string;
  type: string;
  exchange: string;
  amount: number;
  price: number;
  fee: number;
  executedAt: string;
};

export type TaxEvent = {
  asset: string;
  buyDate: string;
  sellDate: string;
  holdingDays: number;
  costBasis: number;
  proceeds: number;
  gainLoss: number;
  type: "SHORT_TERM" | "LONG_TERM";
};

export type TaxSummary = {
  totalGains: number;
  totalLosses: number;
  taxableIncome: number;
  estimatedTax: number;
};

export type TaxResult = {
  year: string;
  method: string;
  events: TaxEvent[];
  summary: TaxSummary;
};

type Tranche = {
  amount: number;
  price: number;
  fee: number;
  executedAt: Date;
};

export function calculateTaxes(
  trades: Trade[],
  year: string,
  method: "FIFO" | "LIFO" | "HIFO"
): TaxResult {
  // Sort trades chronologically ASC (oldest first) to simulate history correctly
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
  );

  const pools: Record<string, Tranche[]> = {};
  const events: TaxEvent[] = [];
  const targetYearInt = parseInt(year, 10);

  for (const trade of sortedTrades) {
    const asset = trade.asset;
    if (!pools[asset]) pools[asset] = [];

    const tradeDate = new Date(trade.executedAt);

    if (trade.type === "BUY" || trade.type === "TRANSFER_IN") {
      pools[asset].push({
        amount: trade.amount,
        price: trade.price,
        fee: trade.fee,
        executedAt: tradeDate,
      });
    } else if (trade.type === "SELL") {
      let amountToSell = trade.amount;
      const sellYear = tradeDate.getFullYear();

      // Sort pool based on method before consuming
      if (method === "FIFO") {
        pools[asset].sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime());
      } else if (method === "LIFO") {
        pools[asset].sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
      } else if (method === "HIFO") {
        // Highest In, First Out -> Sort descending by price
        pools[asset].sort((a, b) => b.price - a.price);
      }

      while (amountToSell > 0 && pools[asset].length > 0) {
        // Always take the first element after sorting
        const tranche = pools[asset][0];

        const amountUsed = Math.min(amountToSell, tranche.amount);
        const holdingDays = Math.floor(
          (tradeDate.getTime() - tranche.executedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const costBasis = amountUsed * tranche.price;
        const proceeds = amountUsed * trade.price;
        const gainLoss = proceeds - costBasis;
        // In DE: > 365 days is long term (tax free)
        const type = holdingDays > 365 ? "LONG_TERM" : "SHORT_TERM";

        // Only add to results if it happened in the target year
        if (sellYear === targetYearInt) {
          events.push({
            asset: asset,
            buyDate: tranche.executedAt.toISOString(),
            sellDate: trade.executedAt,
            holdingDays,
            costBasis,
            proceeds,
            gainLoss,
            type,
          });
        }

        amountToSell -= amountUsed;
        tranche.amount -= amountUsed;

        // If tranche is exhausted, remove it
        if (tranche.amount <= 1e-8) {
          pools[asset].shift();
        }
      }
    }
  }

  // Calculate Summary only for the generated events
  let totalGains = 0;
  let totalLosses = 0;
  let taxableIncome = 0;

  for (const event of events) {
    if (event.gainLoss > 0) {
      totalGains += event.gainLoss;
      // In Germany, long term is tax free
      if (event.type === "SHORT_TERM") {
        taxableIncome += event.gainLoss;
      }
    } else {
      totalLosses += Math.abs(event.gainLoss);
      if (event.type === "SHORT_TERM") {
        taxableIncome -= Math.abs(event.gainLoss); // Losses offset taxable income
      }
    }
  }

  // If taxableIncome is less than 0, it means losses offset gains, tax is 0.
  // Exception handling for Freigrenze (1000€) in DE.
  if (taxableIncome > 0 && taxableIncome <= 1000) {
    // If under Freigrenze, tax is technically 0, but usually taxable income is stated as it is.
    // For simplicity, estimated tax is 0.
    taxableIncome = 0; 
  }

  const estimatedTax = taxableIncome > 0 ? taxableIncome * 0.26375 : 0; // ~25% Abgeltungssteuer + Soli

  return {
    year,
    method,
    events,
    summary: {
      totalGains,
      totalLosses,
      taxableIncome: Math.max(0, taxableIncome),
      estimatedTax,
    },
  };
}
