import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { CITY_COLORS } from "./constants";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-white font-bold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6 text-sm">
          <span className="text-slate-400">{p.name}</span>
          <span className="text-white font-semibold">{p.value != null ? `${p.value.toFixed(2)}%` : "—"}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChartCAGR({ summary, selectedCities }) {
  const data = summary
    .filter((s) => selectedCities.includes(s.city))
    .sort((a, b) => (b.cagr_10y ?? 0) - (a.cagr_10y ?? 0));

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-white font-bold text-xl">CAGR — Compound Annual Growth Rate</h2>
          <p className="text-slate-400 text-sm mt-1">
            Annualized return over 5, 10 and 20 years — more reliable than YoY for comparing long-term appreciation
          </p>
        </div>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="city"
              tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.05)" }} />
            <Legend
              wrapperStyle={{ paddingTop: "8px" }}
              formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 13 }}>{v}</span>}
            />
            <Bar dataKey="cagr_20y" name="20Y CAGR" radius={[3, 3, 0, 0]} maxBarSize={18} fill="#334155" />
            <Bar dataKey="cagr_10y" name="10Y CAGR" radius={[3, 3, 0, 0]} maxBarSize={18}>
              {data.map((entry) => (
                <Cell key={entry.city} fill={CITY_COLORS[entry.city]} fillOpacity={0.85} />
              ))}
            </Bar>
            <Bar dataKey="cagr_5y"  name="5Y CAGR"  radius={[3, 3, 0, 0]} maxBarSize={18} fill="#6366f144" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* CAGR table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">CAGR Summary Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left pb-3 font-medium">City</th>
                <th className="text-right pb-3 font-medium">5Y CAGR</th>
                <th className="text-right pb-3 font-medium">10Y CAGR</th>
                <th className="text-right pb-3 font-medium">20Y CAGR</th>
                <th className="text-right pb-3 font-medium">Current Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.city} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                      <span className="text-slate-200 font-medium">{s.city}</span>
                    </div>
                  </td>
                  {["cagr_5y", "cagr_10y", "cagr_20y"].map((k) => (
                    <td key={k} className="py-3 text-right">
                      {s[k] != null ? (
                        <span className={`font-semibold ${s[k] >= 5 ? "text-emerald-400" : "text-slate-300"}`}>
                          {s[k].toFixed(2)}%
                        </span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                  ))}
                  <td className="py-3 text-right text-white font-semibold">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(s.home_value)}
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
