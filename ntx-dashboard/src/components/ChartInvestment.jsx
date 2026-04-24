import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { CITY_COLORS } from "./constants";

function fmt(v) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <p className="text-white font-bold mb-2">{d.city}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Median Value</span>
          <span className="text-white font-semibold">{fmt(d.home_value)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Price Index</span>
          <span className="text-white font-semibold">{d.price_index.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">YoY Change</span>
          <span className={d.yoy_change_pct < 0 ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>
            {d.yoy_change_pct > 0 ? "+" : ""}{d.yoy_change_pct?.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Investment Score</span>
          <span className="text-indigo-300 font-bold">{(d.investment_score * 100).toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

export default function ChartInvestment({ summary }) {
  const sorted = [...summary].sort((a, b) => b.investment_score - a.investment_score);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-white font-bold text-xl">Investment Opportunity Score</h2>
          <p className="text-slate-400 text-sm mt-1">
            Composite score (0–100) based on long-term appreciation (50%) + current dip opportunity (50%)
          </p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 80, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 1]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}`}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              type="category"
              dataKey="city"
              tick={{ fill: "#cbd5e1", fontSize: 13, fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
            <Bar dataKey="investment_score" radius={[0, 6, 6, 0]} maxBarSize={40}>
              {sorted.map((entry) => (
                <Cell key={entry.city} fill={CITY_COLORS[entry.city]} fillOpacity={0.85} />
              ))}
              <LabelList
                dataKey="investment_score"
                position="right"
                formatter={(v) => `${(v * 100).toFixed(1)}`}
                style={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">City Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left pb-3 font-medium">Rank</th>
                <th className="text-left pb-3 font-medium">City</th>
                <th className="text-right pb-3 font-medium">Median Value</th>
                <th className="text-right pb-3 font-medium">Price Index</th>
                <th className="text-right pb-3 font-medium">YoY %</th>
                <th className="text-right pb-3 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.city} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3 text-slate-500 font-mono">#{i + 1}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                      <span className="text-slate-200 font-medium">{s.city}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right text-white font-semibold">{fmt(s.home_value)}</td>
                  <td className="py-3 text-right text-slate-300">{s.price_index.toFixed(1)}</td>
                  <td className={`py-3 text-right font-semibold ${s.yoy_change_pct < 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {s.yoy_change_pct > 0 ? "+" : ""}{s.yoy_change_pct?.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right">
                    <span className="bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full text-xs font-bold">
                      {(s.investment_score * 100).toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
