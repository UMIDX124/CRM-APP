"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, LayoutDashboard, Building2, Users, CheckSquare, Briefcase,
  BarChart3, ClipboardCheck, Settings, ArrowRight, Hash, Command,
  Moon, Sun, LogOut, FileText, Calendar, Bell, Zap, X,
} from "lucide-react";
import { clsx } from "clsx";
import { employees, clients, tasks, leads, brands } from "@/data/mock-data";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof Search;
  category: string;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const navigate = useCallback((path: string) => {
    router.push(path);
    setOpen(false);
  }, [router]);

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // Navigation
    items.push(
      { id: "nav-dash", label: "Dashboard", description: "Overview & KPIs", icon: LayoutDashboard, category: "Navigation", action: () => navigate("/"), keywords: ["home", "overview"] },
      { id: "nav-clients", label: "Clients", description: "Client management", icon: Building2, category: "Navigation", action: () => navigate("/clients"), keywords: ["contacts", "customers"] },
      { id: "nav-team", label: "Team", description: "Employee directory", icon: Users, category: "Navigation", action: () => navigate("/employees"), keywords: ["employees", "staff", "people"] },
      { id: "nav-tasks", label: "Tasks", description: "Task management", icon: CheckSquare, category: "Navigation", action: () => navigate("/tasks"), keywords: ["todo", "kanban"] },
      { id: "nav-pipeline", label: "Pipeline", description: "Sales pipeline", icon: Briefcase, category: "Navigation", action: () => navigate("/pipeline"), keywords: ["deals", "sales", "leads"] },
      { id: "nav-attendance", label: "Attendance", description: "Staff attendance", icon: ClipboardCheck, category: "Navigation", action: () => navigate("/attendance"), keywords: ["checkin", "presence"] },
      { id: "nav-reports", label: "Reports", description: "Analytics & exports", icon: BarChart3, category: "Navigation", action: () => navigate("/reports"), keywords: ["analytics", "export"] },
    );

    // Search employees
    employees.forEach((emp) => {
      items.push({
        id: `emp-${emp.id}`, label: emp.name, description: `${emp.title} · ${emp.brand}`,
        icon: Users, category: "Employees", action: () => navigate("/employees"),
        keywords: [emp.email, emp.department, emp.brand],
      });
    });

    // Search clients
    clients.forEach((c) => {
      items.push({
        id: `client-${c.id}`, label: c.companyName, description: `${c.contactName} · ${c.brand} · $${(c.mrr || 0).toLocaleString()}/mo`,
        icon: Building2, category: "Clients", action: () => navigate("/clients"),
        keywords: [c.contactName, c.email, c.brand],
      });
    });

    // Search tasks
    tasks.forEach((t) => {
      items.push({
        id: `task-${t.id}`, label: t.title, description: `${t.assignee} · ${t.status} · ${t.brand}`,
        icon: CheckSquare, category: "Tasks", action: () => navigate("/tasks"),
        keywords: [t.assignee, t.client, t.status],
      });
    });

    // Search leads
    leads.forEach((l) => {
      items.push({
        id: `lead-${l.id}`, label: l.companyName, description: `${l.contactName} · $${l.value.toLocaleString()} · ${l.status}`,
        icon: Briefcase, category: "Leads", action: () => navigate("/pipeline"),
        keywords: [l.contactName, l.salesRep, l.status],
      });
    });

    return items;
  }, [navigate]);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands.filter((c) => c.category === "Navigation");
    const q = query.toLowerCase();
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.keywords?.some((k) => k.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [query, commands]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filtered]);

  const flatItems = filtered;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && flatItems[selectedIndex]) {
      e.preventDefault();
      flatItems[selectedIndex].action();
    }
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setOpen(false)} />
      <div className="relative flex items-start justify-center pt-[15vh] px-4">
        <div className="w-full max-w-[580px] bg-[#0c0c18] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
            <Search className="w-5 h-5 text-white/30 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands, employees, clients, tasks..."
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/30 font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2 scrollbar-thin">
            {Object.entries(grouped).length === 0 ? (
              <div className="py-10 text-center">
                <Search className="w-8 h-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">No results found</p>
                <p className="text-xs text-white/20 mt-1">Try a different search term</p>
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => {
                let globalOffset = 0;
                for (const [cat, itms] of Object.entries(grouped)) {
                  if (cat === category) break;
                  globalOffset += itms.length;
                }
                return (
                  <div key={category}>
                    <p className="px-5 py-1.5 text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                      {category}
                    </p>
                    {items.map((item, i) => {
                      const idx = globalOffset + i;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          data-index={idx}
                          onClick={() => item.action()}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={clsx(
                            "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                            idx === selectedIndex ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                          )}
                        >
                          <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            idx === selectedIndex ? "bg-[#FF6B00]/10" : "bg-white/[0.04]"
                          )}>
                            <Icon className={clsx("w-4 h-4", idx === selectedIndex ? "text-[#FF6B00]" : "text-white/40")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={clsx("text-sm truncate", idx === selectedIndex ? "text-white" : "text-white/70")}>{item.label}</p>
                            {item.description && (
                              <p className="text-xs text-white/30 truncate">{item.description}</p>
                            )}
                          </div>
                          {idx === selectedIndex && (
                            <ArrowRight className="w-4 h-4 text-[#FF6B00] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center gap-4 text-[10px] text-white/25">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono">↵</kbd> select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono">esc</kbd> close
              </span>
            </div>
            <span className="text-[10px] text-white/20">FU Corp Command Center</span>
          </div>
        </div>
      </div>
    </div>
  );
}
