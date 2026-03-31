"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { clsx } from "clsx";

const serviceTypes = [
  { name: "SEO & Content", revenue: 185000, percentage: 35, color: "#D4AF37" },
  { name: "PPC & Ads", revenue: 142000, percentage: 27, color: "#3B82F6" },
  { name: "Virtual Workforce", revenue: 98000, percentage: 18, color: "#22C55E" },
  { name: "Web Development", revenue: 76000, percentage: 14, color: "#8B5CF6" },
  { name: "Cloud & Security", revenue: 32000, percentage: 6, color: "#F59E0B" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      revenue: number;
      percentage: number;
      color: string;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.[0]) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-[#0f0f18] border border-white/20 rounded-xl p-3 shadow-2xl">
      <p className="text-white font-medium text-sm">{payload[0].name}</p>
      <p className="text-white/60 text-xs mt-1">${data.revenue.toLocaleString()}</p>
      <p className="text-white/40 text-xs">{data.percentage}% of total</p>
    </div>
  );
}

export default function ServiceBreakdown() {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 p-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -left-20 -top-20 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: "#3B82F6" }} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Revenue by Service</h3>
          <p className="text-sm text-white/40 mt-0.5">Distribution breakdown</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-[#D4AF37]">$533K</p>
          <p className="text-xs text-white/40">Total Revenue</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Pie Chart */}
        <div className="relative w-[180px] h-[180px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={serviceTypes}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="revenue"
                animationDuration={1200}
                animationBegin={200}
              >
                {serviceTypes.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                    style={{
                      filter: "drop-shadow(0 0 8px rgba(212, 175, 55, 0.3))",
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-white/40">Best</span>
            <span className="text-sm font-semibold text-[#D4AF37]">SEO</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3">
          {serviceTypes.map((service, index) => (
            <div key={service.name} className="group cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: service.color }}
                  />
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                    {service.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-white">
                    ${(service.revenue / 1000).toFixed(0)}K
                  </span>
                  <span className="text-xs text-white/40 ml-2">{service.percentage}%</span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${service.percentage}%`,
                    backgroundColor: service.color,
                    transitionDelay: `${index * 100}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
