import { useState, useEffect } from "react";
import { MOCK_ASSETS } from "@/lib/mock/data";

export type LivePriceData = {
  price: number;
  change24h: number;
};

export type PricesMap = Record<string, LivePriceData>;

export function useLivePrices(refreshIntervalMs = 60000) {
  const [prices, setPrices] = useState<PricesMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchPrices() {
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) throw new Error("Network response was not ok");
        
        const data = await res.json();
        
        if (mounted) {
          if (data._isFallback) {
            setIsFallback(true);
            delete data._isFallback;
          } else {
            setIsFallback(false);
          }
          setPrices(data);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          console.error("useLivePrices error:", err);
          setError(err instanceof Error ? err : new Error("Unknown error"));
          // Load fallback data directly on critical failure
          const fallback: PricesMap = {};
          for (const a of MOCK_ASSETS) {
            fallback[a.symbol] = { price: a.price, change24h: a.priceChange24h };
          }
          setPrices(fallback);
          setIsFallback(true);
          setIsLoading(false);
        }
      }
    }

    fetchPrices();

    if (refreshIntervalMs > 0) {
      const interval = setInterval(fetchPrices, refreshIntervalMs);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }

    return () => { mounted = false; };
  }, [refreshIntervalMs]);

  // Helper function to inject live prices into our MOCK_ASSETS list
  const injectLivePrices = (assets: typeof MOCK_ASSETS) => {
    if (!prices) return assets;
    
    return assets.map(asset => {
      const liveData = prices[asset.symbol];
      if (liveData) {
        return {
          ...asset,
          price: liveData.price,
          priceChange24h: liveData.change24h
        };
      }
      return asset;
    });
  };

  return { prices, isLoading, error, isFallback, injectLivePrices };
}
