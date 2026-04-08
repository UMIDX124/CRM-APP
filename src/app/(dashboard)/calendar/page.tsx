"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckSquare, Briefcase, Clock, AlertCircle, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface CalTask { id: string; title: string; dueDate: string; priority: string; status: string; assignee: string; brand: string }
interface CalLead { id: string; companyName: string; createdAt: string; status: string }

// Narrow runtime type guards. These replace the previous optimistic
// `String(x.field || "")` casts, which silently produced garbage rows
// when the API shape drifts (e.g. `x.title` is an object instead of a
// string, or `x.assignee` is null instead of `{firstName, lastName}`).
// Rows that fail validation are DROPPED, not coerced — the UI renders
// what it can and logs the rest.
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return fallback;
}
function asDateYmd(v: unknown): string {
  if (typeof v !== "string" || !v) return "";
  // Accept ISO strings or already-YYYY-MM-DD — split at T handles both
  const s = v.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}
function parseTask(raw: unknown): CalTask | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;
  const assigneeObj = isRecord(raw.assignee) ? raw.assignee : null;
  const brandObj = isRecord(raw.brand) ? raw.brand : null;
  return {
    id,
    title: asString(raw.title),
    dueDate: asDateYmd(raw.dueDate),
    priority: asString(raw.priority, "MEDIUM"),
    status: asString(raw.status, "TODO"),
    assignee: assigneeObj
      ? `${asString(assigneeObj.firstName)} ${asString(assigneeObj.lastName)}`.trim()
      : "",
    brand: brandObj ? asString(brandObj.code) : "",
  };
}
function parseLead(raw: unknown): CalLead | null {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;
  return {
    id,
    companyName: asString(raw.companyName),
    createdAt: asDateYmd(raw.createdAt),
    status: asString(raw.status, "NEW"),
  };
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));
  const [tasks, setTasks] = useState<CalTask[]>([]);
  const [leads, setLeads] = useState<CalLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch("/api/tasks").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/leads").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([t, l]) => {
        if (cancelled) return;
        if (Array.isArray(t)) {
          const parsed = t
            .map(parseTask)
            .filter((x): x is CalTask => x !== null);
          if (parsed.length !== t.length) {
            console.warn(
              `[calendar] dropped ${t.length - parsed.length} malformed task rows`
            );
          }
          setTasks(parsed);
        }
        if (Array.isArray(l)) {
          const parsed = l
            .map(parseLead)
            .filter((x): x is CalLead => x !== null);
          if (parsed.length !== l.length) {
            console.warn(
              `[calendar] dropped ${l.length - parsed.length} malformed lead rows`
            );
          }
          setLeads(parsed);
        }
      })
      .catch((err) => {
        console.error("[calendar] fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      map[day].push({ type: "lead", title: l.companyName, color: "#F59E0B" });
    });
    return map;
  }, [tasks, leads]);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-[var(--foreground)]">{monthName}</h2>
        <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[var(--foreground-dim)]">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Critical Task</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> High Priority</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" /> Normal Task</div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Lead/Deal</div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface)]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-3 text-center text-xs font-medium text-[var(--foreground-dim)] uppercase tracking-wider">
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
                  "min-h-[100px] p-2 border-b border-r border-[var(--border-subtle)] transition-colors",
                  day ? "hover:bg-[var(--surface-hover)]" : "bg-[var(--background-secondary)]",
                  isWeekend && day ? "bg-[var(--background-secondary)]" : ""
                )}
              >
                {day && (
                  <>
                    <div className={clsx(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-sm mb-1",
                      isToday ? "bg-[#FF6B00] text-black font-bold" : "text-[var(--foreground-muted)]"
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
                        <p className="text-[10px] text-[var(--foreground-dim)] pl-1">+{dayEvents.length - 3} more</p>
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
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Upcoming Deadlines</h3>
        <div className="space-y-2">
          {tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "REVIEW").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] transition-colors">
              <div className="flex items-center gap-3">
                <div className={clsx("w-2 h-2 rounded-full", task.priority === "CRITICAL" ? "bg-red-400" : task.priority === "HIGH" ? "bg-amber-400" : "bg-cyan-400")} />
                <div>
                  <p className="text-sm text-[var(--foreground)]">{task.title}</p>
                  <p className="text-xs text-[var(--foreground-dim)]">{task.assignee} &bull; {task.brand}</p>
                </div>
              </div>
              <span className="text-xs text-[var(--foreground-dim)] font-mono">{task.dueDate}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
