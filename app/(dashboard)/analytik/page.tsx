"use client";

import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { generatePortfolioHistory, MOCK_ASSETS, formatCurrency, formatPercent } from "@/lib/mock/data";

const TIME_RANGES = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1J", days: 365 },
];

// Monthly P&L-Daten (Mock)
const MONTHLY_PNL = [
  { month: "Okt", pnl: -820 },
  { month: "Nov", pnl: 1240 },
  { month: "Dez", pnl: 3100 },
  { month: "Jan", pnl: -450 },
  { month: "Feb", pnl: 2340 },
  { month: "Mär", pnl: 1890 },
  { month: "Apr", pnl: 980 },
];

export default function AnalytikPage() {
  const [range, setRange] = useState(30);
  const data = generatePortfolioHistory(range);

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytik</h1>
        <p className="page-subtitle">Performance-Analyse und detaillierte Statistiken</p>
      </div>

      {/* Zeitraum-Filter */}
      <div className="tab-list" style={{ marginBottom: "var(--space-6)" }}>
        {TIME_RANGES.map((r) => (
          <button
            key={r.label}
            className={`tab-btn ${range === r.days ? "active" : ""}`}
            onClick={() => setRange(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Performance Chart */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <h2 className="card-title">Portfolio-Performance</h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>Gesamtwert über die Zeit</p>
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#4a5270", fontSize: 11 }} tickLine={false} axisLine={false} interval={Math.floor(data.length / 6)} />
              <YAxis tick={{ fill: "#4a5270", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} width={50} />
              <Tooltip formatter={(v: number) => [formatCurrency(v, "EUR"), "Wert"]} />
              <Area type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} fill="url(#g1)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monatlicher G&V */}
      <div className="grid-2" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Monatlicher G&V</h2>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MONTHLY_PNL} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#4a5270", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#4a5270", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `€${v}`} width={60} />
                <Tooltip formatter={(v: number) => [formatCurrency(v, "EUR"), "G&V"]} />
                <Bar dataKey="pnl" fill="#22c55e" radius={[4, 4, 0, 0]}
                  label={false}
                  // Color negative bars red
                >
                  {MONTHLY_PNL.map((entry, i) => (
                    <rect key={i} fill={entry.pnl >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performer */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: "var(--space-4)" }}>Top Performer</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {MOCK_ASSETS.slice(0, 5).map((asset, i) => (
              <div key={asset.symbol} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)", fontFamily: "var(--font-mono)", width: 16 }}>
                    #{i + 1}
                  </span>
                  <div className="asset-icon asset-icon-sm">{asset.symbol.charAt(0)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>{asset.symbol}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{asset.name}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono" style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                    {formatCurrency(asset.price, "EUR")}
                  </div>
                  <div className={asset.priceChange24h >= 0 ? "positive" : "negative"} style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>
                    {formatPercent(asset.priceChange24h)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .card-title { font-size: var(--text-base); font-weight: 600; color: var(--text-primary); }
      `}</style>
    </div>
  );
}
