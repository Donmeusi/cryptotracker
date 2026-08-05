"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/mock/data";

const ASSET_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#14f195",
  ADA: "#2563eb",
  LINK: "#375bd2",
  UNI: "#ff007a",
  DOT: "#e6007a",
  AVAX: "#e84142",
  DOGE: "#c2a633",
  MATIC: "#8247e5",
  ATOM: "#2e3148",
};

const FALLBACK_COLORS = [
  "#22c55e", "#f59e0b", "#3b82f6", "#14b8a6",
  "#10b981", "#ec4899", "#f97316", "#06b6d4",
];

function getAssetColor(symbol: string, index: number): string {
  return ASSET_COLORS[symbol] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

interface AllocationChartProps {
  data: Array<{ name: string; value: number; amount: number }>;
  currency: string;
}

function CustomTooltip({ active, payload, currency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { amount: number }; color?: string }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const color = d.color || getAssetColor(d.name, 0);

  return (
    <div className="allocation-tooltip">
      <div className="allocation-tooltip-header">
        <div className="allocation-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <span className="allocation-name">{d.name}</span>
      </div>
      <div className="allocation-val">{d.value}%</div>
      <div className="allocation-sub">{formatCurrency(d.payload.amount, currency)}</div>
      <style>{`
        .allocation-tooltip {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
        }
        .allocation-tooltip-header {
          display: flex; align-items: center; gap: 6px; margin-bottom: 4px;
        }
        .allocation-dot {
          width: 8px; height: 8px; border-radius: 50%;
        }
        .allocation-name {
          font-size: var(--text-xs); color: var(--text-secondary); font-weight: 600;
        }
        .allocation-val {
          font-family: var(--font-mono); font-size: var(--text-lg);
          font-weight: 700; color: var(--text-primary); line-height: 1.2;
        }
        .allocation-sub {
          font-family: var(--font-mono); font-size: var(--text-xs);
          color: var(--text-muted); margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

export default function AllocationChart({ data, currency }: AllocationChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalValue = data.reduce((sum, item) => sum + item.amount, 0);
  const topAsset = data[0];

  return (
    <div className="allocation-container">
      {/* Chart Section */}
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={95}
              dataKey="value"
              strokeWidth={2}
              stroke="var(--bg-card)"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => {
                const isHovered = activeIndex === index;
                const baseColor = getAssetColor(entry.name, index);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={baseColor}
                    opacity={activeIndex === null || isHovered ? 1 : 0.45}
                    style={{
                      transform: isHovered ? "scale(1.04)" : "scale(1)",
                      transformOrigin: "center center",
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Donut Center Badge */}
        <div className="donut-center-badge">
          <div className="donut-center-label">
            {activeIndex !== null && data[activeIndex] ? data[activeIndex].name : "Dominanz"}
          </div>
          <div className="donut-center-val">
            {activeIndex !== null && data[activeIndex]
              ? `${data[activeIndex].value}%`
              : topAsset ? `${topAsset.name} ${topAsset.value}%` : "0%"}
          </div>
          <div className="donut-center-sub">
            {activeIndex !== null && data[activeIndex]
              ? formatCurrency(data[activeIndex].amount, currency)
              : formatCurrency(totalValue, currency)}
          </div>
        </div>
      </div>

      {/* Legend & Proportion Bars Section */}
      <div className="legend-container">
        {data.slice(0, 6).map((item, i) => {
          const color = getAssetColor(item.name, i);
          const isHovered = activeIndex === i;

          return (
            <div
              key={item.name}
              className={`legend-item ${isHovered ? "active" : ""}`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="legend-header">
                <div className="legend-title">
                  <div className="legend-color-pill" style={{ background: color, boxShadow: `0 0 6px ${color}66` }} />
                  <span className="legend-symbol">{item.name}</span>
                </div>
                <div className="legend-meta">
                  <span className="legend-amount">{formatCurrency(item.amount, currency)}</span>
                  <span className="legend-pct">{item.value}%</span>
                </div>
              </div>
              <div className="legend-bar-bg">
                <div
                  className="legend-bar-fill"
                  style={{
                    width: `${item.value}%`,
                    background: color,
                    boxShadow: isHovered ? `0 0 10px ${color}` : "none",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .allocation-container {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-top: 12px;
          padding: 8px 0;
        }
        .chart-wrapper {
          position: relative;
          width: 220px;
          height: 220px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .donut-center-badge {
          position: absolute;
          inset: 0;
          margin: auto;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          text-align: center;
        }
        .donut-center-label {
          font-size: 0.68rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .donut-center-val {
          font-family: var(--font-mono);
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.1;
          margin: 2px 0;
        }
        .donut-center-sub {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          color: var(--text-secondary);
        }

        .legend-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 200px;
        }
        .legend-item {
          padding: 6px 10px;
          border-radius: var(--radius-md);
          background: var(--bg-surface);
          border: 1px solid var(--border);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .legend-item:hover,
        .legend-item.active {
          background: var(--bg-elevated);
          border-color: var(--border-strong);
          transform: translateX(3px);
        }
        .legend-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .legend-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .legend-color-pill {
          width: 10px;
          height: 10px;
          border-radius: 3px;
          flex-shrink: 0;
        }
        .legend-symbol {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .legend-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: var(--font-mono);
        }
        .legend-amount {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }
        .legend-pct {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
          min-width: 42px;
          text-align: right;
        }

        .legend-bar-bg {
          height: 4px;
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 99px;
          overflow: hidden;
        }
        .legend-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.4s ease, box-shadow 0.2s ease;
        }

        @media (max-width: 768px) {
          .allocation-container {
            flex-direction: column;
            align-items: center;
          }
          .legend-container {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
