import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend,
} from "recharts";
import { CITY_COLORS } from "./constants";

const fmtUsd = (v) =>
  v != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
    : "—";
const fmtK   = (v) => v != null ? `$${(v / 1000).toFixed(0)}k` : "—";
const fmtPct = (v) => v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—";

function zipColor(cityColor, index, total) {
  if (!cityColor || cityColor.length < 7) return "#6366f1";
  const r = parseInt(cityColor.slice(1, 3), 16) || 0;
  const g = parseInt(cityColor.slice(3, 5), 16) || 0;
  const b = parseInt(cityColor.slice(5, 7), 16) || 0;
  const factor = total <= 1 ? 1 : 0.45 + (index / (total - 1)) * 0.55;
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

function LineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300 w-16">{p.dataKey}:</span>
          <span className="text-white font-semibold">{fmtUsd(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-1">ZIP {label}</p>
      <p className="text-white font-bold text-sm">{fmtUsd(payload[0]?.value)}</p>
      <p className="text-slate-500 text-[10px]">Median home value · Jan 2026</p>
    </div>
  );
}

const BR_COLORS = { "2": "#fb923c", "3": "#6366f1", "4": "#10b981", "5": "#e879f9" };
const BR_LABELS = { "2": "2 bed", "3": "3 bed", "4": "4 bed", "5": "5+ bed" };

const COL_HEADERS = [
  { label: "Value",     align: "right" },
  { label: "YoY",      align: "right" },
  { label: "CAGR 5Y",  align: "right" },
  { label: "CAGR 10Y", align: "right" },
  { label: "Peak",     align: "right" },
  { label: "Peak Date",align: "right" },
  { label: "vs ATH",   align: "right" },
];

function CityRow({ city, summary, zipData, color, expandedZips, expandedBeds, onToggleZip, onToggleBed }) {
  const s = summary.find((x) => x.city === city);
  const zips = zipData[city] ? Object.values(zipData[city]).sort((a, b) => b.current_value - a.current_value) : [];
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── City row ── */}
      <tr
        className="border-b border-slate-700/60 hover:bg-slate-700/20 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="py-2.5 pl-3 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs w-4 text-center">{open ? "▼" : "▶"}</span>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-white font-bold text-sm">{city}</span>
            <span className="text-slate-600 text-[10px] ml-1">{zips.length} ZIPs</span>
          </div>
        </td>
        <td className="py-2.5 text-right pr-3 text-white font-semibold text-sm">{fmtUsd(s?.home_value)}</td>
        <td className={`py-2.5 text-right pr-3 text-sm font-semibold ${s?.yoy_change_pct > 0 ? "text-emerald-400" : "text-red-400"}`}>
          {fmtPct(s?.yoy_change_pct)}
        </td>
        <td className="py-2.5 text-right pr-3 text-sky-400 text-sm">
          {s?.cagr_5y != null ? `${s.cagr_5y.toFixed(1)}%` : "—"}
        </td>
        <td className="py-2.5 text-right pr-3 text-sky-400 text-sm">
          {s?.cagr_10y != null ? `${s.cagr_10y.toFixed(1)}%` : "—"}
        </td>
        <td className="py-2.5 text-right pr-3 text-slate-300 text-sm">{fmtUsd(s?.peak_value)}</td>
        <td className="py-2.5 text-right pr-3 text-slate-500 text-xs">{s?.peak_date ?? "—"}</td>
        <td className={`py-2.5 text-right pr-3 text-sm font-semibold ${s?.from_peak_pct >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
          {fmtPct(s?.from_peak_pct)}
        </td>
      </tr>

      {/* ── ZIP rows (visible when city is open) ── */}
      {open && zips.map((zip, zi) => {
        const zColor = zipColor(color, zi, zips.length);
        const brKeys = Object.keys(zip.bedrooms || {}).sort();
        const zipOpen = expandedZips.has(zip.zip);
        return (
          <>
            <tr
              key={zip.zip}
              className="border-b border-slate-700/30 hover:bg-slate-800/60 cursor-pointer"
              onClick={() => onToggleZip(zip.zip)}
            >
              {/* ZIP label — indented */}
              <td className="py-2 pl-10 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-[10px] w-4 text-center">
                    {brKeys.length > 0 ? (zipOpen ? "▼" : "▶") : "·"}
                  </span>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: zColor }} />
                  <span className="text-slate-300 font-mono text-xs">{zip.zip}</span>
                  {brKeys.length > 0 && (
                    <span className="text-slate-700 text-[9px]">{brKeys.length} bed types</span>
                  )}
                </div>
              </td>
              <td className="py-2 text-right pr-3 text-slate-200 text-xs font-semibold">{fmtUsd(zip.current_value)}</td>
              <td className={`py-2 text-right pr-3 text-xs font-semibold ${zip.yoy_change_pct > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmtPct(zip.yoy_change_pct)}
              </td>
              <td className="py-2 text-right pr-3 text-sky-400 text-xs">
                {zip.cagr_5y != null ? `${zip.cagr_5y.toFixed(1)}%` : "—"}
              </td>
              <td className="py-2 text-right pr-3 text-sky-400 text-xs">
                {zip.cagr_10y != null ? `${zip.cagr_10y.toFixed(1)}%` : "—"}
              </td>
              <td className="py-2 text-right pr-3 text-slate-400 text-xs">{fmtUsd(zip.peak_value)}</td>
              <td className="py-2 text-right pr-3 text-slate-600 text-[10px]">{zip.peak_date}</td>
              <td className={`py-2 text-right pr-3 text-xs font-semibold ${zip.from_peak_pct >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {fmtPct(zip.from_peak_pct)}
              </td>
            </tr>

            {/* ── Bedroom rows (visible when ZIP is open) ── */}
            {zipOpen && brKeys.map((br) => {
              const bd = zip.bedrooms[br];
              if (!bd) return null;
              return (
                <tr key={`${zip.zip}_${br}`} className="border-b border-slate-700/20 bg-slate-900/30">
                  <td className="py-1.5 pl-16 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BR_COLORS[br] }} />
                      <span className="text-[11px] font-semibold" style={{ color: BR_COLORS[br] }}>
                        {BR_LABELS[br]}
                      </span>
                    </div>
                  </td>
                  <td className="py-1.5 text-right pr-3 text-slate-300 text-[11px] font-semibold">{fmtUsd(bd.current_value)}</td>
                  <td className={`py-1.5 text-right pr-3 text-[11px] font-semibold ${bd.yoy_change_pct > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {fmtPct(bd.yoy_change_pct)}
                  </td>
                  <td className="py-1.5 text-right pr-3 text-sky-400 text-[11px]">
                    {bd.cagr_5y != null ? `${bd.cagr_5y.toFixed(1)}%` : "—"}
                  </td>
                  <td className="py-1.5 text-right pr-3 text-sky-400 text-[11px]">
                    {bd.cagr_10y != null ? `${bd.cagr_10y.toFixed(1)}%` : "—"}
                  </td>
                  <td colSpan={3} className="py-1.5 pr-3 text-right text-slate-700 text-[10px]">—</td>
                </tr>
              );
            })}
          </>
        );
      })}
    </>
  );
}

