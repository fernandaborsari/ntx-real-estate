import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Label,
} from "recharts";
import { CITY_COLORS } from "./constants";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CITY_COLORS[d.city] }} />
        <p className="text-white font-bold">{d.city}</p>
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">10Y CAGR</span>
          <span className="text-emerald-400 font-semibold">{d.y?.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Monthly Volatility</span>
          <span className="text-orange-400 font-semibold">{d.x?.toFixed(3)}%</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Current Value</span>
          <span className="text-white font-semibold">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(d.home_value)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CustomDot(props) {
  const { cx, cy, payload } = props;
  const color = CITY_COLORS[payload.city] || "#6366f1";
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={4} fill={color} />
      <text x={cx} y={cy - 14} textAnchor="middle" fill={color} fontSize={11} fontWeight={600}>
        {payload.city}
      </text>
    </g>
  );
}

export default function ChartRiskReturn({ summary, selectedCities }) {
  const data = summary
    .filter((s) => selectedCities.includes(s.city) && s.cagr_10y != null && s.volatility_monthly != null)
    .map((s) => ({ ...s, x: s.volatility_monthly, y: s.cagr_10y }));

  if (!data.length) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 flex items-center justify-center h-64">
        <p className="text-slate-500">Select at least one city with 10Y data</p>
      </div>
    );
  }

  const avgVol  = data.reduce((a, d) => a + d.x, 0) / data.length;
  const avgCagr = data.reduce((a, d) => a + d.y, 0) / data.length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-white font-bold text-xl">Risk vs. Return</h2>
          <p className="text-slate-400 text-sm mt-1">
            X = monthly price volatility (std dev) · Y = 10Y CAGR ·
            <span className="text-emerald-400 ml-1">Top-left = best risk-adjusted return</span>
          </p>
        </div>

        {/* Quadrant legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
          {[
            { label: "High return, Low risk", color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/40", pos: "↖" },
            { label: "High return, High risk", color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800/40", pos: "↗" },
            { label: "Low return, Low risk", color: "text-blue-400",   bg: "bg-blue-900/20 border-blue-800/40",     pos: "↙" },
            { label: "Low return, High risk", color: "text-red-400",   bg: "bg-red-900/20 border-red-800/40",       pos: "↘" },
          ].map((q) => (
            <div key={q.label} className={`border rounded-lg px-3 py-2 ${q.bg}`}>
              <span className={`font-bold ${q.color}`}>{q.pos} </span>
              <span className="text-slate-400">{q.label}</span>
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={420}>
          <ScatterChart margin={{ top: 30, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              type="number"
              dataKey="x"
              name="Volatility"
              domain={["auto", "auto"]}
              tickFormatter={(v) => `${v.toFixed(2)}%`}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
            >
              <Label value="Monthly Volatility (std dev)" position="insideBottom" offset={-10} fill="#64748b" fontSize={12} />
            </XAxis>
            <YAxis
              type="number"
              dataKey="y"
              name="CAGR"
              domain={["auto", "auto"]}
              tickFormatter={(v) => `${v.toFixed(1)}%`}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={50}
            >
              <Label value="10Y CAGR" angle={-90} position="insideLeft" offset={10} fill="#64748b" fontSize={12} />
            </YAxis>
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={avgVol}  stroke="#475569" strokeDasharray="4 4" label={{ value: "avg vol", fill: "#64748b", fontSize: 10, position: "top" }} />
            <ReferenceLine y={avgCagr} stroke="#475569" strokeDasharray="4 4" label={{ value: "avg return", fill: "#64748b", fontSize: 10, position: "right" }} />
            <Scatter data={data} shape={<CustomDot />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Ranking table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1">Risk-Adjusted Ranking</h3>
        <p className="text-slate-500 text-xs mb-4">Sorted by return/risk ratio (higher = better)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left pb-3 font-medium">City</th>
                <th className="text-right pb-3 font-medium">10Y CAGR</th>
                <th className="text-right pb-3 font-medium">Volatility</th>
                <th className="text-right pb-3 font-medium">Return/Risk</th>
              </tr>
            </thead>
            <tbody>
              {[...data]
                .map((d) => ({ ...d, ratio: d.y / d.x }))
                .sort((a, b) => b.ratio - a.ratio)
                .map((s) => (
                  <tr key={s.city} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                        <span className="text-slate-200 font-medium">{s.city}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-semibold">{s.y.toFixed(2)}%</td>
                    <td className="py-3 text-right text-orange-400 font-semibold">{s.x.toFixed(3)}%</td>
                    <td className="py-3 text-right">
                      <span className="bg-indigo-900/50 text-indigo-300 px-2 py-0.5 rounded-full text-xs font-bold">
                        {s.ratio.toFixed(2)}
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
