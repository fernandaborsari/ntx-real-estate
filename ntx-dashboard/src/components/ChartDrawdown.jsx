import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { CITY_COLORS } from "./constants";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-white font-bold mb-2">{label}</p>
      {payload.map((p) => p.value != null && (
        <div key={p.name} className="flex items-center justify-between gap-6 text-sm">
          <span className="text-slate-400">{p.name}</span>
          <span className="text-red-400 font-semibold">{p.value.toFixed(2)}%</span>
        </div>
      ))}
    </div>
  );
}

export default function ChartDrawdown({ summary, selectedCities }) {
  const data = summary
    .filter((s) => selectedCities.includes(s.city))
    .sort((a, b) => (a.drawdown_gfc ?? 0) - (b.drawdown_gfc ?? 0));

  return (
    <div className="space-y-6">
      {/* Intro cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">2008 Global Financial Crisis</div>
          <p className="text-slate-400 text-sm">Peak-to-trough decline from Jun 2007 to Dec 2012. Measures how badly each city was hit by the housing crash and how deep the correction went.</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">2022–2024 Rate Correction</div>
          <p className="text-slate-400 text-sm">Decline from the post-COVID peak (Mar 2022) through Jun 2024. Shows vulnerability to rising interest rates and cooling demand.</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-white font-bold text-xl">Max Drawdown by Crisis</h2>
          <p className="text-slate-400 text-sm mt-1">
            A smaller (less negative) bar = more resilient city · Values near 0% = city barely fell
          </p>
        </div>
        <ResponsiveContainer width="100%" height={400}>
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
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(239,68,68,0.05)" }} />
            <Legend
              wrapperStyle={{ paddingTop: "8px" }}
              formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 13 }}>{v}</span>}
            />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
            <Bar dataKey="drawdown_gfc" name="GFC 2008" radius={[3, 3, 0, 0]} maxBarSize={24}>
              {data.map((entry) => (
                <Cell key={entry.city} fill={CITY_COLORS[entry.city]} fillOpacity={0.7} />
              ))}
            </Bar>
            <Bar dataKey="drawdown_2022" name="Rate Correction 2022" radius={[3, 3, 0, 0]} maxBarSize={24} fill="#ef444466" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Resilience table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1">Resilience Ranking</h3>
        <p className="text-slate-500 text-xs mb-4">Sorted by GFC drawdown (least decline = most resilient)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left pb-3 font-medium">City</th>
                <th className="text-right pb-3 font-medium">GFC Drawdown</th>
                <th className="text-right pb-3 font-medium">2022 Drawdown</th>
                <th className="text-right pb-3 font-medium">Max Drawdown (all time)</th>
              </tr>
            </thead>
            <tbody>
              {[...data].sort((a, b) => (b.drawdown_gfc ?? -99) - (a.drawdown_gfc ?? -99)).map((s) => (
                <tr key={s.city} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                      <span className="text-slate-200 font-medium">{s.city}</span>
                    </div>
                  </td>
                  {["drawdown_gfc", "drawdown_2022", "max_drawdown"].map((k) => (
                    <td key={k} className="py-3 text-right">
                      {s[k] != null ? (
                        <span className={`font-semibold ${
                          s[k] >= -5 ? "text-emerald-400" :
                          s[k] >= -10 ? "text-yellow-400" : "text-red-400"
                        }`}>
                          {s[k].toFixed(2)}%
                        </span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
