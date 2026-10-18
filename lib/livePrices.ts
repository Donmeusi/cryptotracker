export type LivePriceData = {
  price: number;
  change24h: number;
};

export type PricesMap = Record<string, LivePriceData>;

type CoinGeckoMarket = {
  symbol?: string;
  current_price?: number;
  price_change_percentage_24h?: number | null;
};

// Kurse kommen aus der CoinGecko-Marktliste (Top 250, EUR). Früher wurden die
// IDs aus den Demo-Daten gelesen; die Marktliste deckt auch Coins ab, die erst
// später erfasst werden.
const MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets" +
  "?vs_currency=eur&order=market_cap_desc&per_page=250&page=1" +
  "&price_change_percentage=24h";

export async function fetchLivePrices(): Promise<PricesMap> {
  try {
    const response = await fetch(MARKETS_URL, { next: { revalidate: 60 } });

    if (!response.ok) {
      console.warn(
        `CoinGecko nicht erreichbar (${response.status}) - Kurse bleiben leer`
      );
      return {};
    }

    const data = (await response.json()) as CoinGeckoMarket[];
    if (!Array.isArray(data)) return {};

    const prices: PricesMap = {};
    for (const coin of data) {
      if (!coin.symbol) continue;
      prices[coin.symbol.trim().toUpperCase()] = {
        price:
          typeof coin.current_price === "number" ? coin.current_price : 0,
        change24h:
          typeof coin.price_change_percentage_24h === "number"
            ? coin.price_change_percentage_24h
            : 0,
      };
    }

    return prices;
  } catch (error) {
    console.error("CoinGecko-Abruf fehlgeschlagen:", error);
    return {};
  }
}

export type PriceableAsset = {
  symbol: string;
  price?: number;
  priceChange24h?: number;
};

/**
 * Überträgt Live-Kurse auf eine Asset-Liste. Fehlt ein Kurs, bleibt der zuletzt
 * bekannte Wert stehen (oder 0) - es werden keine Zufallskurse erzeugt.
 */
export function injectLivePrices<T extends PriceableAsset>(
  assets: T[],
  pricesMap: PricesMap | null
): (T & { price: number; priceChange24h: number })[] {
  return assets.map((asset) => {
    const live = pricesMap?.[asset.symbol];
    return {
      ...asset,
      price: live?.price ?? asset.price ?? 0,
      priceChange24h: live?.change24h ?? asset.priceChange24h ?? 0,
    };
  });
}
