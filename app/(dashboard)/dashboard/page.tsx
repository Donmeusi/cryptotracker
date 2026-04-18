import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import {
  MOCK_ASSETS,
  MOCK_HOLDINGS,
  generatePortfolioHistory,
  calculatePortfolioValue,
  calculatePnL,
  formatCurrency,
  formatPercent,
  MOCK_DEFI_POSITIONS,
} from "@/lib/mock/data";
import PortfolioChart from "@/components/dashboard/PortfolioChart";
import AllocationChart from "@/components/dashboard/AllocationChart";
import { fetchLivePrices, injectLivePrices } from "@/lib/livePrices";
import { TrendingUp, TrendingDown, ArrowUpRight, Activity, Layers, Coins } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const currency = (session?.user as { currency?: string })?.currency || "EUR";
  const userName = session?.user?.name?.split(" ")[0] || "Investor";

  const livePrices = await fetchLivePrices();
  const liveAssets = injectLivePrices(MOCK_ASSETS, livePrices);

  const portfolioValue = calculatePortfolioValue(MOCK_HOLDINGS, liveAssets);
  const { absolute: pnlAbsolute, percent: pnlPercent } = calculatePnL(
    MOCK_HOLDINGS,
    liveAssets
  );
  const isPositive = pnlAbsolute >= 0;
  const history30d = generatePortfolioHistory(30);
  const history7d = generatePortfolioHistory(7);

  const defiValue = MOCK_DEFI_POSITIONS.reduce((sum, p) => sum + p.valueUsd, 0);
  const totalValue = portfolioValue + defiValue;

  // Allocation-Daten für Donut-Chart
  const allocationData = MOCK_HOLDINGS.map((h) => {
    const asset = liveAssets.find((a) => a.symbol === h.symbol)!;
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
          <div className="live-indicator">
            <div className="live-dot" />
            <span>Live</span>
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
            Ø Tagesveränderung
          </div>
          <div
            className="stat-value mono"
            style={{ fontSize: "var(--text-2xl)", color: "var(--green)" }}
          >
            +€ 342,80
          </div>
          <div className="stat-change positive">
            <TrendingUp size={14} />
            +1.24% heute
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: "var(--space-6)" }}>
        {/* Portfolio Performance */}
        <div className="card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Portfolio-Performance</h2>
              <p className="card-subtitle">Letzte 30 Tage</p>
            </div>
          </div>
          <PortfolioChart data={history30d} currency={currency} />
        </div>

        {/* Allocation */}
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
            <p className="card-subtitle">Deine größten Positionen</p>
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
                const asset = liveAssets.find((a) => a.symbol === holding.symbol);
                if (!asset) return null;
                const marketValue = holding.amount * asset.price;
                const costBasis = holding.amount * holding.avgBuyPrice;
                const pnl = marketValue - costBasis;
                const pnlPct = (pnl / costBasis) * 100;
                const allocation = ((marketValue / portfolioValue) * 100).toFixed(1);
                const isUp = asset.priceChange24h >= 0;

                return (
                  <tr key={holding.symbol}>
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
                    <td className="mono primary">{formatCurrency(asset.price, currency)}</td>
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
          color: var(--green);
          font-weight: 600;
        }
        .live-dot {
          width: 7px;
          height: 7px;
          background: var(--green);
          border-radius: 50%;
          animation: pulse-live 2s infinite;
        }
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .nw-card {
          grid-column: span 1;
          border-color: rgba(34, 197, 94, 0.15);
          background: linear-gradient(135deg, var(--bg-card) 0%, rgba(34,197,94,0.04) 100%);
        }
        .stat-change-pct {
          color: var(--text-muted);
          font-size: var(--text-xs);
        }
        .card-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .card-title {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-primary);
        }
        .card-subtitle {
          font-size: var(--text-xs);
          color: var(--text-muted);
          margin-top: 2px;
        }
        .allocation-bar-wrap {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-xs);
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }
        .allocation-bar {
          height: 4px;
          background: var(--green);
          border-radius: 2px;
          max-width: 80px;
          min-width: 4px;
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
