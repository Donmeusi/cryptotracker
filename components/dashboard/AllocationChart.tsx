"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/mock/data";

const COLORS = [
  "#22c55e", "#f59e0b", "#3b82f6", "#14b8a6",
  "#8b5cf6", "#ec4899", "#f97316", "#06b6d4",
];

interface AllocationChartProps {
  data: Array<{ name: string; value: number; amount: number }>;
  currency: string;
}

function CustomTooltip({ active, payload, currency }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { amount: number } }>;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-name">{d.name}</div>
      <div className="chart-tooltip-value">{d.value}%</div>
      <div className="chart-tooltip-sub">{formatCurrency(d.payload.amount, currency)}</div>
      <style>{`
        .chart-tooltip {
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
          box-shadow: var(--shadow-md);
        }
        .chart-tooltip-name {
          font-size: var(--text-xs); color: var(--text-muted); margin-bottom: 2px;
        }
        .chart-tooltip-value {
          font-family: var(--font-mono); font-size: var(--text-xl);
          font-weight: 700; color: var(--text-primary);
        }
        .chart-tooltip-sub {
          font-family: var(--font-mono); font-size: var(--text-xs);
          color: var(--text-secondary); margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

export default function AllocationChart({ data, currency }: AllocationChartProps) {
  return (
    <div style={{ marginTop: "var(--space-4)", height: 220, display: "flex", gap: "var(--space-4)" }}>
      <ResponsiveContainer width="55%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip currency={currency} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "var(--space-2)",
      }}>
        {data.slice(0, 6).map((item, i) => (
          <div key={item.name} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <div style={{
                width: 8, height: 8,
                borderRadius: "50%",
                background: COLORS[i % COLORS.length],
                flexShrink: 0,
              }} />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}>
                {item.name}
              </span>
            </div>
            <span style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
            }}>
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
