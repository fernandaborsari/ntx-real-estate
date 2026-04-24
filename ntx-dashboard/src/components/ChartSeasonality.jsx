import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { CITY_COLORS, MONTH_NAMES } from "./constants";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-2">{MONTH_NAMES[label - 1]}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300 w-20">{p.name}:</span>
          <span className={`font-semibold ${p.value < 0 ? "text-red-400" : "text-emerald-400"}`}>
            {p.value > 0 ? "+" : ""}{p.value?.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChartSeasonality({ seasonality, cities }) {
  // Build combined monthly data
  const combined = Array.from({ length: 12 }, (_, i) => {
    const row = { month: i + 1 };
    cities.forEach((city) => {
      const found = seasonality[city]?.find((d) => d.month === i + 1);
      if (found) row[city] = parseFloat(found.avg_mom.toFixed(3));
    });
    return row;
  });

  // Best month per city
  const bestMonths = cities.map((city) => {
    const data = seasonality[city] || [];
    const best = data.reduce((a, b) => (a.avg_mom > b.avg_mom ? a : b), data[0]);
    const worst = data.reduce((a, b) => (a.avg_mom < b.avg_mom ? a : b), data[0]);
    return { city, best, worst };
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-white font-bold text-xl">Market Seasonality</h2>
          <p className="text-slate-400 text-sm mt-1">
            Average month-over-month price change by month — identifies best & worst seasons to buy/sell
          </p>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={combined} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="month"
              tickFormatter={(m) => MONTH_NAMES[m - 1]}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              tickFormatter={(v) => `${v.toFixed(1)}%`}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "16px" }}
              formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 13 }}>{value}</span>}
            />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
            {cities.map((city) => (
              <Line
                key={city}
                type="monotone"
                dataKey={city}
                stroke={CITY_COLORS[city]}
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Best/Worst months table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Best & Worst Months to Trade</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {bestMonths.map(({ city, best, worst }) => (
            <div key={city} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CITY_COLORS[city] }} />
                <span className="text-slate-300 text-xs font-semibold">{city}</span>
              </div>
              <div className="bg-emerald-900/30 border border-emerald-800/40 rounded-lg p-2">
                <p className="text-emerald-400 text-xs font-medium">Best</p>
                <p className="text-white text-sm font-bold">{MONTH_NAMES[(best?.month ?? 1) - 1]}</p>
                <p className="text-emerald-400 text-xs">+{best?.avg_mom?.toFixed(2)}%</p>
              </div>
              <div className="bg-red-900/30 border border-red-800/40 rounded-lg p-2">
                <p className="text-red-400 text-xs font-medium">Worst</p>
                <p className="text-white text-sm font-bold">{MONTH_NAMES[(worst?.month ?? 1) - 1]}</p>
                <p className="text-red-400 text-xs">{worst?.avg_mom?.toFixed(2)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
