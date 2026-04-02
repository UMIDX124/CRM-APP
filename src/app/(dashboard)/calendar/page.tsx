"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckSquare, Briefcase, Clock, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { tasks, leads } from "@/data/mock-data";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // April 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(2026, 3, 2); // April 2

  const navigate = (dir: number) => {
    setCurrentDate(new Date(year, month + dir, 1));
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Map tasks and leads to dates
  const events = useMemo(() => {
    const map: Record<string, { type: string; title: string; color: string; priority?: string }[]> = {};
    tasks.forEach((t) => {
      const day = t.dueDate;
      if (!map[day]) map[day] = [];
      map[day].push({
        type: "task",
        title: t.title,
        color: t.priority === "CRITICAL" ? "#EF4444" : t.priority === "HIGH" ? "#F59E0B" : "#0EA5E9",
        priority: t.priority,
      });
    });
    leads.forEach((l) => {
      const day = l.createdAt;
      if (!map[day]) map[day] = [];
      map[day].push({ type: "lead", title: l.companyName, color: "#8B5CF6" });
    });
    return map;
  }, []);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-white">{monthName}</h2>
        <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-white/50">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Critical Task</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> High Priority</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" /> Normal Task</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" /> Lead/Deal</div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-3 text-center text-xs font-medium text-white/40 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
            const dayEvents = day ? events[dateStr] || [] : [];
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isWeekend = i % 7 === 0 || i % 7 === 6;

            return (
              <div
                key={i}
                className={clsx(
                  "min-h-[100px] p-2 border-b border-r border-white/[0.04] transition-colors",
                  day ? "hover:bg-white/[0.02]" : "bg-white/[0.01]",
                  isWeekend && day ? "bg-white/[0.01]" : ""
                )}
              >
                {day && (
                  <>
                    <div className={clsx(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-sm mb-1",
                      isToday ? "bg-[#FF6B00] text-black font-bold" : "text-white/60"
                    )}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((evt, j) => (
                        <div
                          key={j}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: evt.color + "15", color: evt.color }}
                        >
                          {evt.type === "task" ? <CheckSquare className="w-2.5 h-2.5 shrink-0" /> : <Briefcase className="w-2.5 h-2.5 shrink-0" />}
                          <span className="truncate">{evt.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-[10px] text-white/30 pl-1">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming */}
      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white mb-3">Upcoming Deadlines</h3>
        <div className="space-y-2">
          {tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "REVIEW").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center gap-3">
                <div className={clsx("w-2 h-2 rounded-full", task.priority === "CRITICAL" ? "bg-red-400" : task.priority === "HIGH" ? "bg-amber-400" : "bg-cyan-400")} />
                <div>
                  <p className="text-sm text-white">{task.title}</p>
                  <p className="text-xs text-white/40">{task.assignee} &bull; {task.brand}</p>
                </div>
              </div>
              <span className="text-xs text-white/50 font-mono">{task.dueDate}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
