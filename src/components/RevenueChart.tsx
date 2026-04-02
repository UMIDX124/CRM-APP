"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RevenueDataPoint {
  month: string;
  vcs: number;
  brand2: number;
  brand3: number;
}

const data: RevenueDataPoint[] = [
  { month: "Oct", vcs: 85000, brand2: 42000, brand3: 28000 },
  { month: "Nov", vcs: 92000, brand2: 48000, brand3: 32000 },
  { month: "Dec", vcs: 88000, brand2: 45000, brand3: 35000 },
  { month: "Jan", vcs: 105000, brand2: 52000, brand3: 38000 },
  { month: "Feb", vcs: 112000, brand2: 58000, brand3: 42000 },
  { month: "Mar", vcs: 118000, brand2: 62000, brand3: 45000 },
];

const brandColors = {
  vcs: "#FF6B00",
  brand2: "#3B82F6",
  brand3: "#22C55E",
};

const brandNames = {
  vcs: "VCS",
  brand2: "BRAND_2",
  brand3: "BRAND_3",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload) return null;

  const total = payload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="bg-[#0f0f18] border border-white/20 rounded-xl p-4 shadow-2xl">
      <p className="text-white/60 text-sm mb-3 font-medium">{label} 2026</p>
      <div className="space-y-2">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-white/60 text-xs">{brandNames[entry.name as keyof typeof brandNames]}</span>
            </div>
            <span className="text-white font-medium text-sm">
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
        <span className="text-white/40 text-xs">Total</span>
        <span className="text-[#FF6B00] font-semibold text-sm">${total.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function RevenueChart() {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: "#FF6B00" }} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Revenue Overview</h3>
          <p className="text-sm text-white/40 mt-0.5">Last 6 months performance</p>
        </div>
        <div className="flex gap-4">
          {Object.entries(brandColors).map(([key, color]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-white/50">{brandNames[key as keyof typeof brandNames]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="vcsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={brandColors.vcs} stopOpacity={0.3} />
                <stop offset="95%" stopColor={brandColors.vcs} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="brand2Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={brandColors.brand2} stopOpacity={0.3} />
                <stop offset="95%" stopColor={brandColors.brand2} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="brand3Gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={brandColors.brand3} stopOpacity={0.3} />
                <stop offset="95%" stopColor={brandColors.brand3} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }}
              tickFormatter={(value) => `$${value / 1000}k`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="vcs"
              stroke={brandColors.vcs}
              strokeWidth={2}
              fill="url(#vcsGradient)"
              animationDuration={1500}
            />
            <Area
              type="monotone"
              dataKey="brand2"
              stroke={brandColors.brand2}
              strokeWidth={2}
              fill="url(#brand2Gradient)"
              animationDuration={1500}
              animationBegin={200}
            />
            <Area
              type="monotone"
              dataKey="brand3"
              stroke={brandColors.brand3}
              strokeWidth={2}
              fill="url(#brand3Gradient)"
              animationDuration={1500}
              animationBegin={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
