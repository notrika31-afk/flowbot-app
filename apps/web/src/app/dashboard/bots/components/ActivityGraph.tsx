"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const mockData = {
  7: [
    { day: "א׳", value: 42 },
    { day: "ב׳", value: 58 },
    { day: "ג׳", value: 37 },
    { day: "ד׳", value: 61 },
    { day: "ה׳", value: 49 },
    { day: "ו׳", value: 22 },
    { day: "ש׳", value: 15 },
  ],
  14: Array.from({ length: 14 }).map((_, i) => ({
    day: `יום ${i + 1}`,
    value: Math.floor(20 + Math.random() * 80),
  })),
  30: Array.from({ length: 30 }).map((_, i) => ({
    day: `יום ${i + 1}`,
    value: Math.floor(20 + Math.random() * 110),
  })),
};

export default function ActivityGraph() {
  const [range, setRange] = useState<7 | 14 | 30>(7);

  return (
    <div className="w-full bg-[#0A0A0A]/70 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">פעילות אחרונה</h2>

        <div className="flex gap-2">
          {[7, 14, 30].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r as any)}
              className={`px-3 py-1 rounded-lg text-sm transition ${
                range === r
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {r} ימים
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData[range]}>
            <defs>
              <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis dataKey="day" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip
              contentStyle={{
                background: "rgba(0,0,0,0.7)",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                direction: "rtl",
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366F1"
              strokeWidth={3}
              fill="url(#colorPv)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}