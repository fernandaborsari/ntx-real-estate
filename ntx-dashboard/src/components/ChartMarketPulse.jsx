import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { CITY_COLORS } from "./constants";

const PHASE_CONFIG = {
  hot:          { label: "Hot",          color: "#ef4444", bg: "bg-red-900/30 border-red-700/50",        dot: "bg-red-400" },
  appreciating: { label: "Appreciating", color: "#10b981", bg: "bg-emerald-900/30 border-emerald-700/50", dot: "bg-emerald-400" },
  stable:       { label: "Stable",       color: "#6366f1", bg: "bg-indigo-900/30 border-indigo-700/50",   dot: "bg-indigo-400" },
  stagnant:     { label: "Stagnant",     color: "#94a3b8", bg: "bg-slate-700/30 border-slate-600/50",     dot: "bg-slate-400" },
  cooling:      { label: "Cooling",      color: "#f59e0b", bg: "bg-amber-900/30 border-amber-700/50",     dot: "bg-amber-400" },
  declining:    { label: "Declining",    color: "#f97316", bg: "bg-orange-900/30 border-orange-700/50",   dot: "bg-orange-400" },
  unknown:      { label: "Unknown",      color: "#64748b", bg: "bg-slate-800 border-slate-700",            dot: "bg-slate-500" },
};

const fmtPct = (v) => (v != null ? `${v > 0 ? "+" : ""}${v.toFixed(2)}%` : "—");
const fmtUsd = (v) => v != null
  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
  : "—";

