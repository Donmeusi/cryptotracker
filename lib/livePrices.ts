import { MOCK_ASSETS } from "@/lib/mock/data";

export type LivePriceData = {
  price: number;
  change24h: number;
};

export type PricesMap = Record<string, LivePriceData>;

export async function fetchLivePrices(): Promise<PricesMap> {
  const coinIds = MOCK_ASSETS.map((a) => a.coingeckoId).filter(Boolean).join(",");
  const fallbackPrices: PricesMap = {};
  
  for (const asset of MOCK_ASSETS) {
    fallbackPrices[asset.symbol] = {
      price: asset.price,
      change24h: asset.priceChange24h,
    };
  }

  if (!coinIds) return fallbackPrices;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=eur&include_24hr_change=true`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      console.warn(`CoinGecko rate limit hit or error (${response.status}) - using fallback`);
      return fallbackPrices;
    }

    const data = await response.json();
    const prices: PricesMap = {};

    for (const asset of MOCK_ASSETS) {
      if (asset.coingeckoId && data[asset.coingeckoId]) {
        prices[asset.symbol] = {
          price: data[asset.coingeckoId].eur || asset.price,
          change24h: data[asset.coingeckoId].eur_24h_change || asset.priceChange24h,
        };
      } else {
        prices[asset.symbol] = fallbackPrices[asset.symbol];
      }
    }

    return prices;
  } catch (error) {
    console.error("CoinGecko fetch failed:", error);
    return fallbackPrices; // Fail gracefully
  }
}

export function injectLivePrices(assets: typeof MOCK_ASSETS, pricesMap: PricesMap | null) {
  if (!pricesMap) return assets;
  return assets.map((asset) => {
    const live = pricesMap[asset.symbol];
    if (live) {
      return {
        ...asset,
        price: live.price,
        priceChange24h: live.change24h,
      };
    }
    return asset;
  });
}
