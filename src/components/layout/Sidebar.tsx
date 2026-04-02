"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  BarChart3,
  Building2,
  Crown,
  Bell,
  Settings,
  ChevronLeft,
  Search,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  ClipboardCheck,
  FileText,
  CalendarDays,
  Shield,
} from "lucide-react";
import { clsx } from "clsx";
import { brands } from "@/data/mock-data";
import { LogoMini } from "./Logo";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { href: "/clients", label: "Clients", icon: Building2, section: "main" },
  { href: "/pipeline", label: "Pipeline", icon: Briefcase, section: "main" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, section: "main" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, section: "main" },
  { href: "/employees", label: "Team", icon: Users, section: "hr" },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck, section: "hr" },
  { href: "/invoices", label: "Invoices", icon: FileText, section: "finance" },
  { href: "/reports", label: "Reports", icon: BarChart3, section: "finance" },
  { href: "/audit", label: "Audit Log", icon: Shield, section: "system" },
  { href: "/settings", label: "Settings", icon: Settings, section: "system" },
];

const brandColors: Record<string, string> = {
  VCS: "#FF6B00",
  BSL: "#3B82F6",
  DPL: "#22C55E",
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
  currentUser,
  selectedBrand,
  onBrandChange,
  theme,
  onToggleTheme,
  onLogout,
  isMobileOpen,
  onMobileClose,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {
  const setCollapsed = (v: boolean) => onCollapsedChange(v);
  const pathname = usePathname();
  const currentBrand = brands.find((b) => b.id === selectedBrand);
  const brandColor = brandColors[currentBrand?.code || "VCS"] || "#FF6B00";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={clsx(
          "fixed top-0 left-0 h-full flex flex-col border-r border-white/[0.06] transition-all duration-300 z-50",
          "bg-gradient-to-b from-[#0D0D10] via-[#111114] to-[#0D0D10]",
          collapsed ? "w-[72px]" : "w-[260px]",
          !isMobileOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <LogoMini size={40} />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <select
                  value={selectedBrand}
                  onChange={(e) => onBrandChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/90 focus:outline-none cursor-pointer appearance-none"
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id} className="bg-[#0f0f18]">
                      {brand.code} - {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 overflow-y-auto">
          {(["main", "hr", "finance", "system"] as const).map((section) => {
            const items = navItems.filter((i) => i.section === section);
            if (items.length === 0) return null;
            const sectionLabels = { main: "", hr: "HR & People", finance: "Finance", system: "System" };
            return (
              <div key={section} className={section !== "main" ? "mt-4" : ""}>
                {!collapsed && sectionLabels[section] && (
                  <p className="px-3 mb-2 text-[10px] font-semibold text-white/25 uppercase tracking-widest">
                    {sectionLabels[section]}
                  </p>
                )}
                <ul className="space-y-1">
                  {items.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onMobileClose}
                          className={clsx(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                            active
                              ? "text-white"
                              : "text-white/60 hover:text-white/80 hover:bg-white/5"
                          )}
                          style={
                            active
                              ? {
                                  background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}10)`,
                                  boxShadow: `0 0 20px ${brandColor}15`,
                                }
                              : undefined
                          }
                        >
                          <item.icon
                            className="w-5 h-5 shrink-0"
                            style={active ? { color: brandColor } : undefined}
                          />
                          {!collapsed && <span>{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-all">
            <Bell className="w-5 h-5" />
            {!collapsed && <span>Notifications</span>}
            <span className="ml-auto px-2 py-0.5 rounded-full bg-[#FF6B00] text-black text-xs font-bold">3</span>
          </button>
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-all"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            {!collapsed && <span>{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>}
          </button>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#E05500] flex items-center justify-center shrink-0">
              <span className="text-black text-xs font-bold">{currentUser?.name?.charAt(0) || "U"}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-[#FF6B00]">{currentUser?.role}</p>
              </div>
            )}
            <button
              onClick={onLogout}
              className="text-white/40 hover:text-red-400 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1a1a24] border border-white/20 items-center justify-center text-white/60 hover:text-white hover:bg-[#252532] transition-all shadow-lg hidden lg:flex"
        >
          {collapsed ? <ChevronLeft className="w-3 h-3 rotate-180" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>
    </>
  );
}

export function MobileHeader({
  onMenuOpen,
  brandColor,
  title,
}: {
  onMenuOpen: () => void;
  brandColor: string;
  title: string;
}) {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-lg border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuOpen}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ backgroundColor: brandColor, color: "#000" }}
          >
            FU
          </div>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
        </div>
        <button className="p-2 rounded-lg hover:bg-white/10 transition-colors relative">
          <Bell className="w-5 h-5 text-white/70" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF6B00] rounded-full" />
        </button>
      </div>
    </header>
  );
}
