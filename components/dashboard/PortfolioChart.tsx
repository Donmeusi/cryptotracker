"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/mock/data";

interface PortfolioChartProps {
  data: Array<{ date: string; value: number }>;
  currency: string;
}

function CustomTooltip({ active, payload, label, currency }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  currency: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-date">{label}</div>
      <div className="chart-tooltip-value">
        {formatCurrency(payload[0].value, currency)}
      </div>
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

export default function PortfolioChart({ data, currency }: PortfolioChartProps) {
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
            interval={Math.floor(data.length / 5)}
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fill: "#4a5270", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
            width={50}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
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
