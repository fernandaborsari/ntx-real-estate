import { CITY_COLORS } from "./constants";

const PHASE_COLORS = {
  hot:          "#ef4444",
  appreciating: "#10b981",
  stable:       "#6366f1",
  stagnant:     "#94a3b8",
  cooling:      "#f59e0b",
  declining:    "#f97316",
  unknown:      "#64748b",
};

const PHASE_LABELS = {
  hot: "Hot", appreciating: "Growing", stable: "Stable",
  stagnant: "Flat", cooling: "Cooling", declining: "Declining", unknown: "—",
};

function fmt(val) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(val);
}

export default function SummaryCards({ summary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {summary.map((s) => {
        const color = CITY_COLORS[s.city] || "#6366f1";
        const isNeg = s.yoy_change_pct < 0;
        const phaseColor = PHASE_COLORS[s.market_phase] || "#64748b";
        const phaseLabel = PHASE_LABELS[s.market_phase] || "—";
        return (
          <div
            key={s.city}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-300 text-xs font-semibold truncate">{s.city}</span>
              </div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: phaseColor + "25", color: phaseColor }}
              >
                {phaseLabel}
              </span>
            </div>
            <p className="text-slate-500 text-[10px] mb-2">{s.county}</p>
            <p className="text-white font-bold text-base leading-tight">{fmt(s.home_value)}</p>
            <p className={`text-xs font-medium mt-1 ${isNeg ? "text-red-400" : "text-emerald-400"}`}>
              {isNeg ? "▼" : "▲"} {Math.abs(s.yoy_change_pct).toFixed(1)}% YoY
            </p>
            <div className="mt-2">
              <div className="text-slate-500 text-xs mb-0.5">Invest. Score</div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${s.investment_score * 100}%`, backgroundColor: color }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