/* ── Main component ── */
export default function ChartZipDrilldown({ zipData, summary = [], selectedCities }) {
  const firstWithData = selectedCities.find((c) => zipData[c] && Object.keys(zipData[c]).length > 0) || selectedCities[0] || "";
  const [selectedCity, setSelectedCity] = useState(firstWithData);
  const [timeRange, setTimeRange] = useState("all");

  // Multi-expand sets for ZIP cards and table ZIP rows
  const [expandedZips, setExpandedZips] = useState(new Set());

  useEffect(() => {
    const isCurrentValid =
      selectedCities.includes(selectedCity) &&
      zipData[selectedCity] &&
      Object.keys(zipData[selectedCity]).length > 0;
    if (!isCurrentValid) {
      const next = selectedCities.find((c) => zipData[c] && Object.keys(zipData[c]).length > 0) || selectedCities[0] || "";
      setSelectedCity(next);
      setExpandedZips(new Set());
    }
  }, [selectedCities]);

  function toggleZip(zip) {
    setExpandedZips((prev) => {
      const next = new Set(prev);
      next.has(zip) ? next.delete(zip) : next.add(zip);
      return next;
    });
  }

  const cityZips   = (selectedCity && zipData[selectedCity]) ? Object.values(zipData[selectedCity]) : [];
  const cityColor  = CITY_COLORS[selectedCity] || "#6366f1";
  const zipList    = [...cityZips].sort((a, b) => b.current_value - a.current_value);

  const allDates   = cityZips[0]?.timeline?.map((r) => r.date) || [];
  const getStart   = (range) => {
    const map = { "2y": 2, "5y": 5, "10y": 10 };
    if (!map[range]) return null;
    const d = new Date("2026-01-01");
    d.setFullYear(d.getFullYear() - map[range]);
    return d.toISOString().slice(0, 7);
  };
  const startDate      = getStart(timeRange);
  const filteredDates  = startDate ? allDates.filter((d) => d >= startDate) : allDates;
  const mergedTimeline = filteredDates
    .filter((_, i) => i % 2 === 0)
    .map((date) => {
      const row = { date };
      cityZips.forEach((zip) => {
        const pt = zip.timeline.find((r) => r.date === date);
        if (pt) row[zip.zip] = pt.value;
      });
      return row;
    });

  const spread  = zipList.length > 1 ? zipList[0].current_value - zipList[zipList.length - 1].current_value : 0;
  const barData = zipList.map((z) => ({ zip: z.zip, value: z.current_value }));

  // Cities that have ZIP data (for the pivot table)
  const citiesWithZips = selectedCities.filter((c) => zipData[c] && Object.keys(zipData[c]).length > 0);

  if (!selectedCity || cityZips.length === 0) {
    return (
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-12 flex items-center justify-center">
        <p className="text-slate-500">Select a city with ZIP data to begin drill-down</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── City selector + time range ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-white font-bold text-xl">ZIP Code Drill-Down</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Price disparities hidden by city averages · Charts show one city · Table shows all
            </p>
          </div>
          <div className="flex gap-1">
            {["all","10y","5y","2y"].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === r ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                }`}
              >
                {r === "all" ? "All" : r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {selectedCities.map((city) => {
            const zips = zipData[city] ? Object.keys(zipData[city]) : [];
            return (
              <button
                key={city}
                onClick={() => { setSelectedCity(city); setExpandedZips(new Set()); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  selectedCity === city ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
                style={
                  selectedCity === city
                    ? { backgroundColor: CITY_COLORS[city] + "20", color: CITY_COLORS[city], borderColor: CITY_COLORS[city] + "60" }
                    : { backgroundColor: "transparent", color: "#94a3b8", borderColor: "#334155" }
                }
              >
                {city}
                <span className="text-[10px] font-bold px-1 rounded" style={{ backgroundColor: CITY_COLORS[city] + "30" }}>
                  {zips.length} ZIPs
                </span>
              </button>
            );
          })}
        </div>

        {spread > 0 && (
          <div className="mt-4 flex items-center gap-3 bg-slate-700/30 rounded-xl px-4 py-2.5">
            <span className="text-slate-400 text-sm">Price spread within {selectedCity}:</span>
            <span className="text-white font-bold text-lg">{fmtUsd(spread)}</span>
            <span className="text-slate-500 text-xs">cheapest → most expensive ZIP</span>
          </div>
        )}
      </div>

      {/* ── Value evolution ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h3 className="text-white font-bold text-lg">{selectedCity} — Value by ZIP Code</h3>
          <p className="text-slate-400 text-sm">Each line = one ZIP code · Zillow ZHVI (smoothed)</p>
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={mergedTimeline} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(0, 4)} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} interval={Math.floor(filteredDates.length / 12)} axisLine={{ stroke: "#334155" }} />
            <YAxis tickFormatter={fmtK} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} width={55} />
            <Tooltip content={<LineTooltip />} />
            <Legend wrapperStyle={{ paddingTop: "12px" }} formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{v}</span>} />
            <ReferenceLine x="2022-03" stroke="#475569" strokeDasharray="4 4" label={{ value: "Rate hike", fill: "#64748b", fontSize: 10 }} />
            {cityZips.map((zip, i) => (
              <Line key={zip.zip} type="monotone" dataKey={zip.zip} stroke={zipColor(cityColor, i, cityZips.length)} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bar chart ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h3 className="text-white font-bold text-lg">Current Value by ZIP</h3>
          <p className="text-slate-400 text-sm">Jan 2026 median home value</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="zip" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#334155" }} />
            <YAxis tickFormatter={fmtK} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} width={55} />
            <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)", radius: 6 }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
              {barData.map((entry, i) => (
                <Cell key={entry.zip} fill={zipColor(cityColor, i, barData.length)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Pivot table: City → ZIP → Bedrooms ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold text-base">City · ZIP · Bedroom Breakdown</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Click a city to expand its ZIPs · Click a ZIP to expand bedroom data
            </p>
          </div>
          {expandedZips.size > 0 && (
            <button onClick={() => setExpandedZips(new Set())} className="text-slate-600 hover:text-slate-400 text-xs">
              collapse ZIPs
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="border-b border-slate-700 text-slate-500 text-xs">
                <th className="text-left pb-3 pl-3 font-medium">City / ZIP / Bedrooms</th>
                {COL_HEADERS.map((h) => (
                  <th key={h.label} className="text-right pb-3 pr-3 font-medium whitespace-nowrap">{h.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {citiesWithZips.map((city) => (
                <CityRow
                  key={city}
                  city={city}
                  summary={summary}
                  zipData={zipData}
                  color={CITY_COLORS[city] || "#6366f1"}
                  expandedZips={expandedZips}
                  onToggleZip={toggleZip}
                />
              ))}
              {citiesWithZips.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-600 text-sm">
                    No ZIP data available for selected cities
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-slate-700 text-[10px] mt-3">ZIP data: Zillow ZHVI · City metrics: Redfin Market Tracker</p>
      </div>
    </div>
  );
}
