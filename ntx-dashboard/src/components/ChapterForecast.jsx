import { useMemo, useState } from "react";
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { CITY_COLORS } from "./constants";

/* ── helpers ── */
const fmtUsd = (v) =>
  v != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)
    : "—";
const fmtK = (v) => (v != null ? `$${(v / 1000).toFixed(0)}k` : "—");

const HORIZONS = [
  { id: "1y", label: "1Y", months: 12 },
  { id: "3y", label: "3Y", months: 36 },
  { id: "5y", label: "5Y", months: 60 },
];

const SECTIONS = [
  { id: "projection", label: "📈 Projection",   desc: "Where are prices headed?" },
  { id: "outlook",   label: "🏙 City Outlook",  desc: "What each city looks like in the future" },
  { id: "recovery",  label: "🔁 Recovery",      desc: "How long to reach the all-time high?" },
];

// Real estate annual price volatility from raw sale-price data is inflated by
// sampling noise. Academic research (Case-Shiller) shows ~4–6% annual std dev
// for metro areas. We cap at 5% so confidence bands stay meaningful.
const VOL_CAP_ANNUAL = 5; // percent

/* ── projection math ── */
function buildProjection(summary, timeline, city, months) {
  const s = summary.find((x) => x.city === city);
  if (!s || s.home_value == null) return null;

  const cagr        = s.cagr_10y ?? s.cagr_5y ?? 3;
  const vol         = s.volatility_monthly ?? 0.5;
  const monthlyRate = Math.pow(1 + cagr / 100, 1 / 12) - 1;
  const current     = s.home_value;

  // Cap annual vol to avoid noise-inflated bands
  const annVol = Math.min(vol * Math.sqrt(12), VOL_CAP_ANNUAL);

  const histPoints = timeline
    .filter((r) => r.date >= "2023-01" && r[city] != null)
    .map((r) => ({ date: r.date, value: r[city] }));

  const futurePoints = [];
  for (let m = 1; m <= months; m++) {
    const d = new Date("2026-01-01");
    d.setMonth(d.getMonth() + m);
    const dateStr = d.toISOString().slice(0, 7);
    const central = current * Math.pow(1 + monthlyRate, m);
    const band    = central * (annVol / 100) * 1.28 * Math.sqrt(m / 12);
    futurePoints.push({ date: dateStr, central, upper: central + band, lower: Math.max(central - band, 0) });
  }

  return { histPoints, futurePoints, cagr, vol, annVol, current, city };
}

function buildChartData(projections) {
  const allDates = new Set();
  projections.forEach(({ histPoints, futurePoints }) => {
    histPoints.forEach((p) => allDates.add(p.date));
    futurePoints.forEach((p) => allDates.add(p.date));
  });
  return [...allDates].sort().map((date) => {
    const row = { date };
    projections.forEach(({ histPoints, futurePoints, city }) => {
      const h = histPoints.find((p) => p.date === date);
      const f = futurePoints.find((p) => p.date === date);
      if (h) row[city] = h.value;
      if (f) { row[`${city}_proj`] = f.central; row[`${city}_band`] = [f.lower, f.upper]; }
    });
    return row;
  });
}

