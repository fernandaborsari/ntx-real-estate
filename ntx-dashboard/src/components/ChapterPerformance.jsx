import { useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Label,
  BarChart, Bar, Cell, LabelList,
} from "recharts";
import { CITY_COLORS } from "./constants";

const CAGR_PERIODS = [
  { id: "5y",  label: "5Y",  field: "cagr_5y"  },
  { id: "10y", label: "10Y", field: "cagr_10y" },
];

const fmtUsd = (v) =>
  v != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v) : "—";

function ScatterDot({ cx, cy, payload }) {
  const color = CITY_COLORS[payload.city] || "#6366f1";
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={5} fill={color} />
    </g>
  );
}

function ScatterTip({ active, payload, cagrLabel }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <p className="text-white font-bold mb-1">{d.city}</p>
      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between gap-4"><span className="text-slate-400">{cagrLabel} CAGR</span><span className="text-emerald-400 font-semibold">{d.y?.toFixed(2)}%</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-400">Volatility</span><span className="text-orange-400 font-semibold">{d.x?.toFixed(3)}%</span></div>
        <div className="flex justify-between gap-4"><span className="text-slate-400">Current value</span><span className="text-white font-semibold">{fmtUsd(d.home_value)}</span></div>
      </div>
    </div>
  );
}

