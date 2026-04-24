export const PHASE_CONFIG = {
  hot:          { label: "Hot",          color: "#ef4444" },
  appreciating: { label: "Appreciating", color: "#10b981" },
  recovering:   { label: "Recovering",   color: "#06b6d4" },
  stable:       { label: "Stable",       color: "#6366f1" },
  stagnant:     { label: "Stagnant",     color: "#94a3b8" },
  cooling:      { label: "Cooling",      color: "#f59e0b" },
  declining:    { label: "Declining",    color: "#f97316" },
  unknown:      { label: "Unknown",      color: "#64748b" },
};

export const CITY_COLORS = {
  // Premium
  Prosper:       "#f472b6",  // pink
  Celina:        "#22d3ee",  // cyan
  Frisco:        "#8b5cf6",  // purple
  Southlake:     "#ec4899",  // hot pink
  "Flower Mound":"#7dd3fc",  // sky blue
  // Mid-tier growing
  McKinney:      "#6366f1",  // indigo
  Allen:         "#06b6d4",  // cyan dark
  Melissa:       "#fda4af",  // rose
  Rockwall:      "#fb7185",  // rose
  "Little Elm":  "#818cf8",  // indigo light
  // Established
  Plano:         "#a78bfa",  // violet
  Richardson:    "#38bdf8",  // sky
  Keller:        "#d8b4fe",  // violet light
  Carrollton:    "#f9a8d4",  // pink light
  Lewisville:    "#60a5fa",  // blue
  // Value / high density
  Denton:        "#94a3b8",  // slate
  Irving:        "#c084fc",  // purple light
  Arlington:     "#a5b4fc",  // indigo light
};

export const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export const COUNTY_PRESETS = [
  { label: "Collin",   cities: ["Frisco","McKinney","Allen","Plano","Prosper","Celina","Melissa"] },
  { label: "Denton",   cities: ["Flower Mound","Lewisville","Little Elm","Carrollton","Denton"] },
  { label: "Tarrant",  cities: ["Southlake","Keller","Arlington"] },
  { label: "Dallas",   cities: ["Richardson","Irving"] },
  { label: "Rockwall", cities: ["Rockwall"] },
];
