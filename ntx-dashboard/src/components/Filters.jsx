import { useState } from "react";
import { CITY_COLORS } from "./constants";

const TIME_RANGES = [
  { id: "all", label: "All" },
  { id: "15y", label: "15Y" },
  { id: "10y", label: "10Y" },
  { id: "5y",  label: "5Y"  },
  { id: "2y",  label: "2Y"  },
];

const COUNTY_PRESETS = [
  { label: "Collin Co.",   cities: ["Frisco","McKinney","Allen","Plano","Prosper","Celina","Melissa"] },
  { label: "Denton Co.",   cities: ["Flower Mound","Lewisville","Little Elm","Carrollton","Denton"] },
  { label: "Tarrant Co.",  cities: ["Southlake","Keller","Arlington"] },
  { label: "Dallas Co.",   cities: ["Richardson","Irving"] },
  { label: "Rockwall Co.", cities: ["Rockwall"] },
];

export default function Filters({
  allCities, selectedCities, onCitiesChange,
  timeRange, onTimeRangeChange, timeRangeDisabled,
}) {
  const [collapsed, setCollapsed] = useState(false);

  function toggleCity(city) {
    if (selectedCities.includes(city)) {
      onCitiesChange(selectedCities.filter((c) => c !== city));
    } else {
      onCitiesChange([...selectedCities, city]);
    }
  }

  function applyPreset(cities) {
    const alreadyExact =
      cities.length === selectedCities.length &&
      cities.every((c) => selectedCities.includes(c));
    if (alreadyExact) {
      onCitiesChange([]);
    } else {
      onCitiesChange([...cities]);
    }
  }

  function isPresetActive(cities) {
    return cities.every((c) => selectedCities.includes(c));
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3 mb-6">

      {/* Header row: always visible */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider mr-1">County</span>
          <button
            onClick={() => onCitiesChange([...allCities])}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedCities.length === allCities.length
                ? "bg-indigo-600 text-white"
                : "bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
            }`}
          >
            All
          </button>
          {COUNTY_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.cities.filter((c) => allCities.includes(c)))}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isPresetActive(p.cities.filter((c) => allCities.includes(c)))
                  ? "bg-indigo-600/80 text-white"
                  : "bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => onCitiesChange([])}
            className="px-2 py-1 rounded-lg text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Clear
          </button>
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 transition-all flex-shrink-0"
        >
          <span>{selectedCities.length}/{allCities.length}</span>
          <span className="text-[10px]">{collapsed ? "▼" : "▲"}</span>
        </button>
      </div>

      {/* Collapsible section */}
      {!collapsed && (
        <div className="mt-3 space-y-3">
          {/* Time range */}
          {!timeRangeDisabled && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Period</span>
              <div className="flex gap-1">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onTimeRangeChange?.(r.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      timeRange === r.id
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Individual city chips */}
          <div className="flex flex-wrap gap-1.5">
            {allCities.map((city) => {
              const active = selectedCities.includes(city);
              const color = CITY_COLORS[city];
              return (
                <button
                  key={city}
                  onClick={() => toggleCity(city)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${
                    active ? "opacity-100" : "opacity-40 hover:opacity-70"
                  }`}
                  style={
                    active
                      ? { backgroundColor: color + "20", color, borderColor: color + "60" }
                      : { backgroundColor: "transparent", color: "#94a3b8", borderColor: "#334155" }
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: active ? color : "#64748b" }}
                  />
                  {city}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
