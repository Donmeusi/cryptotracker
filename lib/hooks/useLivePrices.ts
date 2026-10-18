"use client";

import { useState, useEffect, useCallback } from "react";
import type { PricesMap } from "@/lib/livePrices";

export type LivePriceData = {
  price: number;
  change24h: number;
};

export type { PricesMap };

type PriceableAsset = {
  symbol: string;
  price?: number;
  priceChange24h?: number;
};

export function useLivePrices(
  refreshIntervalMs = 60000,
  initialPrices: PricesMap | null = null
) {
  const [prices, setPrices] = useState<PricesMap | null>(initialPrices);
  const [isLoading, setIsLoading] = useState(!initialPrices);
  const [error, setError] = useState<Error | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchPrices() {
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) throw new Error("Network response was not ok");

        const data = (await res.json()) as PricesMap;

        if (mounted) {
          setPrices(data);
          setIsFallback(Object.keys(data).length === 0);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          console.error("useLivePrices error:", err);
          setError(err instanceof Error ? err : new Error("Unknown error"));
          // Letzten bekannten Kurs behalten - keine erfundenen Kurse.
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

    return () => {
      mounted = false;
    };
  }, [refreshIntervalMs]);

  // Überträgt die geladenen Kurse auf eine beliebige Asset-Liste.
  const injectLivePrices = useCallback(
    <T extends PriceableAsset>(assets: T[]) =>
      assets.map((asset) => {
        const live = prices?.[asset.symbol];
        return {
          ...asset,
          price: live?.price ?? asset.price ?? 0,
          priceChange24h: live?.change24h ?? asset.priceChange24h ?? 0,
        };
      }),
    [prices]
  );

  return { prices, isLoading, error, isFallback, injectLivePrices };
}
