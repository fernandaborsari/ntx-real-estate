import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { CITY_COLORS } from "./constants";

function fmt(v) {
  return `$${(v / 1000).toFixed(0)}k`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300 w-20">{p.dataKey}:</span>
          <span className="text-white font-semibold">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ChartHistorical({ timeline, cities }) {
  // Show only every 6th point for performance
  const sampled = timeline.filter((_, i) => i % 3 === 0);

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
      <div className="mb-4">
        <h2 className="text-white font-bold text-xl">Home Value Evolution</h2>
        <p className="text-slate-400 text-sm mt-1">Average median home values by city — all zip codes combined</p>
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={sampled} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
            tickFormatter={fmt}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "16px" }}
            formatter={(value) => <span style={{ color: "#94a3b8", fontSize: 13 }}>{value}</span>}
          />
          <ReferenceLine x="2008-09" stroke="#475569" strokeDasharray="4 4" label={{ value: "GFC", fill: "#64748b", fontSize: 11 }} />
          <ReferenceLine x="2020-03" stroke="#475569" strokeDasharray="4 4" label={{ value: "COVID", fill: "#64748b", fontSize: 11 }} />
          {cities.map((city) => (
            <Line
              key={city}
              type="monotone"
              dataKey={city}
              stroke={CITY_COLORS[city]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