/* ── tooltip ── */
function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.name !== "band" && !p.name?.includes("_band") && p.value != null);
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-1.5">{label}</p>
      {items.slice(0, 6).map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400 truncate w-20">{p.name?.replace(/_proj$/, " ↗")}</span>
          <span className="text-white font-semibold ml-auto">{fmtK(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Section 1: Projection chart ── */
function SectionProjection({ selectedSummary, chartData, horizon }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div className="mb-3">
        <h3 className="text-white font-bold text-base">Price Projection · {horizon.label === "1Y" ? "1 Year" : horizon.label === "3Y" ? "3 Years" : "5 Years"}</h3>
        <p className="text-slate-500 text-xs mt-0.5">
          Solid = historical · Dashed = projected · Shaded = 80% confidence band
        </p>
      </div>
      <div style={{ height: "calc(100vh - 340px)", minHeight: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => d.slice(0, 7)}
              tick={{ fill: "#64748b", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              interval={Math.max(1, Math.floor(chartData.length / 7))}
            />
            <YAxis tickFormatter={fmtK} tick={{ fill: "#64748b", fontSize: 11 }} tickLine={false} axisLine={false} width={52} />
            <Tooltip content={<ForecastTooltip />} />
            <ReferenceLine x="2026-01" stroke="#6366f1" strokeDasharray="4 4"
              label={{ value: "Today", fill: "#6366f1", fontSize: 10, position: "insideTopRight" }} />
            {selectedSummary.map((s) => {
              const c = CITY_COLORS[s.city];
              return [
                <Area key={`${s.city}_band`} dataKey={`${s.city}_band`} stroke="none" fill={c} fillOpacity={0.08} name="band" />,
                <Line key={s.city} type="monotone" dataKey={s.city} stroke={c} strokeWidth={2} dot={false} activeDot={{ r: 3, strokeWidth: 0 }} name={s.city} />,
                <Line key={`${s.city}_proj`} type="monotone" dataKey={`${s.city}_proj`} stroke={c} strokeWidth={1.5} strokeDasharray="5 4" dot={false} name={`${s.city}_proj`} legendType="none" />,
              ];
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {/* Color legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
        {selectedSummary.map((s) => (
          <div key={s.city} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
            <span className="text-slate-400 text-[11px]">{s.city}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Section 2: City Outlook cards ── */
function SectionOutlook({ selectedSummary, horizon }) {
  const months    = horizon.months;
  const years     = months / 12;
  const horizonLabel = horizon.label === "1Y" ? "1 Year" : horizon.label === "3Y" ? "3 Years" : "5 Years";

  const cards = selectedSummary.map((s) => {
    const cagr        = s.cagr_10y ?? s.cagr_5y ?? 3;
    const vol         = s.volatility_monthly ?? 0.5;
    const monthlyRate = Math.pow(1 + cagr / 100, 1 / 12) - 1;
    const current     = s.home_value;
    const central     = current * Math.pow(1 + monthlyRate, months);
    const annVol      = Math.min(vol * Math.sqrt(12), VOL_CAP_ANNUAL);
    const band        = central * (annVol / 100) * 1.28 * Math.sqrt(years);
    const gain        = central - current;
    const gainPct     = (gain / current) * 100;
    return { ...s, cagr, central, band, gain, gainPct, current };
  }).sort((a, b) => b.gainPct - a.gainPct);

  const best    = cards[0];
  const maxGain = best?.gainPct ?? 1;

  return (
    <div className="space-y-3">

      {/* Hero card */}
      {best && (
        <div
          className="rounded-2xl p-5 border"
          style={{ background: `linear-gradient(135deg, ${CITY_COLORS[best.city]}18 0%, #0f172a 100%)`, borderColor: CITY_COLORS[best.city] + "50" }}
        >
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: CITY_COLORS[best.city] }}>
            #1 Highest projected growth · {horizonLabel}
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                {/* Big color circle */}
                <span className="w-5 h-5 rounded-full flex-shrink-0 shadow-lg" style={{ backgroundColor: CITY_COLORS[best.city] }} />
                <span className="text-white font-extrabold text-2xl">{best.city}</span>
              </div>
              {/* Current → Projected arrow */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-400 text-sm line-through">{fmtUsd(best.current)}</span>
                <span className="text-slate-600">→</span>
                <span className="text-3xl font-black" style={{ color: CITY_COLORS[best.city] }}>{fmtUsd(best.central)}</span>
              </div>
              <div className="text-slate-400 text-xs">projected median value in {horizonLabel}</div>
            </div>
            <div className="text-right">
              <div className="text-emerald-400 font-black text-3xl">+{best.gainPct.toFixed(1)}%</div>
              <div className="text-emerald-500 font-semibold">+{fmtUsd(best.gain)} gained</div>
              <div className="text-slate-500 text-xs mt-1">{best.cagr.toFixed(1)}% annual growth (CAGR)</div>
            </div>
          </div>
          {/* Confidence range */}
          <div className="mt-4 bg-slate-900/40 rounded-xl px-4 py-3">
            <div className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">
              80% Confidence Range — where prices will likely land
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-orange-400 font-bold text-sm">{fmtUsd(Math.max(best.central - best.band, 0))}</div>
                <div className="text-slate-600 text-[10px]">Pessimistic scenario</div>
              </div>
              <div className="text-slate-700 text-xs">←  range  →</div>
              <div className="text-right">
                <div className="text-emerald-400 font-bold text-sm">{fmtUsd(best.central + best.band)}</div>
                <div className="text-slate-600 text-[10px]">Optimistic scenario</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other cities — enriched mini-hero grid */}
      <div className="grid grid-cols-2 gap-2">
        {cards.slice(1).map((s, i) => {
          const color  = CITY_COLORS[s.city];
          const barPct = (s.gainPct / maxGain) * 100;
          const rank   = i + 2;
          return (
            <div
              key={s.city}
              className="rounded-xl p-3.5 border flex flex-col gap-2"
              style={{
                background: `linear-gradient(135deg, ${color}12 0%, #0f172a 100%)`,
                borderColor: color + "35",
              }}
            >
              {/* Rank badge + city dot + name + gain% */}
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex-shrink-0"
                  style={{ backgroundColor: color + "22", color }}
                >
                  #{rank}
                </span>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-200 font-bold text-xs flex-1 truncate">{s.city}</span>
                <span className="text-emerald-400 text-xs font-black">+{s.gainPct.toFixed(1)}%</span>
              </div>

              {/* Current → Projected (strikethrough style) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 text-[10px] line-through">{fmtK(s.current)}</span>
                <span className="text-slate-600 text-[10px]">→</span>
                <span className="font-black text-sm leading-tight" style={{ color }}>{fmtK(s.central)}</span>
              </div>

              {/* Dollar gain + CAGR */}
              <div className="flex items-center justify-between">
                <span className="text-emerald-500 text-[10px] font-semibold">+{fmtK(s.gain)}</span>
                <span className="text-slate-500 text-[10px]">{s.cagr.toFixed(1)}% CAGR</span>
              </div>

              {/* Progress bar vs #1 */}
              <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: color + "bb" }} />
              </div>

              {/* 80% confidence range */}
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-orange-400 font-semibold">{fmtK(Math.max(s.central - s.band, 0))}</span>
                <span className="text-slate-700">80% range</span>
                <span className="text-emerald-400 font-semibold">{fmtK(s.central + s.band)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-slate-700 text-[10px] text-center">
        80% confidence range = ±1.28σ√t · Assumes historical CAGR continues · Not a guarantee
      </p>
    </div>
  );
}

/* ── Section 3: Recovery ── */
function SectionRecovery({ selectedSummary }) {
  const atATH = selectedSummary.filter((s) => !s.from_peak_pct || s.from_peak_pct >= 0);
  const recovering = selectedSummary
    .filter((s) => s.from_peak_pct != null && s.from_peak_pct < 0)
    .map((s) => {
      const cagr = s.cagr_10y ?? s.cagr_5y ?? 3;
      const gap  = Math.abs(s.from_peak_pct);
      const months = gap > 0 && cagr > 0
        ? Math.ceil((Math.log(1 + gap / 100) / Math.log(1 + cagr / 100)) * 12)
        : null;
      return { ...s, cagr, months };
    })
    .sort((a, b) => (a.months ?? 999) - (b.months ?? 999));

  const maxMonths = recovering[recovering.length - 1]?.months ?? 1;

  return (
    <div className="space-y-4">
      {/* Cities at ATH */}
      {atATH.length > 0 && (
        <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-2xl p-4">
          <div className="text-emerald-400 font-bold text-sm mb-2">At or above All-Time High</div>
          <div className="flex flex-wrap gap-2">
            {atATH.map((s) => (
              <div key={s.city} className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold"
                style={{ borderColor: CITY_COLORS[s.city] + "60", color: CITY_COLORS[s.city], backgroundColor: CITY_COLORS[s.city] + "15" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                {s.city}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recovery timeline */}
      {recovering.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
          <h3 className="text-white font-bold text-base mb-1">Estimated Recovery Timeline</h3>
          <p className="text-slate-500 text-xs mb-5">
            Using 10Y CAGR as growth rate · assumes market resumes historical trend
          </p>
          <div className="space-y-4">
            {recovering.map((s) => {
              const color = CITY_COLORS[s.city];
              const pct   = s.months ? Math.min((s.months / Math.max(maxMonths, 1)) * 100, 100) : 100;
              const yrs   = s.months ? Math.floor(s.months / 12) : null;
              const mos   = s.months ? s.months % 12 : null;
              return (
                <div key={s.city}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-slate-200 text-sm font-semibold">{s.city}</span>
                      <span className="text-slate-600 text-xs">{s.from_peak_pct?.toFixed(1)}% from ATH</span>
                    </div>
                    <span className="text-slate-300 text-xs font-bold">
                      {s.months ? `~${yrs > 0 ? `${yrs}y ` : ""}${mos > 0 ? `${mos}m` : ""}` : "—"}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color + "cc" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recovering.length === 0 && atATH.length > 0 && (
        <div className="flex items-center justify-center h-32">
          <p className="text-slate-500 text-sm">All selected cities are at or above ATH</p>
        </div>
      )}
    </div>
  );
}

/* ── Main component ── */
export default function ChapterForecast({ data, selectedCities }) {
  const [section, setSection]   = useState("projection");
  const [horizon, setHorizon]   = useState(HORIZONS[1]);

  const summary  = data.summary;
  const timeline = data.combined_timeline;

  const selectedSummary = useMemo(
    () => summary.filter((s) => selectedCities.includes(s.city) && s.home_value != null),
    [summary, selectedCities]
  );

  const projections = useMemo(
    () => selectedSummary.map((s) => buildProjection(summary, timeline, s.city, horizon.months)).filter(Boolean),
    [selectedSummary, horizon, summary, timeline]
  );

  const chartData = useMemo(() => buildChartData(projections), [projections]);

  if (!selectedCities.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-sm">Select cities in the filter above to view projections</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Disclaimer */}
      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-4 py-2.5 flex items-center gap-3">
        <span className="text-amber-400 flex-shrink-0">⚠</span>
        <p className="text-amber-500 text-xs">
          <span className="text-amber-300 font-semibold">Statistical projections · not financial advice · </span>
          Based on historical CAGR and volatility. Always consult a licensed professional.
        </p>
      </div>

      {/* Controls row: section nav + horizon */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Section nav */}
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                section === s.id
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Horizon (only for projection + outlook) */}
        {section !== "recovery" && (
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-xs">Horizon</span>
            <div className="flex gap-1">
              {HORIZONS.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setHorizon(h)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    horizon.id === h.id
                      ? "bg-indigo-600 text-white"
                      : "text-slate-500 hover:text-slate-200 hover:bg-slate-700/40"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section description */}
      <p className="text-slate-500 text-xs -mt-1">
        {SECTIONS.find((s) => s.id === section)?.desc}
      </p>

      {/* Section content */}
      {section === "projection" && (
        <SectionProjection selectedSummary={selectedSummary} chartData={chartData} horizon={horizon} />
      )}
      {section === "outlook" && (
        <SectionOutlook selectedSummary={selectedSummary} horizon={horizon} />
      )}
      {section === "recovery" && (
        <SectionRecovery selectedSummary={selectedSummary} />
      )}

      <p className="text-slate-700 text-[10px] text-center pb-1">
        Compound growth (CAGR 10Y) · 80% CI = ±1.28σ√t · Annual vol capped at 5% (real estate benchmark) · Source: Redfin + Zillow Jan 2026
      </p>
    </div>
  );
}
