"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Briefcase, CheckSquare, BarChart3, Building2,
  Settings, ChevronLeft, Moon, Sun, LogOut, Menu, Bell,
  ClipboardCheck, FileText, DollarSign, CalendarOff, ChevronDown, Zap, Filter,
} from "lucide-react";
import { clsx } from "clsx";
import { WolfIcon } from "@/components/WolfLogo";

// Static brand data
const brands = [
  { id: "1", name: "Virtual Customer Solution", code: "VCS", color: "#FF6B00" },
  { id: "2", name: "Backup Solutions LLC", code: "BSL", color: "#3B82F6" },
  { id: "3", name: "Digital Point LLC", code: "DPL", color: "#22C55E" },
];

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, section: "main" as const },
  { href: "/clients", label: "Clients", icon: Building2, section: "main" as const },
  { href: "/pipeline", label: "Pipeline", icon: Briefcase, section: "main" as const },
  { href: "/funnel", label: "Lead Funnel", icon: Filter, section: "main" as const },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, section: "main" as const },
  { href: "/employees", label: "Team", icon: Users, section: "hr" as const },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck, section: "hr" as const },
  { href: "/leaves", label: "Leaves", icon: CalendarOff, section: "hr" as const },
  { href: "/invoices", label: "Invoices", icon: FileText, section: "finance" as const },
  { href: "/payroll", label: "Payroll", icon: DollarSign, section: "finance" as const },
  { href: "/reports", label: "Reports", icon: BarChart3, section: "system" as const },
  { href: "/settings", label: "Settings", icon: Settings, section: "system" as const },
];

const sectionLabels: Record<string, string> = {
  main: "", hr: "People", finance: "Finance", system: "System",
};

interface SidebarProps {
  currentUser: { name: string; role: string; email: string } | null;
  selectedBrand: string;
  onBrandChange: (brandId: string) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export default function Sidebar({
  currentUser, selectedBrand, onBrandChange, theme, onToggleTheme,
  onLogout, isMobileOpen, onMobileClose, collapsed, onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const currentBrand = brands.find((b) => b.id === selectedBrand);

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={clsx(
          "fixed top-0 left-0 h-full flex flex-col z-50 transition-all duration-300 ease-out",
          "bg-[var(--surface)] border-r border-[var(--border)]",
          collapsed ? "w-[68px]" : "w-[256px]",
          !isMobileOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className={clsx(
          "flex items-center gap-3 border-b border-[var(--border)]",
          collapsed ? "px-3 py-4 justify-center" : "px-4 py-4"
        )}>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: currentBrand?.color || "#6366F1" }}
          >
            <WolfIcon size={18} color="#fff" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 relative">
              <select
                value={selectedBrand}
                onChange={(e) => onBrandChange(e.target.value)}
                className="w-full bg-transparent text-[var(--foreground)] text-[13px] font-semibold appearance-none cursor-pointer focus:outline-none pr-6 tracking-tight"
                title={currentBrand?.name}
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id} className="bg-[var(--surface)]">
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground-dim)] pointer-events-none" />
              <p className="text-[10px] text-[var(--foreground-dim)] mt-0.5 truncate">{currentBrand?.code} &middot; Enterprise</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2.5 overflow-y-auto scrollbar-thin">
          {(["main", "hr", "finance", "system"] as const).map((section) => {
            const items = navItems.filter((i) => i.section === section);
            return (
              <div key={section} className={section !== "main" ? "mt-4" : ""}>
                {!collapsed && sectionLabels[section] && (
                  <p className="px-3 mb-1.5 text-[10px] font-medium text-[var(--foreground-dim)] uppercase tracking-[0.08em] opacity-60">
                    {sectionLabels[section]}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onMobileClose}
                          className={clsx("sidebar-item", active && "active", collapsed && "justify-center px-0")}
                          title={collapsed ? item.label : undefined}
                        >
                          <item.icon className="w-[18px] h-[18px] shrink-0" />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-2.5 border-t border-[var(--border)] space-y-1">
          <button
            onClick={onToggleTheme}
            className={clsx("sidebar-item w-full", collapsed && "justify-center px-0")}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Moon className="w-[18px] h-[18px] shrink-0" /> : <Sun className="w-[18px] h-[18px] shrink-0" />}
            {!collapsed && <span>{theme === "dark" ? "Dark" : "Light"}</span>}
          </button>

          {/* User Card */}
          <div className={clsx(
            "flex items-center gap-3 rounded-lg p-2.5 mt-1",
            "bg-[var(--background)]",
            "border border-[var(--border)]",
            collapsed && "justify-center p-2"
          )}>
            <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center shrink-0 text-[11px] font-semibold text-white">
              {currentUser?.name?.charAt(0) || "U"}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[var(--foreground)] truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-[var(--foreground-dim)]">{currentUser?.role?.replace(/_/g, " ")}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="text-[var(--foreground-dim)] hover:text-[var(--danger)] transition-colors shrink-0 p-1 rounded hover:bg-red-500/10"
                  title="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className={clsx(
            "absolute -right-3 top-[68px] w-6 h-6 rounded-full",
            "bg-[var(--surface)] border border-[var(--border)]",
            "flex items-center justify-center",
            "text-[var(--foreground-dim)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)]",
            "transition-all shadow-sm hidden lg:flex"
          )}
        >
          <ChevronLeft className={clsx("w-3 h-3 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </aside>
    </>
  );
}

export function MobileHeader({
  onMenuOpen, brandColor, title,
}: { onMenuOpen: () => void; brandColor: string; title: string }) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[var(--surface)] border-b border-[var(--border)]">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button onClick={onMenuOpen} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors">
            <Menu className="w-5 h-5 text-[var(--foreground-muted)]" />
          </button>
          <div className="w-7 h-7 rounded-md bg-[var(--primary)] flex items-center justify-center">
            <WolfIcon size={16} color="#fff" />
          </div>
          <span className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">{title}</span>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors relative">
          <Bell className="w-5 h-5 text-[var(--foreground-muted)]" />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[var(--primary)] rounded-full" />
        </button>
      </div>
    </header>
  );
}
