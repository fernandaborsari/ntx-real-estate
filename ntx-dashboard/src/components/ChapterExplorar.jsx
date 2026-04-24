import { useState, useMemo } from "react";
import ChartZipDrilldown from "./ChartZipDrilldown";
import ChartDrawdown from "./ChartDrawdown";
import { CITY_COLORS, PHASE_CONFIG } from "./constants";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Cell,
} from "recharts";

const fmtUsd = (v) =>
  v != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v) : "—";
const fmtK = (v) => (v != null ? `$${(v / 1000).toFixed(0)}k` : "—");
const fmtPct = (v) => (v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—");
const fmtPctRaw = (v, dec = 1) => v != null ? `${(v * 100).toFixed(dec)}%` : "—";

const TIME_RANGES = [
  { id: "all", label: "All" },
  { id: "15y", label: "15Y" },
  { id: "10y", label: "10Y" },
  { id: "5y",  label: "5Y" },
  { id: "2y",  label: "2Y" },
];

const COMPARE_CHARTS = [
  { id: "values",   label: "Values" },
  { id: "yoy",      label: "YoY %" },
  { id: "cagr",     label: "CAGR" },
  { id: "drawdown", label: "Drawdown" },
  { id: "returns",  label: "$ Returns" },
  { id: "market",   label: "🏘 Market" },
  { id: "table",    label: "📊 Data Table" },
];

function getStartDate(range) {
  const map = { "2y": 2, "5y": 5, "10y": 10, "15y": 15 };
  if (!map[range]) return null;
  const d = new Date("2026-01-01");
  d.setFullYear(d.getFullYear() - map[range]);
  return d.toISOString().slice(0, 7);
}

function LineTooltip({ active, payload, label, mode }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300 w-24 truncate">{p.dataKey.replace(/_index$|_yoy$/, "")}</span>
          <span className="text-white font-semibold">
            {mode === "yoy" || mode === "index"
              ? `${p.value > 0 ? "+" : ""}${p.value?.toFixed(1)}${mode === "yoy" ? "%" : ""}`
              : fmtUsd(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── $ Returns cards with 1Y / 5Y / 10Y toggle ── */
function ReturnsCards({ returnsData, summary }) {
  const [horizon, setHorizon] = useState("10y");

  const HORIZONS = [
    { id: "1y",  label: "1Y",  key: "dollar_change_1y",  cagrKey: "cagr_5y",  note: "2025 → 2026" },
    { id: "5y",  label: "5Y",  key: "dollar_change_5y",  cagrKey: "cagr_5y",  note: "2021 → 2026" },
    { id: "10y", label: "10Y", key: "dollar_change_10y", cagrKey: "cagr_10y", note: "2016 → 2026" },
  ];
  const h = HORIZONS.find((x) => x.id === horizon);

  const sorted = (returnsData || [])
    .filter((s) => s[h.key] != null)
    .sort((a, b) => b[h.key] - a[h.key]);

  if (!sorted.length) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-slate-500 text-sm">Select cities with historical data</p>
    </div>
  );

  const maxGain = sorted[0][h.key] ?? 1;
  const top = sorted[0];

  return (
    <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
      {/* Horizon toggle */}
      <div className="flex gap-1">
        {HORIZONS.map((hh) => (
          <button
            key={hh.id}
            onClick={() => setHorizon(hh.id)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              horizon === hh.id ? "bg-indigo-600 text-white" : "bg-slate-700/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            {hh.label}
          </button>
        ))}
        <span className="text-slate-600 text-xs self-center ml-2">{h.note}</span>
      </div>

      {/* Hero banner */}
      <div
        className="rounded-2xl p-5 border"
        style={{
          background: `linear-gradient(135deg, ${CITY_COLORS[top.city]}22 0%, #0f172a 100%)`,
          borderColor: CITY_COLORS[top.city] + "55",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: CITY_COLORS[top.city] }}>
            #1 Best Return · {h.label}
          </span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CITY_COLORS[top.city] }} />
              <span className="text-white font-extrabold text-2xl">{top.city}</span>
            </div>
            <div className="text-5xl font-black tracking-tight" style={{ color: CITY_COLORS[top.city] }}>
              {fmtUsd(top[h.key])}
            </div>
            <p className="text-slate-400 text-xs mt-1">gained per median home · {h.note} · Redfin</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-400">
              {top[h.cagrKey] != null ? `+${top[h.cagrKey].toFixed(1)}%` : "—"}
            </div>
            <div className="text-slate-500 text-xs">CAGR {h.label}</div>
            <div className="text-slate-300 text-sm font-semibold mt-2">{fmtUsd(top.home_value)}</div>
            <div className="text-slate-500 text-xs">current value</div>
          </div>
        </div>
      </div>

      {/* Rest of cities */}
      <div className="grid gap-3">
        {sorted.slice(1).map((s, i) => {
          const pct = maxGain > 0 ? (s[h.key] / maxGain) * 100 : 0;
          const color = CITY_COLORS[s.city] ?? "#6366f1";
          return (
            <div key={s.city} className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-3 flex items-center gap-4">
              <span className="text-slate-600 text-xs font-mono w-5">#{i + 2}</span>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-slate-200 font-semibold text-sm w-24 truncate">{s.city}</span>
              <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color + "cc" }} />
              </div>
              <div className="text-right min-w-[90px]">
                <div className={`font-bold text-sm ${s[h.key] >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtUsd(s[h.key])}
                </div>
                <div className="text-slate-500 text-[10px]">
                  {s[h.cagrKey] != null ? `${s[h.cagrKey].toFixed(1)}% CAGR` : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-slate-600 text-[10px] text-center">Absolute dollar gain on median sale price · Source: Redfin Market Tracker</p>
    </div>
  );
}

/* ── Market Snapshot cards — Redfin metrics ── */
function MarketSnapshotCards({ summaryData }) {
  if (!summaryData.length) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-slate-500 text-sm">Select at least one city</p>
    </div>
  );

  const sorted = [...summaryData].sort((a, b) => (a.median_dom ?? 999) - (b.median_dom ?? 999));

  const metrics = [
    {
      key: "median_dom",
      label: "Days on Market",
      icon: "⏱",
      fmt: (v) => v != null ? `${Math.round(v)}d` : "—",
      sub: "Median DOM",
      dir: "lower-better",
    },
    {
      key: "inventory",
      label: "Active Listings",
      icon: "🏠",
      fmt: (v) => v != null ? v.toLocaleString() : "—",
      sub: "Homes available",
      dir: "neutral",
    },
    {
      key: "months_of_supply",
      label: "Months of Supply",
      icon: "📦",
      fmt: (v) => v != null ? `${v.toFixed(1)}mo` : "—",
      sub: "< 3 = seller's market",
      dir: "lower-better",
    },
    {
      key: "sold_above_list",
      label: "Sold Above List",
      icon: "🔥",
      fmt: fmtPctRaw,
      sub: "of sales beat ask",
      dir: "higher-better",
    },
    {
      key: "avg_sale_to_list",
      label: "Sale-to-List",
      icon: "📈",
      fmt: fmtPctRaw,
      sub: "avg sale / list price",
      dir: "higher-better",
    },
    {
      key: "off_market_in_two_weeks",
      label: "Off Market <2wk",
      icon: "⚡",
      fmt: fmtPctRaw,
      sub: "snapped up fast",
      dir: "higher-better",
    },
    {
      key: "new_listings",
      label: "New Listings",
      icon: "📋",
      fmt: (v) => v != null ? v.toLocaleString() : "—",
      sub: "added last period",
      dir: "neutral",
    },
    {
      key: "pending_sales",
      label: "Pending Sales",
      icon: "🤝",
      fmt: (v) => v != null ? v.toLocaleString() : "—",
      sub: "under contract",
      dir: "neutral",
    },
  ];

  return (
    <div className="space-y-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
      <p className="text-slate-500 text-xs">Latest rolling 90-day window · Source: Redfin Market Tracker</p>

      {/* City cards */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {sorted.map((s) => {
          const color = CITY_COLORS[s.city] ?? "#6366f1";
          const phase = PHASE_CONFIG[s.market_phase] ?? PHASE_CONFIG.unknown;
          return (
            <div
              key={s.city}
              className="rounded-2xl border p-4"
              style={{
                background: `linear-gradient(135deg, ${color}12 0%, #0f172a 100%)`,
                borderColor: color + "40",
              }}
            >
              {/* City header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-white font-bold text-sm">{s.city}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black" style={{ color }}>
                    {fmtUsd(s.home_value)}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: phase.color, backgroundColor: phase.color + "20" }}
                  >
                    {phase.label}
                  </span>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {metrics.map((m) => {
                  const val = s[m.key];
                  const display = m.fmt(val);
                  let valColor = "text-slate-300";
                  if (val != null && m.dir !== "neutral") {
                    // Thresholds for color-coding
                    if (m.key === "median_dom")            valColor = val <= 30 ? "text-red-400" : val <= 60 ? "text-amber-400" : "text-slate-400";
                    if (m.key === "months_of_supply")       valColor = val < 3 ? "text-red-400" : val < 6 ? "text-amber-400" : "text-emerald-400";
                    if (m.key === "sold_above_list")        valColor = val > 0.3 ? "text-red-400" : val > 0.1 ? "text-amber-400" : "text-slate-400";
                    if (m.key === "avg_sale_to_list")       valColor = val >= 1 ? "text-red-400" : val >= 0.98 ? "text-amber-400" : "text-slate-400";
                    if (m.key === "off_market_in_two_weeks") valColor = val > 0.4 ? "text-red-400" : val > 0.2 ? "text-amber-400" : "text-slate-400";
                  }
                  return (
                    <div key={m.key}>
                      <div className="text-slate-500 text-[9px] uppercase tracking-wide">{m.icon} {m.label}</div>
                      <div className={`text-sm font-bold ${valColor}`}>{display}</div>
                    </div>
                  );
                })}
              </div>

              {/* YoY badge */}
              <div className="mt-3 pt-2 border-t border-slate-700/40 flex items-center gap-3 text-xs">
                <span className={`font-semibold ${s.yoy_change_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtPct(s.yoy_change_pct)} YoY
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{fmtPct(s.rolling_3m)} 3m trend</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{s.homes_sold != null ? `${s.homes_sold.toLocaleString()} sold` : "—"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareView({ data, selectedCities, summary }) {
  const [chartType, setChartType] = useState("values");
  const [timeRange, setTimeRange] = useState("all");

  const filtered = useMemo(() => {
    const start = getStartDate(timeRange);
    return data.combined_timeline.filter((r) => !start || r.date >= start);
  }, [data, timeRange]);

  const sampled = useMemo(() => filtered.filter((_, i) => i % 2 === 0), [filtered]);

  const indexData = useMemo(() =>
    sampled.map((row) => {
      const r = { date: row.date };
      selectedCities.forEach((city) => {
        const key = `${city}_index`;
        const base = filtered[0]?.[key];
        if (base != null && row[key] != null) r[`${city}_index`] = (row[key] / base) * 100;
      });
      return r;
    }),
    [sampled, filtered, selectedCities]
  );

  const cagrData = summary
    .filter((s) => selectedCities.includes(s.city))
    .sort((a, b) => (b.cagr_10y ?? 0) - (a.cagr_10y ?? 0));

  const returnsData = summary.filter((s) => selectedCities.includes(s.city));

  const marketData = summary.filter((s) => selectedCities.includes(s.city));

  const showTime = !["cagr", "returns", "drawdown", "market"].includes(chartType);

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-slate-900/60 rounded-lg p-1 flex-wrap">
            {COMPARE_CHARTS.map((t) => (
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
          {showTime && (
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

      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div style={(chartType === "drawdown" || chartType === "returns" || chartType === "market") ? {} : { height: "calc(100vh - 260px)", minHeight: 280 }}>
        {(chartType === "values" || chartType === "yoy" || chartType === "index") && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartType === "index" ? indexData : sampled}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(0, 4)} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} interval={Math.max(1, Math.floor(sampled.length / 10))} axisLine={{ stroke: "#334155" }} />
              <YAxis
                tickFormatter={chartType === "yoy" ? (v) => `${v.toFixed(0)}%` : chartType === "index" ? (v) => v.toFixed(0) : fmtK}
                tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} width={55}
              />
              <Tooltip content={<LineTooltip mode={chartType} />} />
              <Legend wrapperStyle={{ paddingTop: "12px" }} formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v.replace(/_index$|_yoy$/, "")}</span>} />
              {chartType === "yoy" && <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />}
              {chartType === "index" && <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 4" />}
              <ReferenceLine x="2008-09" stroke="#475569" strokeDasharray="4 4" label={{ value: "GFC", fill: "#64748b", fontSize: 10 }} />
              <ReferenceLine x="2022-03" stroke="#475569" strokeDasharray="4 4" label={{ value: "Rate hike", fill: "#64748b", fontSize: 10 }} />
              {selectedCities.map((city) => {
                const key = chartType === "index" ? `${city}_index` : chartType === "yoy" ? `${city}_yoy` : city;
                return <Line key={city} type="monotone" dataKey={key} stroke={CITY_COLORS[city]} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />;
              })}
            </LineChart>
          </ResponsiveContainer>
        )}

        {chartType === "cagr" && (
          <>
            <h3 className="text-white font-bold text-base mb-4">CAGR — Annualized Growth</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cagrData} margin={{ top: 5, right: 20, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="city" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#334155" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  formatter={(v, n) => [`${v?.toFixed(2)}%`, n]}
                  contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ paddingTop: "8px" }} formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>} />
                <Bar dataKey="cagr_20y" name="20Y" maxBarSize={16} radius={[3,3,0,0]} fill="#334155" />
                <Bar dataKey="cagr_10y" name="10Y" maxBarSize={16} radius={[3,3,0,0]}>
                  {cagrData.map((e) => <Cell key={e.city} fill={CITY_COLORS[e.city]} fillOpacity={0.85} />)}
                </Bar>
                <Bar dataKey="cagr_5y" name="5Y" maxBarSize={16} radius={[3,3,0,0]} fill="#6366f144" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {chartType === "drawdown" && (
          <ChartDrawdown summary={summary} selectedCities={selectedCities} />
        )}

        {chartType === "returns" && (
          <ReturnsCards returnsData={returnsData} summary={summary} />
        )}

        {chartType === "market" && (
          <MarketSnapshotCards summaryData={marketData} />
        )}

        {chartType === "table" && (
          <DataTable summary={summary} selectedCities={selectedCities} />
        )}
        </div>
      </div>
    </div>
  );
}

function DataTable({ summary, selectedCities }) {
  const [sortBy, setSortBy] = useState("home_value");
  const [sortDir, setSortDir] = useState("desc");

  const COLS = [
    { key: "city",                  label: "City",          fmt: null,                                                   color: null },
    { key: "county",                label: "County",        fmt: (v) => v,                                               color: null },
    { key: "home_value",            label: "Value",         fmt: fmtUsd,                                                 color: null },
    { key: "yoy_change_pct",        label: "YoY",           fmt: fmtPct,                                                 color: (v) => v > 0 ? "text-emerald-400" : "text-red-400" },
    { key: "rolling_3m",            label: "3m",            fmt: fmtPct,                                                 color: (v) => v > 0 ? "text-emerald-400" : "text-red-400" },
    { key: "cagr_5y",               label: "CAGR 5Y",       fmt: (v) => v != null ? `${v.toFixed(1)}%` : "—",           color: null },
    { key: "cagr_10y",              label: "CAGR 10Y",      fmt: (v) => v != null ? `${v.toFixed(1)}%` : "—",           color: (v) => v != null && v >= 5 ? "text-emerald-400" : "text-slate-300" },
    { key: "dollar_change_10y",     label: "$ Gain 10Y",    fmt: (v) => v != null ? fmtUsd(v) : "—",                   color: (v) => v != null && v > 0 ? "text-emerald-400" : "text-red-400" },
    { key: "median_dom",            label: "DOM",           fmt: (v) => v != null ? `${Math.round(v)}d` : "—",          color: (v) => v != null ? (v <= 30 ? "text-red-400" : v <= 60 ? "text-amber-400" : "text-slate-400") : null },
    { key: "inventory",             label: "Inventory",     fmt: (v) => v != null ? v.toLocaleString() : "—",           color: null },
    { key: "months_of_supply",      label: "Mos. Supply",   fmt: (v) => v != null ? `${v.toFixed(1)}` : "—",           color: (v) => v != null ? (v < 3 ? "text-red-400" : v < 6 ? "text-amber-400" : "text-emerald-400") : null },
    { key: "sold_above_list",       label: "Sold>List",     fmt: (v) => fmtPctRaw(v),                                   color: (v) => v != null ? (v > 0.3 ? "text-red-400" : v > 0.1 ? "text-amber-400" : "text-slate-400") : null },
    { key: "avg_sale_to_list",      label: "Sale/List",     fmt: (v) => fmtPctRaw(v),                                   color: (v) => v != null ? (v >= 1 ? "text-red-400" : v >= 0.98 ? "text-amber-400" : "text-slate-400") : null },
    { key: "off_market_in_two_weeks", label: "< 2wk",       fmt: (v) => fmtPctRaw(v),                                  color: (v) => v != null ? (v > 0.4 ? "text-red-400" : v > 0.2 ? "text-amber-400" : "text-slate-400") : null },
    { key: "from_peak_pct",         label: "From ATH",      fmt: fmtPct,                                                 color: (v) => v >= 0 ? "text-emerald-400" : "text-amber-400" },
    { key: "investment_score",      label: "Score",         fmt: (v) => v != null ? (v * 100).toFixed(0) : "—",         color: null },
    { key: "market_phase",          label: "Phase",         fmt: null,                                                   color: null },
  ];

  const handleSort = (key) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const rows = summary
    .filter((s) => selectedCities.includes(s.city))
    .sort((a, b) => {
      const va = a[sortBy], vb = b[sortBy];
      if (va == null) return 1;
      if (vb == null) return -1;
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-white font-bold text-base">Full Data Table</h3>
          <p className="text-slate-400 text-xs mt-0.5">Click column headers to sort · Redfin market metrics included</p>
        </div>
        <span className="text-slate-600 text-xs">{rows.length} cities</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-700">
              {COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`pb-2 font-medium cursor-pointer select-none transition-colors hover:text-slate-200 ${
                    col.key === "city" || col.key === "county" ? "text-left pr-4" : "text-right px-2"
                  } ${sortBy === col.key ? "text-indigo-400" : "text-slate-500"}`}
                >
                  {col.label}
                  {sortBy === col.key && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const cfg = PHASE_CONFIG[s.market_phase] || PHASE_CONFIG.unknown;
              return (
                <tr key={s.city} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                  {COLS.map((col) => {
                    if (col.key === "city") return (
                      <td key="city" className="py-2 pr-4">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] ?? "#6366f1" }} />
                          <span className="text-slate-200 font-semibold">{s.city}</span>
                        </div>
                      </td>
                    );
                    if (col.key === "market_phase") return (
                      <td key="phase" className="py-2 px-2 text-right">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.color + "20" }}>
                          {cfg.label}
                        </span>
                      </td>
                    );
                    const val = s[col.key];
                    const formatted = col.fmt ? col.fmt(val) : (val ?? "—");
                    const colorClass = col.color ? (col.color(val) ?? "text-slate-300") : "text-slate-300";
                    return (
                      <td key={col.key} className={`py-2 px-2 text-right font-medium ${colorClass}`}>
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ChapterExplorar({ data, selectedCities }) {
  const [mode, setMode] = useState("compare");

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
          <button
            onClick={() => setMode("compare")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "compare" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40"
            }`}
          >
            ⚖ Compare Cities
          </button>
          <button
            onClick={() => setMode("city")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "city" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40"
            }`}
          >
            🔍 Deep Dive — One City
          </button>
        </div>
        <p className="text-slate-500 text-xs">
          {mode === "compare"
            ? "Select multiple cities and compare side by side"
            : "Pick one city and explore ZIPs + bedroom breakdown"}
        </p>
      </div>

      {mode === "compare" && (
        <CompareView data={data} selectedCities={selectedCities} summary={data.summary} />
      )}

      {mode === "city" && (
        <ChartZipDrilldown zipData={data.zip_data} summary={data.summary} selectedCities={selectedCities} />
      )}
    </div>
  );
}
