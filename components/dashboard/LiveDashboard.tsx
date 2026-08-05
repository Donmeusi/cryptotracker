"use client";

import { useState, useEffect, useTransition } from "react";
import {
  MOCK_ASSETS,
  MOCK_HOLDINGS,
  MOCK_DEFI_POSITIONS,
  calculatePortfolioValue,
  calculatePnL,
  formatCurrency,
  formatPercent,
} from "@/lib/mock/data";

type Asset = typeof MOCK_ASSETS[number];

import AllocationChart from "@/components/dashboard/AllocationChart";
import {
  TrendingUp, TrendingDown, ArrowUpRight, Activity, Layers, Coins,
  RefreshCw, Clock
} from "lucide-react";

interface LiveDashboardProps {
  userName: string;
  currency: string;
  initialAssets: Asset[];
}

export default function LiveDashboard({
  userName,
  currency,
  initialAssets,
}: LiveDashboardProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down"> >({});
  const [, startTransition] = useTransition();

  // Handle live price fetch
  async function refreshPrices() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/prices", { cache: "no-store" });
      if (!res.ok) throw new Error("Fetch failed");
      const priceMap: Record<string, { price: number; change24h: number }> = await res.json();

      const newFlashes: Record<string, "up" | "down"> = {};
      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          const live = priceMap[asset.symbol];
          if (!live) return asset;
          if (live.price > asset.price) newFlashes[asset.symbol] = "up";
          else if (live.price < asset.price) newFlashes[asset.symbol] = "down";

          return {
            ...asset,
            price: live.price,
            priceChange24h: live.change24h ?? asset.priceChange24h,
          };
        })
      );

      setFlashMap(newFlashes);
      setLastUpdated(new Date());

      // Reset flash animation after 1.2s
      setTimeout(() => setFlashMap({}), 1200);
    } catch {
      // Fallback: apply minor random fluctuation for demo
      const newFlashes: Record<string, "up" | "down"> = {};
      setAssets((prevAssets) =>
        prevAssets.map((asset) => {
          const deltaPct = (Math.random() - 0.48) * 0.008;
          const newPrice = Math.max(0.001, asset.price * (1 + deltaPct));
          if (newPrice > asset.price) newFlashes[asset.symbol] = "up";
          else if (newPrice < asset.price) newFlashes[asset.symbol] = "down";

          return {
            ...asset,
            price: parseFloat(newPrice.toFixed(asset.price > 100 ? 2 : 4)),
          };
        })
      );
      setFlashMap(newFlashes);
      setLastUpdated(new Date());
      setTimeout(() => setFlashMap({}), 1200);
    } finally {
      setIsRefreshing(false);
    }
  }

  // Auto-refresh timer (every 15s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      startTransition(() => {
        refreshPrices();
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const portfolioValue = calculatePortfolioValue(MOCK_HOLDINGS, assets);
  const { absolute: pnlAbsolute, percent: pnlPercent } = calculatePnL(MOCK_HOLDINGS, assets);
  const isPositive = pnlAbsolute >= 0;

  const defiValue = MOCK_DEFI_POSITIONS.reduce((sum, p) => sum + p.valueUsd, 0);
  const totalValue = portfolioValue + defiValue;

  // Allocation data
  const allocationData = MOCK_HOLDINGS.map((h) => {
    const asset = assets.find((a) => a.symbol === h.symbol) || { price: 0 };
    return {
      name: h.symbol,
      value: parseFloat(((h.amount * asset.price / portfolioValue) * 100).toFixed(1)),
      amount: h.amount * asset.price,
    };
  }).sort((a, b) => b.value - a.value);

  return (
    <div className="page-container fade-in">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Guten Tag, {userName} 👋</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString("de-DE", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div className="dashboard-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={refreshPrices}
            disabled={isRefreshing}
            title="Kurse jetzt manuell aktualisieren"
          >
            <RefreshCw size={13} className={isRefreshing ? "spin" : ""} />
            {isRefreshing ? "Lädt..." : "Aktualisieren"}
          </button>
          <div
            className="live-indicator"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{ cursor: "pointer" }}
            title={autoRefresh ? "Auto-Refresh aktiv (alle 15s). Klicken zum Pausieren." : "Auto-Refresh pausiert. Klicken zum Aktivieren."}
          >
            <div className={`live-dot ${autoRefresh ? "" : "paused"}`} />
            <span>{autoRefresh ? "Live 15s" : "Pausiert"}</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card nw-card">
          <div className="stat-label">Gesamtvermögen</div>
          <div className="stat-value mono">{formatCurrency(totalValue, currency)}</div>
          <div className={`stat-change ${isPositive ? "positive" : "negative"}`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{formatCurrency(Math.abs(pnlAbsolute), currency)}</span>
            <span className="stat-change-pct">({formatPercent(pnlPercent)})</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Coins size={12} style={{ display: "inline", marginRight: 4 }} />
            Krypto-Portfolio
          </div>
          <div className="stat-value mono" style={{ fontSize: "var(--text-2xl)" }}>
            {formatCurrency(portfolioValue, currency)}
          </div>
          <div className="stat-change neutral">{MOCK_HOLDINGS.length} Assets</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Layers size={12} style={{ display: "inline", marginRight: 4 }} />
            DeFi-Wert
          </div>
          <div className="stat-value mono" style={{ fontSize: "var(--text-2xl)" }}>
            {formatCurrency(defiValue, currency)}
          </div>
          <div className="stat-change neutral">{MOCK_DEFI_POSITIONS.length} Protokolle</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Activity size={12} style={{ display: "inline", marginRight: 4 }} />
            Zuletzt Aktualisiert
          </div>
          <div className="stat-value mono" style={{ fontSize: "var(--text-xl)" }}>
            {lastUpdated.toLocaleTimeString("de-DE")}
          </div>
          <div className="stat-change positive">
            <Clock size={13} />
            <span>Auto-Sync {autoRefresh ? "aktiv" : "aus"}</span>
          </div>
        </div>
      </div>

      {/* Asset Allocation Row */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <div className="card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Asset-Verteilung</h2>
              <p className="card-subtitle">Nach Marktwert</p>
            </div>
          </div>
          <AllocationChart data={allocationData} currency={currency} />
        </div>
      </div>

      {/* Top Holdings */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header-row" style={{ marginBottom: "var(--space-4)" }}>
          <div>
            <h2 className="card-title">Top Holdings</h2>
            <p className="card-subtitle">Deine größten Positionen (Echtzeit-Kurse)</p>
          </div>
          <a href="/assets" className="btn btn-ghost btn-sm">
            Alle ansehen <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Menge</th>
                <th>Kurs</th>
                <th>24h</th>
                <th>Marktwert</th>
                <th>Anteil</th>
                <th>G&V</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HOLDINGS.map((holding) => {
                const asset = assets.find((a) => a.symbol === holding.symbol);
                if (!asset) return null;
                const marketValue = holding.amount * asset.price;
                const costBasis = holding.amount * holding.avgBuyPrice;
                const pnl = marketValue - costBasis;
                const pnlPct = (pnl / costBasis) * 100;
                const allocation = ((marketValue / portfolioValue) * 100).toFixed(1);
                const isUp = asset.priceChange24h >= 0;
                const flashClass = flashMap[asset.symbol] === "up" ? "flash-green" : flashMap[asset.symbol] === "down" ? "flash-red" : "";

                return (
                  <tr key={holding.symbol} className={flashClass}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <div className="asset-icon asset-icon-sm">
                          {asset.symbol.charAt(0)}
                        </div>
                        <div>
                          <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                            {asset.symbol}
                          </div>
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                            {asset.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{holding.amount.toFixed(asset.price > 100 ? 4 : 2)}</td>
                    <td className={`mono primary ${flashClass}`}>
                      {formatCurrency(asset.price, currency)}
                    </td>
                    <td>
                      <span className={`badge ${isUp ? "badge-green" : "badge-red"}`}>
                        {isUp ? "▲" : "▼"} {Math.abs(asset.priceChange24h).toFixed(2)}%
                      </span>
                    </td>
                    <td className="mono primary">{formatCurrency(marketValue, currency)}</td>
                    <td>
                      <div className="allocation-bar-wrap">
                        <div
                          className="allocation-bar"
                          style={{ width: `${allocation}%` }}
                        />
                        <span>{allocation}%</span>
                      </div>
                    </td>
                    <td>
                      <div className={pnl >= 0 ? "positive" : "negative"} style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                        {pnl >= 0 ? "+" : ""}{formatCurrency(pnl, currency)}
                        <div style={{ fontSize: "var(--text-xs)", opacity: 0.7 }}>
                          {formatPercent(pnlPct)}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: var(--space-8);
        }
        .dashboard-header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .live-indicator {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 6px var(--space-3);
          background: var(--green-dim);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: var(--radius-full);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--green);
          user-select: none;
          transition: all var(--transition-fast);
        }
        .live-indicator:hover {
          opacity: 0.85;
        }
        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--green);
          box-shadow: 0 0 8px var(--green);
          animation: pulse 2s infinite;
        }
        .live-dot.paused {
          background: var(--text-muted);
          box-shadow: none;
          animation: none;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        .card-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .card-title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--text-primary);
        }
        .card-subtitle {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .allocation-bar-wrap {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }
        .allocation-bar {
          height: 6px;
          background: var(--green);
          border-radius: var(--radius-full);
          min-width: 4px;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
