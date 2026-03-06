"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const EMERALD_500 = "#10b981";

/** Synthetic series for portfolio value (no historical data yet). Last point = totalValue. */
function buildSeries(totalValue: number): { day: string; value: number }[] {
  const points = 7;
  const min = Math.max(0, totalValue * 0.5);
  const step = (totalValue - min) / (points - 1);
  return Array.from({ length: points }, (_, i) => ({
    day: i === points - 1 ? "Now" : `D${i + 1}`,
    value: i === points - 1 ? totalValue : min + step * i,
  }));
}

export function PortfolioChart({
  totalValue,
  realizedPnL: _realizedPnL,
  unrealizedPnL: _unrealizedPnL,
}: {
  totalValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
}) {
  const chartData = buildSeries(totalValue);
  const maxVal = Math.max(totalValue, 1);

  return (
    <div className="h-[200px] w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient id="portfolioAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EMERALD_500} stopOpacity={0.4} />
              <stop offset="100%" stopColor={EMERALD_500} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, maxVal * 1.05]}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.75rem",
            }}
            labelStyle={{ color: "#94a3b8" }}
            formatter={(value: number) => [value.toFixed(2), "Value"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={EMERALD_500}
            strokeWidth={2}
            fill="url(#portfolioAreaGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
