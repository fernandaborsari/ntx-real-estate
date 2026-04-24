import { useState } from "react";
import { CITY_COLORS, PHASE_CONFIG, COUNTY_PRESETS } from "./constants";

const fmtUsd = (v) =>
  v != null ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v) : "—";
const fmtPct = (v) => (v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—");

function Tip({ label, tip }) {
  return (
    <span className="relative group inline-flex items-center gap-0.5 cursor-default">
      <span>{label}</span>
      <span className="text-slate-600 text-[9px]">?</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-44 bg-slate-700 border border-slate-600 text-slate-200 text-[11px] leading-snug rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
        {tip}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-600" />
      </span>
    </span>
  );
}

const METRIC_TIPS = {
  YoY: "Year over Year — price change compared to the same month last year.",
  "3m": "3-month momentum — average of recent monthly changes. Reflects short-term trend direction.",
  ATH: "Distance from All-Time High — how far the current price is from its historical peak. Negative = still below the peak.",
  Phase: "Market phase based on 3-month momentum: Hot, Appreciating, Stable, Stagnant, Cooling, Declining.",
  CAGR: "Compound Annual Growth Rate — annualized growth rate over the last 10 years.",
  Ratio: "Return-to-volatility ratio — CAGR divided by monthly volatility. Higher = better risk-adjusted return.",
};

function InsightBanner({ summary }) {
  if (!summary.length) return null;

  const sorted = [...summary].sort((a, b) => b.yoy_change_pct - a.yoy_change_pct);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const hotCount = summary.filter((s) => s.market_phase === "hot").length;
  const growCount = summary.filter((s) => s.yoy_change_pct > 0).length;
  const declCount = summary.filter((s) => ["declining", "cooling"].includes(s.market_phase)).length;
  const avgYoy = summary.reduce((acc, s) => acc + (s.yoy_change_pct ?? 0), 0) / summary.length;

  let mainText = "";
  if (hotCount >= 3) {
    mainText = `NTX market running hot — ${hotCount} cities in expansion, ${best.city} leads at ${fmtPct(best.yoy_change_pct)} YoY`;
  } else if (growCount > summary.length / 2) {
    mainText = `Moderate growth across NTX — ${growCount} of ${summary.length} cities with positive YoY · avg ${fmtPct(avgYoy)}`;
  } else {
    mainText = `NTX market in broad correction — ${declCount} cities cooling, avg YoY at ${fmtPct(avgYoy)}`;
  }

  const subText = `Top performer: ${best.city} ${fmtPct(best.yoy_change_pct)} · Biggest drop: ${worst.city} ${fmtPct(worst.yoy_change_pct)} · Data: Jan 2026`;

  return (
    <div className="bg-gradient-to-r from-indigo-900/50 via-slate-800/40 to-slate-800/20 border border-indigo-700/30 rounded-xl px-4 py-3">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-1" />
        <div>
          <p className="text-white font-bold text-sm leading-snug">{mainText}</p>
          <p className="text-slate-400 text-xs mt-0.5">{subText}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-700/40">
        {[
          { label: "Cities", value: summary.length },
          { label: "Growing", value: `${growCount}/${summary.length}`, color: "text-emerald-400" },
          { label: "Cooling", value: `${declCount}`, color: declCount > 0 ? "text-amber-400" : "text-slate-400" },
          { label: "Avg YoY", value: fmtPct(avgYoy), color: avgYoy > 0 ? "text-emerald-400" : "text-red-400" },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-slate-500 text-[10px] uppercase tracking-wider">{label}</p>
            <p className={`font-bold text-sm ${color || "text-white"}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvestmentSignals({ summary }) {
  if (!summary.length) return null;

  const dipOpportunities = [...summary]
    .filter((s) => s.cagr_10y != null && s.from_peak_pct < -3 && s.cagr_10y >= 5)
    .sort((a, b) => b.cagr_10y - a.cagr_10y)
    .slice(0, 3);

  const momentum = [...summary]
    .filter((s) => s.yoy_change_pct > 0 && s.rolling_3m > 0)
    .sort((a, b) => b.rolling_3m - a.rolling_3m)
    .slice(0, 3);

  const caution = [...summary]
    .filter((s) => s.from_peak_pct >= -2 && s.rolling_3m < 0)
    .slice(0, 3);

  const riskAdjusted = [...summary]
    .filter((s) => s.cagr_10y != null && s.volatility_monthly != null)
    .map((s) => ({ ...s, ratio: s.cagr_10y / s.volatility_monthly }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3);

  const SIGNALS = [
    {
      id: "dip",
      icon: "📉",
      title: <Tip label="Buy the Dip" tip="Cities with strong 10Y CAGR (≥5%) currently in correction (below ATH). Potential discounted entry point." />,
      subtitle: "Strong 10Y CAGR · Currently in correction",
      border: "border-indigo-700/40",
      bg: "bg-indigo-900/20",
      headerColor: "text-indigo-300",
      items: dipOpportunities,
      empty: "No cities with strong history in correction",
      renderItem: (s) => (
        <div key={s.city} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-700/30 last:border-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
            <span className="text-slate-200 font-medium truncate">{s.city}</span>
          </div>
          <div className="flex flex-col items-end flex-shrink-0 ml-1">
            <span className="text-amber-400 font-semibold">{fmtPct(s.from_peak_pct)}</span>
            <span className="text-emerald-400">{s.cagr_10y.toFixed(1)}%</span>
          </div>
        </div>
      ),
    },
    {
      id: "momentum",
      icon: "🚀",
      title: <Tip label="Strong Momentum" tip="Cities with positive YoY AND accelerating 3-month trend. Actively growing market." />,
      subtitle: "Positive YoY + accelerating 3m trend",
      border: "border-emerald-700/40",
      bg: "bg-emerald-900/20",
      headerColor: "text-emerald-300",
      items: momentum,
      empty: "No cities with positive momentum",
      renderItem: (s) => (
        <div key={s.city} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-700/30 last:border-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
            <span className="text-slate-200 font-medium truncate">{s.city}</span>
          </div>
          <div className="flex flex-col items-end flex-shrink-0 ml-1">
            <span className="text-emerald-400 font-semibold">{fmtPct(s.yoy_change_pct)}</span>
            <span className="text-sky-400">{fmtPct(s.rolling_3m)} 3m</span>
          </div>
        </div>
      ),
    },
    {
      id: "risk",
      icon: "🏆",
      title: <Tip label="Best Risk-Adjusted" tip="CAGR divided by monthly volatility. Cities with the highest historical return per unit of risk." />,
      subtitle: "Highest return-to-volatility ratio",
      border: "border-sky-700/40",
      bg: "bg-sky-900/20",
      headerColor: "text-sky-300",
      items: riskAdjusted,
      empty: "Not enough data",
      renderItem: (s) => (
        <div key={s.city} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-700/30 last:border-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
            <span className="text-slate-200 font-medium truncate">{s.city}</span>
          </div>
          <div className="flex flex-col items-end flex-shrink-0 ml-1">
            <span className="text-emerald-400 font-semibold">{s.cagr_10y.toFixed(1)}%</span>
            <span className="text-indigo-300">{s.ratio.toFixed(1)}x</span>
          </div>
        </div>
      ),
    },
    {
      id: "caution",
      icon: "⚠️",
      title: <Tip label="Watch List" tip="Cities near their all-time high with fading momentum. Caution signal — may be at the top of the cycle." />,
      subtitle: "Near ATH · Momentum fading",
      border: "border-amber-700/40",
      bg: "bg-amber-900/20",
      headerColor: "text-amber-300",
      items: caution,
      empty: "No caution signals at this time",
      renderItem: (s) => (
        <div key={s.city} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-700/30 last:border-0">
          <div className="flex items-center gap-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
            <span className="text-slate-200 font-medium truncate">{s.city}</span>
          </div>
          <div className="flex flex-col items-end flex-shrink-0 ml-1">
            <span className="text-emerald-400 font-semibold">{fmtPct(s.from_peak_pct)}</span>
            <span className="text-red-400">{fmtPct(s.rolling_3m)} 3m</span>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
        <h3 className="text-white font-bold text-sm">Investment Signals</h3>
        <span className="text-slate-500 text-xs">All {summary.length} cities · CAGR · momentum · ATH</span>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
        {SIGNALS.map((sig) => (
          <div key={sig.id} className={`border rounded-xl p-3 ${sig.border} ${sig.bg}`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm">{sig.icon}</span>
              <span className={`font-bold text-xs ${sig.headerColor}`}>{sig.title}</span>
            </div>
            <p className="text-slate-500 text-[10px] mb-2">{sig.subtitle}</p>
            {sig.items.length > 0
              ? sig.items.map(sig.renderItem)
              : <p className="text-slate-600 text-xs italic">{sig.empty}</p>
            }
          </div>
        ))}
      </div>
      <p className="text-slate-600 text-[10px] mt-1">
        Data-driven indicators, not financial advice. Always conduct your own due diligence.
      </p>
    </div>
  );
}

function CompactCityCard({ s }) {
  const cfg = PHASE_CONFIG[s.market_phase] || PHASE_CONFIG.unknown;
  const yoyColor = s.yoy_change_pct > 0 ? "text-emerald-400" : "text-red-400";
  const momColor = s.rolling_3m > 0 ? "text-emerald-400" : "text-red-400";
  const athColor = s.from_peak_pct >= -1 ? "text-emerald-400" : "text-amber-400";
  return (
    <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/40 hover:border-slate-600 transition-all">
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
          <span className="text-white font-semibold text-xs truncate">{s.city}</span>
        </div>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ color: cfg.color, backgroundColor: cfg.color + "20" }}
        >
          {cfg.label}
        </span>
      </div>
      <p className="text-slate-500 text-[10px] mb-1">{s.county}</p>
      <p className="text-white font-bold text-sm">{fmtUsd(s.home_value)}</p>
      <div className="grid grid-cols-3 gap-1 mt-2">
        {[
          { label: "YoY", value: fmtPct(s.yoy_change_pct), color: yoyColor },
          { label: "3m",  value: fmtPct(s.rolling_3m),     color: momColor },
          { label: "ATH", value: fmtPct(s.from_peak_pct),  color: athColor },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <p className="text-slate-600 text-[9px]">
              <Tip label={label} tip={METRIC_TIPS[label]} />
            </p>
            <p className={`font-semibold text-[11px] ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChapterMercado({ summary, selectedCities, allCities, applyPreset, setSelectedCities }) {
  const [phaseFilter, setPhaseFilter] = useState(null);

  // Insights always use ALL cities
  // City cards use the county filter selection
  const filtered = selectedCities.length
    ? summary.filter((s) => selectedCities.includes(s.city))
    : summary;

  const phaseOrder = ["hot", "appreciating", "recovering", "stable", "stagnant", "cooling", "declining", "unknown"];
  const sorted = [...filtered].sort((a, b) => b.yoy_change_pct - a.yoy_change_pct);

  // Apply phase filter on top of county filter for city cards
  const visibleCards = phaseFilter
    ? filtered.filter((s) => (s.market_phase || "unknown") === phaseFilter)
    : filtered;

  const sortedByPhase = [...visibleCards].sort(
    (a, b) => phaseOrder.indexOf(a.market_phase) - phaseOrder.indexOf(b.market_phase)
  );

  const phaseCounts = {};
  filtered.forEach((s) => {
    const p = s.market_phase || "unknown";
    phaseCounts[p] = (phaseCounts[p] || 0) + 1;
  });

  return (
    <div className="space-y-3">
      {/* ── TOP: Insight banner (all cities) ── */}
      <InsightBanner summary={summary} />

      {/* ── TOP: Investment Signals (all cities) ── */}
      <InvestmentSignals summary={summary} />

      {/* ── County filter — controls cards below ── */}
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mr-0.5">County</span>
          <button
            onClick={() => setSelectedCities([...allCities])}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
              selectedCities.length === allCities.length ? "bg-indigo-600 text-white" : "bg-slate-700/50 text-slate-400 hover:text-slate-200"
            }`}
          >All</button>
          {COUNTY_PRESETS.map((p) => {
            const valid = p.cities.filter((c) => allCities.includes(c));
            const active = valid.length > 0 && valid.every((c) => selectedCities.includes(c));
            return (
              <button
                key={p.label}
                onClick={() => { applyPreset(p.cities); setPhaseFilter(null); }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                  active ? "bg-indigo-600/80 text-white" : "bg-slate-700/50 text-slate-400 hover:text-slate-200"
                }`}
              >{p.label}</button>
            );
          })}
          <button onClick={() => { setSelectedCities([]); setPhaseFilter(null); }} className="px-1.5 py-0.5 rounded text-[10px] text-slate-600 hover:text-slate-400">Clear</button>
          <div className="ml-auto">
            <span className="text-slate-600 text-[10px]">{selectedCities.length}/{allCities.length} cities</span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: City cards filtered by county ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Phase distribution + top/bottom */}
        <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 flex flex-col gap-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-sm">Market Phase</h3>
              {phaseFilter && (
                <button
                  onClick={() => setPhaseFilter(null)}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 transition-all"
                >
                  <span style={{ color: PHASE_CONFIG[phaseFilter]?.color }}>
                    {PHASE_CONFIG[phaseFilter]?.label}
                  </span>
                  <span className="text-slate-500 ml-0.5">✕</span>
                </button>
              )}
            </div>
            <p className="text-slate-600 text-[10px] mb-2">Click a phase to filter cities</p>
            <div className="space-y-1.5">
              {phaseOrder.filter((p) => phaseCounts[p]).map((phase) => {
                const cfg = PHASE_CONFIG[phase];
                const count = phaseCounts[phase];
                const pct = (count / filtered.length) * 100;
                const isActive = phaseFilter === phase;
                const isDimmed = phaseFilter && !isActive;
                return (
                  <button
                    key={phase}
                    onClick={() => setPhaseFilter(isActive ? null : phase)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2 py-1 transition-all text-left ${
                      isActive
                        ? "bg-slate-700/60 ring-1"
                        : isDimmed
                        ? "opacity-40 hover:opacity-70"
                        : "hover:bg-slate-700/30"
                    }`}
                    style={isActive ? { ringColor: cfg.color + "60" } : {}}
                  >
                    <span className="text-[11px] font-semibold w-24 flex-shrink-0" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: cfg.color + (isActive ? "ee" : "90") }}
                      />
                    </div>
                    <span
                      className="text-xs w-4 text-right font-bold flex-shrink-0"
                      style={{ color: isActive ? cfg.color : "#94a3b8" }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-wider mb-2">↑ YoY gain</p>
              {sorted.filter((s) => s.yoy_change_pct > 0).slice(0, 4).map((s) => (
                <div key={s.city} className="flex justify-between items-center text-xs py-1 border-b border-slate-700/30">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                    <span className="text-slate-300 truncate">{s.city}</span>
                  </span>
                  <span className="text-emerald-400 font-semibold ml-1">{fmtPct(s.yoy_change_pct)}</span>
                </div>
              ))}
              {sorted.filter((s) => s.yoy_change_pct > 0).length === 0 && (
                <p className="text-slate-600 text-xs italic">No cities</p>
              )}
            </div>
            <div>
              <p className="text-red-400 text-[10px] font-semibold uppercase tracking-wider mb-2">↓ YoY drop</p>
              {[...sorted].reverse().filter((s) => s.yoy_change_pct < 0).slice(0, 4).map((s) => (
                <div key={s.city} className="flex justify-between items-center text-xs py-1 border-b border-slate-700/30">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CITY_COLORS[s.city] }} />
                    <span className="text-slate-300 truncate">{s.city}</span>
                  </span>
                  <span className="text-red-400 font-semibold ml-1">{fmtPct(s.yoy_change_pct)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Compact city cards */}
        <div
          className="lg:col-span-3 bg-slate-800/60 border rounded-2xl p-4 transition-all"
          style={{
            borderColor: phaseFilter
              ? (PHASE_CONFIG[phaseFilter]?.color + "50")
              : "rgb(51 65 85 / 0.5)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold text-sm">
              {phaseFilter ? (
                <>
                  <span style={{ color: PHASE_CONFIG[phaseFilter]?.color }}>
                    {PHASE_CONFIG[phaseFilter]?.label}
                  </span>
                  <span className="text-slate-500 font-normal text-xs ml-2">
                    {sortedByPhase.length} {sortedByPhase.length === 1 ? "city" : "cities"}
                  </span>
                </>
              ) : (
                <>
                  Snapshot — Jan 2026
                  <span className="text-slate-500 font-normal text-xs ml-2">YoY · 3m · ATH</span>
                </>
              )}
            </h3>
            {phaseFilter && (
              <span className="text-slate-600 text-[10px]">
                {filtered.length - sortedByPhase.length} hidden by phase filter
              </span>
            )}
          </div>
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-sm">No cities selected</p>
          ) : sortedByPhase.length === 0 ? (
            <p className="text-slate-500 text-sm">No cities match this phase in the current county selection</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sortedByPhase.map((s) => (
                <CompactCityCard key={s.city} s={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
