import { useState, useEffect, useCallback } from "react";
import ChapterMercado from "./components/ChapterMercado";
import ChapterPerformance from "./components/ChapterPerformance";
import ChapterExplorar from "./components/ChapterExplorar";
import ChapterForecast from "./components/ChapterForecast";
import Footer from "./components/Footer";
import Filters from "./components/Filters";
import { CITY_COLORS, COUNTY_PRESETS } from "./components/constants";
import "./index.css";


const TABS = [
  {
    id: "mercado",
    label: "Market Pulse",
    question: "Where are we now?",
    icon: "📍",
  },
  {
    id: "performance",
    label: "Performance",
    question: "Where is the best return?",
    icon: "🏆",
  },
  {
    id: "explorar",
    label: "Explore",
    question: "Your analysis, your rules",
    icon: "🔍",
  },
  {
    id: "forecast",
    label: "Forecast",
    question: "Statistical projections",
    icon: "🔮",
  },
];

export default function App() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("mercado");
  // selectedCities → Performance / Explore / Forecast tabs
  const [selectedCities, setSelectedCities] = useState([]);
  // mercadoCities → Market Pulse tab only (independent)
  const [mercadoCities, setMercadoCities] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    fetch("/ntx_data.json")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        const defaults = ["Southlake", "Frisco", "McKinney", "Plano", "Irving", "Arlington"];
        const filtered = defaults.filter((c) => d.cities.includes(c));
        setSelectedCities(filtered);
        const curated = d.cities.filter((c) => CITY_COLORS[c]);
        setMercadoCities(curated); // Market Pulse starts with the 18 curated cities
      })
      .catch(console.error);
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading market data…</p>
        </div>
      </div>
    );
  }

  function toggleCity(city) {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }

  // Preset for Performance / Explore / Forecast
  function applyPreset(cities) {
    const valid = cities.filter((c) => data.cities.includes(c));
    const exact = valid.length === selectedCities.length && valid.every((c) => selectedCities.includes(c));
    setSelectedCities(exact ? [] : valid);
  }

  // Preset for Market Pulse (independent) — only curated 18 cities
  function applyMercadoPreset(cities) {
    const curated = data.cities.filter((c) => CITY_COLORS[c]);
    const valid = cities.filter((c) => curated.includes(c));
    const exact = valid.length === mercadoCities.length && valid.every((c) => mercadoCities.includes(c));
    setMercadoCities(exact ? [] : valid);
  }

  const activeTabData = TABS.find((t) => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-4">

        {/* ── Top bar: logo + tabs + filter in one row ── */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-1 h-6 bg-indigo-500 rounded-full" />
            <span className="text-white font-extrabold text-base tracking-tight">
              NTX <span className="text-indigo-400">RE</span>
            </span>
            <span className="text-slate-600 text-[10px] hidden sm:block">· Jan 2026</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  activeTab === tab.id
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <span className="text-indigo-200 text-[9px] hidden sm:block">· {tab.question}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── City filter bar (hidden on Market Pulse — filter lives inside that tab) ── */}
        {/* Only show the 18 curated cities (those that have a color in CITY_COLORS) */}
        {activeTab !== "mercado" && (
          <Filters
            allCities={data.cities.filter((c) => CITY_COLORS[c])}
            selectedCities={selectedCities}
            onCitiesChange={setSelectedCities}
            timeRangeDisabled={true}
          />
        )}

        {/* Chapter content */}
        <div>
          {activeTab === "mercado" && (
            <ChapterMercado
              summary={data.summary}
              selectedCities={mercadoCities}
              allCities={data.cities.filter((c) => CITY_COLORS[c])}
              applyPreset={applyMercadoPreset}
              setSelectedCities={setMercadoCities}
            />
          )}
          {activeTab === "performance" && (
            <ChapterPerformance
              summary={data.summary}
              selectedCities={selectedCities}
            />
          )}
          {activeTab === "explorar" && (
            <ChapterExplorar
              data={data}
              selectedCities={selectedCities}
            />
          )}
          {activeTab === "forecast" && (
            <ChapterForecast
              data={data}
              selectedCities={selectedCities}
            />
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}