export default function ChapterPerformance({ summary, selectedCities }) {
  const [cagrPeriod, setCagrPeriod] = useState(CAGR_PERIODS[1]); // default 10Y
  const cagrField = cagrPeriod.field;

  const scatter = summary
    .filter((s) => selectedCities.includes(s.city) && s[cagrField] != null && s.volatility_monthly != null)
    .map((s) => ({ ...s, x: s.volatility_monthly, y: s[cagrField] }));

  const cagrRanked = summary
    .filter((s) => selectedCities.includes(s.city) && s[cagrField] != null)
    .sort((a, b) => b[cagrField] - a[cagrField])
    .slice(0, 8);

  // Dynamic investment score: CAGR growth (50%) + dip opportunity/YoY (50%)
  // Mirrors the Python formula but uses the selected CAGR period
  const scoreBase = summary.filter(
    (s) => selectedCities.includes(s.city) && s[cagrField] != null && s.yoy_change_pct != null
  );
  const cagrVals = scoreBase.map((s) => s[cagrField]);
  const yoyVals  = scoreBase.map((s) => s.yoy_change_pct);
  const cagrMin  = Math.min(...cagrVals), cagrMax = Math.max(...cagrVals);
  const yoyMin   = Math.min(...yoyVals),  yoyMax  = Math.max(...yoyVals);
  const scoreRanked = scoreBase
    .map((s) => {
      const growthNorm = cagrMax > cagrMin ? (s[cagrField] - cagrMin) / (cagrMax - cagrMin) : 0.5;
      const dipNorm    = yoyMax  > yoyMin  ? (yoyMax - s.yoy_change_pct) / (yoyMax - yoyMin) : 0.5;
      return { ...s, dynScore: growthNorm * 0.5 + dipNorm * 0.5 };
    })
    .sort((a, b) => b.dynScore - a.dynScore)
    .slice(0, 8);

  const avgVol  = scatter.length ? scatter.reduce((a, d) => a + d.x, 0) / scatter.length : 0;
  const avgCagr = scatter.length ? scatter.reduce((a, d) => a + d.y, 0) / scatter.length : 0;

  // Best risk-adjusted
  const bestRiskAdj = scatter.length
    ? [...scatter].map((d) => ({ ...d, ratio: d.y / d.x })).sort((a, b) => b.ratio - a.ratio)[0]
    : null;

  const insight = bestRiskAdj
    ? `Best risk-adjusted return: ${bestRiskAdj.city} (${bestRiskAdj.y.toFixed(1)}% CAGR · ratio ${(bestRiskAdj.y / bestRiskAdj.x).toFixed(1)}) · ${cagrRanked[0]?.city} leads ${cagrPeriod.label} CAGR at ${cagrRanked[0]?.[cagrField].toFixed(1)}%`
    : "Select cities with historical data to view performance analysis";

  return (
    <div className="space-y-4">
      {/* Insight banner + CAGR period toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 bg-gradient-to-r from-emerald-900/40 via-slate-800/40 to-slate-800/20 border border-emerald-700/30 rounded-xl px-5 py-3.5">
          <p className="text-white font-bold text-sm">{insight}</p>
          <p className="text-slate-400 text-xs mt-0.5">{cagrPeriod.label} CAGR · Monthly volatility · Investment score (0–100)</p>
        </div>
        {/* Period selector */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-slate-600 text-[10px] uppercase tracking-wider">CAGR period</span>
          <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
            {CAGR_PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setCagrPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  cagrPeriod.id === p.id
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Scatter */}
        <div className="lg:col-span-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-white font-bold text-base mb-1">Risk vs. Return · {cagrPeriod.label} CAGR</h3>
          <p className="text-slate-400 text-xs mb-3">
            X = monthly volatility · Y = {cagrPeriod.label} CAGR ·
            <span className="text-emerald-400 ml-1">↖ ideal: high return, low risk</span>
          </p>

          {/* Quadrants */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[
              { label: "↖ High return, low risk",  color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800/40" },
              { label: "↗ High return, high risk", color: "text-yellow-400",  bg: "bg-yellow-900/20 border-yellow-800/40" },
              { label: "↙ Low return, low risk",   color: "text-blue-400",   bg: "bg-blue-900/20 border-blue-800/40" },
              { label: "↘ Low return, high risk",  color: "text-red-400",    bg: "bg-red-900/20 border-red-800/40" },
            ].map((q) => (
              <div key={q.label} className={`border rounded-lg px-2.5 py-1.5 text-[10px] ${q.bg}`}>
                <span className={`font-bold ${q.color}`}>{q.label.split(" ")[0]} </span>
                <span className="text-slate-400">{q.label.slice(2)}</span>
              </div>
            ))}
          </div>

          <div style={{ height: "calc(100vh - 300px)", minHeight: 260 }}>
          {scatter.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" dataKey="x" domain={["auto", "auto"]}
                  tickFormatter={(v) => `${v.toFixed(2)}%`}
                  tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#334155" }}>
                  <Label value="Monthly Volatility" position="insideBottom" offset={-10} fill="#64748b" fontSize={11} />
                </XAxis>
                <YAxis type="number" dataKey="y" domain={["auto", "auto"]}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                  tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={45}>
                  <Label value={`${cagrPeriod.label} CAGR`} angle={-90} position="insideLeft" offset={10} fill="#64748b" fontSize={11} />
                </YAxis>
                <Tooltip content={<ScatterTip cagrLabel={cagrPeriod.label} />} />
                <ReferenceLine x={avgVol}  stroke="#475569" strokeDasharray="4 4" />
                <ReferenceLine y={avgCagr} stroke="#475569" strokeDasharray="4 4" />
                <Scatter data={scatter} shape={<ScatterDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-slate-500 text-sm">Select cities with historical data</p>
            </div>
          )}
          </div>
          {/* Color legend */}
          {scatter.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {scatter.map((d) => (
                <div key={d.city} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[d.city] }} />
                  <span className="text-slate-400 text-[11px]">{d.city}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: CAGR + Score rankings */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* CAGR ranking */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex-1">
            <h3 className="text-white font-bold text-sm mb-3">
              CAGR {cagrPeriod.label}
              <span className="text-slate-500 font-normal ml-2 text-xs">annualized growth</span>
            </h3>
            <div className="space-y-2">
              {cagrRanked.map((s, i) => (
                <div key={s.city} className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs w-4 font-mono">#{i + 1}</span>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                  <span className="text-slate-300 text-xs flex-1 truncate">{s.city}</span>
                  <div className="flex-1 max-w-[80px] h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(s[cagrField] / (cagrRanked[0]?.[cagrField] || 1)) * 100}%`,
                        backgroundColor: CITY_COLORS[s.city] + "90",
                      }}
                    />
                  </div>
                  <span className="text-emerald-400 text-xs font-bold w-10 text-right">{s[cagrField].toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Investment Score */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex-1">
            <h3 className="text-white font-bold text-sm mb-1">Investment Score · {cagrPeriod.label}</h3>
            <p className="text-slate-500 text-[10px] mb-3">{cagrPeriod.label} CAGR growth (50%) + dip opportunity (50%)</p>
            <div className="space-y-2">
              {scoreRanked.map((s, i) => (
                <div key={s.city} className="flex items-center gap-2">
                  <span className="text-slate-600 text-xs w-4 font-mono">#{i + 1}</span>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                  <span className="text-slate-300 text-xs flex-1 truncate">{s.city}</span>
                  <div className="flex-1 max-w-[80px] h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${s.dynScore * 100}%`, backgroundColor: CITY_COLORS[s.city] + "90" }}
                    />
                  </div>
                  <span className="text-indigo-300 text-xs font-bold w-10 text-right">
                    {(s.dynScore * 100).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