function PhaseCard({ s }) {
  const phase = PHASE_CONFIG[s.market_phase] || PHASE_CONFIG.unknown;
  const momColor = s.rolling_3m > 0 ? "text-emerald-400" : s.rolling_3m < 0 ? "text-red-400" : "text-slate-400";
  const yoyColor = s.yoy_change_pct > 0 ? "text-emerald-400" : s.yoy_change_pct < 0 ? "text-red-400" : "text-slate-400";

  return (
    <div className={`border rounded-xl p-3 transition-all hover:scale-[1.01] ${phase.bg}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
          <span className="text-white font-semibold text-xs truncate">{s.city}</span>
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1"
          style={{ backgroundColor: phase.color + "30", color: phase.color }}
        >
          {phase.label}
        </span>
      </div>
      <p className="text-slate-500 text-[10px] mb-1.5">{s.county}</p>
      <p className="text-white font-bold text-sm leading-tight">{fmtUsd(s.home_value)}</p>

      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
        <div>
          <p className="text-slate-500">YoY</p>
          <p className={`font-semibold ${yoyColor}`}>{fmtPct(s.yoy_change_pct)}</p>
        </div>
        <div>
          <p className="text-slate-500">3m avg</p>
          <p className={`font-semibold ${momColor}`}>{fmtPct(s.rolling_3m)}</p>
        </div>
        <div>
          <p className="text-slate-500">From peak</p>
          <p className={`font-semibold ${s.from_peak_pct < 0 ? "text-red-400" : "text-emerald-400"}`}>
            {fmtPct(s.from_peak_pct)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Peak</p>
          <p className="text-slate-300 font-medium">{s.peak_date}</p>
        </div>
      </div>
    </div>
  );
}

function MomentumTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300 w-24 truncate">{p.dataKey.replace("_3m", "")}:</span>
          <span className={`font-semibold ${p.value > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {p.value != null ? `${p.value > 0 ? "+" : ""}${p.value.toFixed(2)}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChartMarketPulse({ summary, selectedCities, timeline }) {
  const filtered = summary.filter((s) => selectedCities.includes(s.city));

  // Phase breakdown counts
  const phaseCounts = {};
  filtered.forEach((s) => {
    const p = s.market_phase || "unknown";
    phaseCounts[p] = (phaseCounts[p] || 0) + 1;
  });

  // Build momentum timeline (3m rolling avg per city)
  const momentumData = timeline
    .filter((_, i) => i % 3 === 0)
    .map((row) => {
      const r = { date: row.date };
      selectedCities.forEach((city) => {
        if (row[`${city}_yoy`] != null) r[`${city}_3m`] = row[`${city}_yoy`];
      });
      return r;
    });

  // Sort cards: hot first, then appreciating, stable, stagnant, cooling, declining
  const phaseOrder = ["hot", "appreciating", "stable", "stagnant", "cooling", "declining", "unknown"];
  const sorted = [...filtered].sort(
    (a, b) => phaseOrder.indexOf(a.market_phase) - phaseOrder.indexOf(b.market_phase)
  );

  return (
    <div className="space-y-6">
      {/* Phase summary bar */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <h2 className="text-white font-bold text-xl mb-1">Market Pulse</h2>
        <p className="text-slate-400 text-sm mb-4">Current market phase based on 3-month momentum</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(phaseCounts).map(([phase, count]) => {
            const cfg = PHASE_CONFIG[phase] || PHASE_CONFIG.unknown;
            return (
              <div key={phase} className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 ${cfg.bg}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-slate-300 text-sm font-medium">{cfg.label}</span>
                <span className="text-white font-bold text-sm">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* City phase cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
        {sorted.map((s) => (
          <PhaseCard key={s.city} s={s} />
        ))}
      </div>

      {/* YoY trend chart */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h3 className="text-white font-bold text-lg">YoY Growth History</h3>
          <p className="text-slate-400 text-sm mt-1">Year-over-year price change per city — positive = growth, negative = correction</p>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={momentumData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(0, 4)}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              interval={23}
              axisLine={{ stroke: "#334155" }}
            />
            <YAxis
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={45}
            />
            <Tooltip content={<MomentumTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "12px" }}
              formatter={(v) => (
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{v.replace("_3m", "")}</span>
              )}
            />
            <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
            <ReferenceLine x="2008-09" stroke="#475569" strokeDasharray="4 4" label={{ value: "GFC", fill: "#64748b", fontSize: 10 }} />
            <ReferenceLine x="2020-03" stroke="#475569" strokeDasharray="4 4" label={{ value: "COVID", fill: "#64748b", fontSize: 10 }} />
            <ReferenceLine x="2022-03" stroke="#475569" strokeDasharray="4 4" label={{ value: "Rate hike", fill: "#64748b", fontSize: 10 }} />
            {selectedCities.map((city) => (
              <Line
                key={city}
                type="monotone"
                dataKey={`${city}_3m`}
                stroke={CITY_COLORS[city]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-4">City Metrics Snapshot</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700 text-xs">
                <th className="text-left pb-3 font-medium">City</th>
                <th className="text-left pb-3 font-medium">County</th>
                <th className="text-right pb-3 font-medium">Value</th>
                <th className="text-right pb-3 font-medium">YoY</th>
                <th className="text-right pb-3 font-medium">MoM</th>
                <th className="text-right pb-3 font-medium">3m avg</th>
                <th className="text-right pb-3 font-medium">Peak</th>
                <th className="text-right pb-3 font-medium">From ATH</th>
                <th className="text-center pb-3 font-medium">Phase</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => {
                const phase = PHASE_CONFIG[s.market_phase] || PHASE_CONFIG.unknown;
                return (
                  <tr key={s.city} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                        <span className="text-slate-200 font-medium">{s.city}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-400 text-xs">{s.county}</td>
                    <td className="py-3 text-right text-white font-semibold">{fmtUsd(s.home_value)}</td>
                    <td className={`py-3 text-right font-semibold ${s.yoy_change_pct > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtPct(s.yoy_change_pct)}
                    </td>
                    <td className={`py-3 text-right ${s.mom_change_pct > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtPct(s.mom_change_pct)}
                    </td>
                    <td className={`py-3 text-right font-semibold ${s.rolling_3m > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtPct(s.rolling_3m)}
                    </td>
                    <td className="py-3 text-right text-slate-300">{fmtUsd(s.peak_value)}</td>
                    <td className={`py-3 text-right font-semibold ${s.from_peak_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmtPct(s.from_peak_pct)}
                    </td>
                    <td className="py-3 text-center">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: phase.color + "25", color: phase.color }}
                      >
                        {phase.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
