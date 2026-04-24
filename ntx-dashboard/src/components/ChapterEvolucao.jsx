import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { CITY_COLORS, MONTH_NAMES } from "./constants";

const fmtUsd = (v) =>
  v != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v) : "—";
const fmtK = (v) => v != null ? `$${(v / 1000).toFixed(0)}k` : "—";
const fmtPct = (v) => (v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—");

const TIME_RANGES = [
  { id: "all", label: "All" },
  { id: "15y", label: "15Y" },
  { id: "10y", label: "10Y" },
  { id: "5y",  label: "5Y" },
  { id: "2y",  label: "2Y" },
];

const CHART_TYPES = [
  { id: "values",     label: "Values" },
  { id: "yoy",        label: "YoY %" },
  { id: "seasonality",label: "Seasonality" },
];

function getStartDate(range) {
  const map = { "2y": 2, "5y": 5, "10y": 10, "15y": 15 };
  if (!map[range]) return null;
  const d = new Date("2026-01-01");
  d.setFullYear(d.getFullYear() - map[range]);
  return d.toISOString().slice(0, 7);
}

function ValueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300 w-24 truncate">{p.dataKey.replace(/_index$|_yoy$/, "")}</span>
          <span className="text-white font-semibold">
            {p.dataKey.endsWith("_yoy")
              ? `${p.value > 0 ? "+" : ""}${p.value?.toFixed(1)}%`
              : p.dataKey.endsWith("_index")
              ? p.value?.toFixed(1)
              : fmtUsd(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function SeasonalityChart({ seasonality, cities }) {
  if (!seasonality) return null;
  const data = MONTH_NAMES.map((m, i) => {
    const row = { month: m };
    cities.forEach((city) => {
      const val = seasonality[city]?.[i + 1];
      if (val != null) row[city] = val;
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#334155" }} />
        <YAxis
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
          tick={{ fill: "#64748b", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip
          formatter={(v, name) => [`${v > 0 ? "+" : ""}${v.toFixed(2)}%`, name]}
          contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
          labelStyle={{ color: "#fff", fontWeight: 600 }}
        />
        <Legend
          wrapperStyle={{ paddingTop: "12px" }}
          formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>}
        />
        <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
        {cities.map((city) => (
          <Line key={city} type="monotone" dataKey={city} stroke={CITY_COLORS[city]} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function ChapterEvolucao({ combinedTimeline, seasonality, selectedCities, summary }) {
  const [chartType, setChartType] = useState("values");
  const [timeRange, setTimeRange] = useState("all");

  const filtered = useMemo(() => {
    const start = getStartDate(timeRange);
    return combinedTimeline.filter((r) => !start || r.date >= start);
  }, [combinedTimeline, timeRange]);

  const sampled = useMemo(() => filtered.filter((_, i) => i % 2 === 0), [filtered]);

  // One tick per year, spaced by timeRange to avoid crowding
  const yearTicks = useMemo(() => {
    const seen = new Set();
    const all = sampled
      .filter(r => { const y = r.date.slice(0, 4); if (seen.has(y)) return false; seen.add(y); return true; })
      .map(r => r.date);
    const step = timeRange === "all" ? 4 : timeRange === "15y" ? 3 : timeRange === "10y" ? 2 : 1;
    return all.filter((_, i) => i % step === 0);
  }, [sampled, timeRange]);


  // Insight
  let insight = "";
  if (selectedCities.length > 0 && summary?.length > 0) {
    const sel = summary.filter((s) => selectedCities.includes(s.city));
    const best10 = [...sel].sort((a, b) => (b.cagr_10y ?? 0) - (a.cagr_10y ?? 0))[0];
    const bestYoY = [...sel].sort((a, b) => (b.yoy_change_pct ?? 0) - (a.yoy_change_pct ?? 0))[0];
    if (best10)
      insight = `${best10.city} leads 10-year growth with ${best10.cagr_10y?.toFixed(1)}% CAGR · Best current YoY: ${bestYoY?.city} ${fmtPct(bestYoY?.yoy_change_pct)}`;
  }

  const showTimeRange = chartType !== "seasonality";

  return (
    <div className="space-y-4">
      {/* Insight + controls */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-4">
        {insight && <p className="text-white font-bold text-sm mb-3">{insight}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Chart type */}
          <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1">
            {CHART_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setChartType(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  chartType === t.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Time range */}
          {showTimeRange && (
            <div className="flex gap-1">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    timeRange === r.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart panel */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-3">
          {chartType === "values" && (
            <>
              <h3 className="text-white font-bold text-lg">Median Home Value</h3>
              <p className="text-slate-400 text-sm">ZHVI median by city</p>
            </>
          )}
          {chartType === "yoy" && (
            <>
              <h3 className="text-white font-bold text-lg">Annual Growth (YoY)</h3>
              <p className="text-slate-400 text-sm">Year-over-year % change — positive = appreciation, negative = correction</p>
            </>
          )}
          {chartType === "seasonality" && (
            <>
              <h3 className="text-white font-bold text-lg">Seasonality</h3>
              <p className="text-slate-400 text-sm">Average monthly price change — reveals the best month to buy or sell</p>
            </>
          )}
        </div>

        <div style={{ height: "calc(100vh - 260px)", minHeight: 280 }}>
        {chartType === "seasonality" ? (
          <SeasonalityChart seasonality={seasonality} cities={selectedCities} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sampled}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                ticks={yearTicks}
                tickFormatter={(d) => d.slice(0, 4)}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "#334155" }}
              />
              <YAxis
                tickFormatter={chartType === "yoy" ? (v) => `${v.toFixed(0)}%` : fmtK}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={chartType === "values" ? 55 : 45}
              />
              <Tooltip content={<ValueTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "12px" }}
                formatter={(v) => (
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>
                    {v.replace(/_yoy$/, "")}
                  </span>
                )}
              />
              {chartType === "yoy" && <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />}
              <ReferenceLine x="2008-09" stroke="#475569" strokeDasharray="4 4" label={{ value: "GFC", fill: "#64748b", fontSize: 10 }} />
              <ReferenceLine x="2020-03" stroke="#475569" strokeDasharray="4 4" label={{ value: "COVID", fill: "#64748b", fontSize: 10 }} />
              <ReferenceLine x="2022-03" stroke="#475569" strokeDasharray="4 4" label={{ value: "Rate hike", fill: "#64748b", fontSize: 10 }} />
              {selectedCities.map((city) => {
                const key = chartType === "yoy" ? `${city}_yoy` : city;
                return (
                  <Line
                    key={city}
                    type="monotone"
                    dataKey={key}
                    stroke={CITY_COLORS[city]}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
        </div>
      </div>
    </div>
  );
}
