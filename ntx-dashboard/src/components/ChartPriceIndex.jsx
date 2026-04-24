import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { CITY_COLORS } from "./constants";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="text-slate-400 text-xs mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300 w-20">{p.dataKey.replace("_index", "")}:</span>
          <span className="text-white font-semibold">{p.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChartPriceIndex({ timeline, cities }) {
  // Rebase to 100 from the first visible point in the filtered timeline
  const rebased = timeline.map((row, i) => {
    const r = { date: row.date };
    cities.forEach((city) => {
      const key = `${city}_index`;
      const base = timeline[0]?.[key];
      if (base != null && row[key] != null) {
        r[key] = (row[key] / base) * 100;
      }
    });
    return r;
  });

  const sampled = rebased.filter((_, i) => i % 3 === 0);

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
      <div className="mb-4">
        <h2 className="text-white font-bold text-xl">Price Growth Index</h2>
        <p className="text-slate-400 text-sm mt-1">Base 100 = first point of selected period — shows relative appreciation across cities</p>
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
            tickFormatter={(v) => `${v.toFixed(0)}`}
            tick={{ fill: "#64748b", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "16px" }}
            formatter={(value) => (
              <span style={{ color: "#94a3b8", fontSize: 13 }}>
                {value.replace("_index", "")}
              </span>
            )}
          />
          <ReferenceLine y={100} stroke="#475569" strokeDasharray="4 4" label={{ value: "Base 100", fill: "#64748b", fontSize: 11, position: "left" }} />
          {cities.map((city) => (
            <Line
              key={city}
              type="monotone"
              dataKey={`${city}_index`}
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
