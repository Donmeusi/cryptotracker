import type { Metadata } from "next";
import { MOCK_DEFI_POSITIONS, formatCurrency } from "@/lib/mock/data";
import { Layers, TrendingUp, Droplets, Lock, ArrowUpDown } from "lucide-react";

export const metadata: Metadata = { title: "DeFi" };

const TYPE_ICONS: Record<string, React.ReactNode> = {
  LIQUIDITY_POOL: <Droplets size={14} />,
  STAKING: <Lock size={14} />,
  LENDING: <TrendingUp size={14} />,
  BORROWING: <ArrowUpDown size={14} />,
  YIELD_FARMING: <Layers size={14} />,
};

const TYPE_LABELS: Record<string, string> = {
  LIQUIDITY_POOL: "Liquiditätspool",
  STAKING: "Staking",
  LENDING: "Lending",
  BORROWING: "Borrowing",
  YIELD_FARMING: "Yield Farming",
};

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: "#3b82f6",
  Polygon: "#06b6d4",
  BSC: "#f59e0b",
  Avalanche: "#ef4444",
  Arbitrum: "#14b8a6",
};

export default function DeFiPage() {
  const totalValue = MOCK_DEFI_POSITIONS.reduce((s, p) => s + p.valueUsd, 0);
  const avgApy = MOCK_DEFI_POSITIONS.filter(p => p.apy).reduce((s, p) => s + (p.apy || 0), 0) / MOCK_DEFI_POSITIONS.length;

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">DeFi-Positionen</h1>
        <p className="page-subtitle">Protokolle, Yields und Liquiditätspositionen</p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-label">Gesamt DeFi-Wert</div>
          <div className="stat-value mono" style={{ fontSize: "var(--text-2xl)" }}>{formatCurrency(totalValue, "EUR")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Aktive Protokolle</div>
          <div className="stat-value">{MOCK_DEFI_POSITIONS.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ø APY</div>
          <div className="stat-value mono" style={{ color: "var(--green)", fontSize: "var(--text-2xl)" }}>
            {avgApy.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Positions Grid */}
      <div className="positions-grid">
        {MOCK_DEFI_POSITIONS.map((pos) => {
          const chainColor = CHAIN_COLORS[pos.chain] || "var(--text-muted)";
          const daysSince = Math.floor((Date.now() - new Date(pos.startedAt).getTime()) / (1000 * 60 * 60 * 24));
          const earnedEstimate = pos.apy ? (pos.valueUsd * (pos.apy / 100) * daysSince / 365) : 0;

          return (
            <div key={pos.id} className="position-card">
              <div className="position-header">
                <div>
                  <div className="position-protocol">{pos.protocol}</div>
                  <div className="position-asset">{pos.assetSymbol}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="defi-type-badge" style={{ borderColor: `${chainColor}40`, color: chainColor }}>
                    {pos.chain}
                  </div>
                </div>
              </div>

              <div className="type-badge-wrap">
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--teal)", background: "var(--teal-dim)", borderRadius: "var(--radius-full)", fontSize: "var(--text-xs)", padding: "3px 10px", fontWeight: 500, width: "fit-content" }}>
                  {TYPE_ICONS[pos.type]}
                  {TYPE_LABELS[pos.type]}
                </span>
              </div>

              <div className="position-metrics">
                <div className="pos-metric">
                  <span className="pos-metric-label">Gesperrt</span>
                  <span className="pos-metric-value mono">{formatCurrency(pos.valueUsd, "USD")}</span>
                </div>
                {pos.apy && (
                  <div className="pos-metric">
                    <span className="pos-metric-label">APY</span>
                    <span className="pos-metric-value" style={{ color: "var(--green)" }}>
                      {pos.apy}%
                    </span>
                  </div>
                )}
                <div className="pos-metric">
                  <span className="pos-metric-label">Laufzeit</span>
                  <span className="pos-metric-value">{daysSince} Tage</span>
                </div>
                <div className="pos-metric">
                  <span className="pos-metric-label">Ertrag (est.)</span>
                  <span className="pos-metric-value positive mono">
                    +{formatCurrency(earnedEstimate, "USD")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .positions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--space-4);
        }
        .position-card {
          background: var(--bg-card); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: var(--space-5);
          display: flex; flex-direction: column; gap: var(--space-4);
          transition: border-color var(--transition-base), transform var(--transition-base);
        }
        .position-card:hover {
          border-color: var(--border-strong); transform: translateY(-2px);
        }
        .position-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .position-protocol { font-weight: 700; font-size: var(--text-base); color: var(--text-primary); }
        .position-asset { font-size: var(--text-sm); color: var(--text-secondary); margin-top: 2px; font-family: var(--font-mono); }
        .defi-type-badge {
          border: 1px solid; border-radius: var(--radius-full);
          padding: 3px 10px; font-size: var(--text-xs); font-weight: 600;
        }
        .position-metrics {
          display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
          padding: var(--space-4); background: var(--bg-surface); border-radius: var(--radius-md);
        }
        .pos-metric { display: flex; flex-direction: column; gap: 2px; }
        .pos-metric-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
        .pos-metric-value { font-size: var(--text-sm); font-weight: 600; color: var(--text-primary); }
      `}</style>
    </div>
  );
}
