import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts";
import { CITY_COLORS } from "./constants";

const fmtK = (v) => {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v > 0 ? "+" : "-"}$${(abs / 1000).toFixed(0)}k`;
  return `${v > 0 ? "+" : ""}$${v.toFixed(0)}`;
};

const fmtUsd = (v) =>
  v != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
    : "—";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-white font-bold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6 text-sm">
          <span className="text-slate-400">{p.name}</span>
          <span className={`font-semibold ${p.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {fmtUsd(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomTooltipCAGR({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-white font-bold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6 text-sm">
          <span className="text-slate-400">{p.name}</span>
          <span className={`font-semibold ${p.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {p.value != null ? `${p.value > 0 ? "+" : ""}${p.value.toFixed(2)}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChartDollarReturn({ summary, selectedCities }) {
  const data = summary
    .filter((s) => selectedCities.includes(s.city))
    .map((s) => ({
      city: s.city,
      "1Y Gain": s.dollar_change_1y,
      "5Y Gain": s.dollar_change_5y,
      "10Y Gain": s.dollar_change_10y,
      cagr_5y: s.cagr_5y,
      cagr_10y: s.cagr_10y,
      cagr_20y: s.cagr_20y,
      home_value: s.home_value,
    }));

  return (
    <div className="space-y-6">
      {/* Dollar gain bars */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h2 className="text-white font-bold text-xl">Dollar Return</h2>
          <p className="text-slate-400 text-sm mt-1">Absolute dollar gain if you bought 1Y, 5Y, or 10Y ago</p>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="city"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tickFormatter={fmtK}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "40px" }} formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>} />
            <Bar dataKey="1Y Gain" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="5Y Gain" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="10Y Gain" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* CAGR comparison */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h3 className="text-white font-bold text-lg">Annualized Return (CAGR)</h3>
          <p className="text-slate-400 text-sm mt-1">Compound annual growth rate by city — higher = stronger long-term appreciation</p>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="city"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              angle={-30}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tickFormatter={(v) => `${v.toFixed(1)}%`}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={45}
            />
            <Tooltip content={<CustomTooltipCAGR />} />
            <Legend wrapperStyle={{ paddingTop: "40px" }} formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>} />
            <Bar dataKey="cagr_5y" name="CAGR 5Y" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="cagr_10y" name="CAGR 10Y" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar dataKey="cagr_20y" name="CAGR 20Y" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">Full Return Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700 text-xs">
                <th className="text-left pb-3 font-medium">City</th>
                <th className="text-right pb-3 font-medium">Current Value</th>
                <th className="text-right pb-3 font-medium">+1Y ($)</th>
                <th className="text-right pb-3 font-medium">+5Y ($)</th>
                <th className="text-right pb-3 font-medium">+10Y ($)</th>
                <th className="text-right pb-3 font-medium">CAGR 5Y</th>
                <th className="text-right pb-3 font-medium">CAGR 10Y</th>
                <th className="text-right pb-3 font-medium">CAGR 20Y</th>
              </tr>
            </thead>
            <tbody>
              {[...data].sort((a, b) => (b["10Y Gain"] || 0) - (a["10Y Gain"] || 0)).map((s) => (
                <tr key={s.city} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                      <span className="text-slate-200 font-medium">{s.city}</span>
                    </div>
                  </td>
                  <td className="py-3 text-right text-white font-semibold">{fmtUsd(s.home_value)}</td>
                  {["1Y Gain", "5Y Gain", "10Y Gain"].map((k) => (
                    <td key={k} className={`py-3 text-right font-semibold ${s[k] >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtUsd(s[k])}
                    </td>
                  ))}
                  {["cagr_5y", "cagr_10y", "cagr_20y"].map((k) => (
                    <td key={k} className={`py-3 text-right ${s[k] >= 0 ? "text-sky-400" : "text-red-400"}`}>
                      {s[k] != null ? `${s[k].toFixed(2)}%` : "—"}
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
