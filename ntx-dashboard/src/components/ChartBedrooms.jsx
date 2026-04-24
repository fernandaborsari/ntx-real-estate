import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { CITY_COLORS } from "./constants";

const BR_COLORS = {
  "1": "#f87171",
  "2": "#fb923c",
  "3": "#6366f1",
  "4": "#10b981",
  "5": "#e879f9",
};

const BR_LABELS = {
  "1": "1 Bed",
  "2": "2 Beds",
  "3": "3 Beds",
  "4": "4 Beds",
  "5": "5+ Beds",
};

const fmtUsd = (v) =>
  v != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
    : "—";

const fmtK = (v) =>
  v != null ? `$${(v / 1000).toFixed(0)}k` : "—";

function ValueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300 w-16">{BR_LABELS[p.dataKey] || p.dataKey}:</span>
          <span className="text-white font-semibold">{fmtUsd(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function CAGRTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-white font-bold mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-6 text-sm">
          <span className="text-slate-400">{p.name}</span>
          <span className={`font-semibold ${p.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {p.value != null ? `${p.value.toFixed(2)}%` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChartBedrooms({ bedroomTimeline, bedroomSummary, selectedCities }) {
  const [selectedCity, setSelectedCity] = useState(selectedCities[0] || "Frisco");

  // Reset selected city when the city filter changes
  useEffect(() => {
    if (!selectedCities.includes(selectedCity)) {
      setSelectedCity(selectedCities[0] || "");
    }
  }, [selectedCities]);
  const [activeBRs, setActiveBRs] = useState(["2", "3", "4"]);

  const availableBRs = Object.keys(BR_LABELS).filter(
    (br) => bedroomTimeline[br]?.some((row) => row[selectedCity] != null)
  );

  function toggleBR(br) {
    setActiveBRs((prev) =>
      prev.includes(br) ? prev.filter((b) => b !== br) : [...prev, br]
    );
  }

  // Timeline for selected city — rebase to 100
  const cityTimelines = {};
  availableBRs.forEach((br) => {
    const rows = bedroomTimeline[br] || [];
    const firstVal = rows.find((r) => r[selectedCity] != null)?.[selectedCity];
    if (!firstVal) return;
    cityTimelines[br] = rows
      .filter((_, i) => i % 3 === 0)
      .map((r) => ({
        date: r.date,
        [br]: r[selectedCity] != null ? round2(r[selectedCity]) : null,
      }));
  });

  // Merge all BR timelines into one array for the chart
  const allDates = bedroomTimeline["3"]
    ?.filter((_, i) => i % 3 === 0)
    .map((r) => r.date) || [];

  const mergedTimeline = allDates.map((date) => {
    const row = { date };
    availableBRs.forEach((br) => {
      const match = bedroomTimeline[br]?.find((r) => r.date === date);
      if (match) row[br] = match[selectedCity] ?? null;
    });
    return row;
  });

  // Current value comparison across cities for a selected BR
  const [compareBR, setCompareBR] = useState("3");
  const cityCompareData = selectedCities
    .map((city) => ({
      city,
      value: bedroomSummary[city]?.[compareBR]?.home_value ?? null,
    }))
    .filter((d) => d.value != null)
    .sort((a, b) => b.value - a.value);

  // CAGR table: city × bedroom
  const cagrData = selectedCities
    .filter((c) => bedroomSummary[c])
    .map((city) => {
      const row = { city };
      Object.keys(BR_LABELS).forEach((br) => {
        row[`cagr_10y_${br}`] = bedroomSummary[city]?.[br]?.cagr_10y ?? null;
        row[`val_${br}`] = bedroomSummary[city]?.[br]?.home_value ?? null;
        row[`yoy_${br}`] = bedroomSummary[city]?.[br]?.yoy_change_pct ?? null;
      });
      return row;
    });

  return (
    <div className="space-y-6">

      {/* ── City selector + BR toggle ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-bold text-xl">Bedroom Analysis</h2>
            <p className="text-slate-400 text-sm mt-0.5">Price evolution and returns by number of bedrooms</p>
          </div>

          {/* City selector */}
          <div className="flex flex-wrap gap-1.5">
            {selectedCities.map((city) => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  selectedCity === city ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
                style={
                  selectedCity === city
                    ? { backgroundColor: CITY_COLORS[city] + "25", color: CITY_COLORS[city], borderColor: CITY_COLORS[city] + "60" }
                    : { backgroundColor: "transparent", color: "#94a3b8", borderColor: "#334155" }
                }
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* BR toggle */}
        <div className="flex gap-2 mt-4">
          <span className="text-slate-500 text-xs font-semibold self-center">Show:</span>
          {availableBRs.map((br) => (
            <button
              key={br}
              onClick={() => toggleBR(br)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                activeBRs.includes(br) ? "opacity-100" : "opacity-30 hover:opacity-60"
              }`}
              style={{
                backgroundColor: BR_COLORS[br] + "20",
                color: BR_COLORS[br],
                borderColor: BR_COLORS[br] + "50",
              }}
            >
              {BR_LABELS[br]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Value evolution per BR — selected city ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="mb-4">
          <h3 className="text-white font-bold text-lg">{selectedCity} — Value by Bedroom Count</h3>
          <p className="text-slate-400 text-sm">Median home value per bedroom type over time</p>
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={mergedTimeline} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
              tickFormatter={fmtK}
              tick={{ fill: "#64748b", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip content={<ValueTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: "12px" }}
              formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 12 }}>{BR_LABELS[v] || v}</span>}
            />
            {availableBRs.filter((br) => activeBRs.includes(br)).map((br) => (
              <Line
                key={br}
                type="monotone"
                dataKey={br}
                stroke={BR_COLORS[br]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Current value comparison across cities ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-bold text-lg">City Comparison</h3>
            <p className="text-slate-400 text-sm">Current median value by city for selected bedroom type</p>
          </div>
          <div className="flex gap-1.5">
            {["2", "3", "4", "5"].map((br) => (
              <button
                key={br}
                onClick={() => setCompareBR(br)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                  compareBR === br ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
                style={{
                  backgroundColor: BR_COLORS[br] + "20",
                  color: BR_COLORS[br],
                  borderColor: BR_COLORS[br] + "50",
                }}
              >
                {BR_LABELS[br]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={cityCompareData} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
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
              width={55}
            />
            <Tooltip
              formatter={(v) => [fmtUsd(v), BR_LABELS[compareBR]]}
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }}
              labelStyle={{ color: "#fff", fontWeight: 600 }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {cityCompareData.map((entry) => (
                <Cell key={entry.city} fill={CITY_COLORS[entry.city] || BR_COLORS[compareBR]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Full table: value + YoY + CAGR per city × BR ── */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-white font-semibold mb-1">Current Value by City & Bedroom</h3>
        <p className="text-slate-500 text-xs mb-4">Current median · YoY % · 10Y CAGR</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left pb-3 font-medium">City</th>
                {["2","3","4","5"].map((br) => (
                  <th key={br} colSpan={3} className="text-center pb-3 font-medium border-l border-slate-700/50">
                    <span style={{ color: BR_COLORS[br] }}>{BR_LABELS[br]}</span>
                  </th>
                ))}
              </tr>
              <tr className="text-slate-600 border-b border-slate-700/50">
                <th className="pb-2" />
                {["2","3","4","5"].flatMap((br) => [
                  <th key={`${br}-v`} className="text-right pb-2 font-medium border-l border-slate-700/50 px-2">Value</th>,
                  <th key={`${br}-y`} className="text-right pb-2 font-medium px-2">YoY</th>,
                  <th key={`${br}-c`} className="text-right pb-2 font-medium px-2">CAGR 10Y</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {cagrData.map((row) => (
                <tr key={row.city} className="border-b border-slate-700/40 hover:bg-slate-700/20">
                  <td className="py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[row.city] }} />
                      <span className="text-slate-200 font-medium">{row.city}</span>
                    </div>
                  </td>
                  {["2","3","4","5"].flatMap((br) => [
                    <td key={`${br}-v`} className="py-2.5 text-right text-slate-200 font-semibold border-l border-slate-700/50 px-2">
                      {row[`val_${br}`] ? fmtK(row[`val_${br}`]) : "—"}
                    </td>,
                    <td key={`${br}-y`} className={`py-2.5 text-right px-2 font-medium ${
                      row[`yoy_${br}`] > 0 ? "text-emerald-400" : row[`yoy_${br}`] < 0 ? "text-red-400" : "text-slate-500"
                    }`}>
                      {row[`yoy_${br}`] != null ? `${row[`yoy_${br}`] > 0 ? "+" : ""}${row[`yoy_${br}`].toFixed(1)}%` : "—"}
                    </td>,
                    <td key={`${br}-c`} className={`py-2.5 text-right px-2 ${
                      row[`cagr_10y_${br}`] > 0 ? "text-sky-400" : "text-slate-500"
                    }`}>
                      {row[`cagr_10y_${br}`] != null ? `${row[`cagr_10y_${br}`].toFixed(1)}%` : "—"}
                    </td>,
                  ])}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function round2(v) { return Math.round(v * 100) / 100; }
