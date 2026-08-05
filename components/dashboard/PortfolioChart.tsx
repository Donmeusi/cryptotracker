"use client";

import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/mock/data";

interface HistoryPoint {
  date: string;
  value: number;
  portfolioReturn?: number;
  btcReturn?: number;
}

interface PortfolioChartProps {
  data: HistoryPoint[];
  currency: string;
  compareBtc?: boolean;
}

function CustomTooltip({ active, payload, label, currency, compareBtc }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color?: string; name?: string }>;
  label?: string;
  currency: string;
  compareBtc?: boolean;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{label}</div>
      {compareBtc ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {payload.map((entry) => (
            <div key={entry.dataKey} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: "0.82rem" }}>
              <span style={{ color: entry.dataKey === "portfolioReturn" ? "var(--green)" : "#f59e0b", fontWeight: 600 }}>
                {entry.dataKey === "portfolioReturn" ? "Portfolio" : "BTC Benchmark"}
              </span>
              <span className="mono" style={{ color: entry.value >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
                {entry.value >= 0 ? "+" : ""}{entry.value.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="chart-tooltip-value">
          {formatCurrency(payload[0].value, currency)}
        </div>
      )}
      <style>{`
        .chart-tooltip {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          box-shadow: var(--shadow-md);
        }
        .chart-tooltip-date {
          font-size: var(--text-xs);
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .chart-tooltip-value {
          font-family: var(--font-mono);
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--green);
        }
      `}</style>
    </div>
  );
}

export default function PortfolioChart({ data, currency, compareBtc = false }: PortfolioChartProps) {
  if (compareBtc) {
    const allVals = data.flatMap((d) => [d.portfolioReturn ?? 0, d.btcReturn ?? 0]);
    const minVal = Math.min(...allVals) - 2;
    const maxVal = Math.max(...allVals) + 2;

    return (
      <div style={{ marginTop: "var(--space-4)", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.04)"
              vertical={false}
              strokeDasharray="0"
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "#4a5270", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(data.length / 5))}
            />
            <YAxis
              domain={[minVal, maxVal]}
              tick={{ fill: "#4a5270", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}%`}
              width={45}
            />
            <Tooltip content={<CustomTooltip currency={currency} compareBtc={true} />} />
            <Area
              type="monotone"
              dataKey="portfolioReturn"
              name="Portfolio"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#greenGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#22c55e", stroke: "#080a0f", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="btcReturn"
              name="BTC"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4, fill: "#f59e0b", stroke: "#080a0f", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const minVal = Math.min(...data.map((d) => d.value)) * 0.97;
  const maxVal = Math.max(...data.map((d) => d.value)) * 1.02;

  return (
    <div style={{ marginTop: "var(--space-4)", height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
            strokeDasharray="0"
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#4a5270", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={Math.max(0, Math.floor(data.length / 5))}
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fill: "#4a5270", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            width={50}
          />
          <Tooltip content={<CustomTooltip currency={currency} compareBtc={false} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#greenGradient)"
            dot={false}
            activeDot={{ r: 4, fill: "#22c55e", stroke: "#080a0f", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
