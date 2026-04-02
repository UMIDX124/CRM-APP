"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { clsx } from "clsx";
import Sidebar, { MobileHeader } from "@/components/layout/Sidebar";
import AIChat from "@/components/AIChat";
import CommandPalette from "@/components/CommandPalette";
import NotificationCenter from "@/components/NotificationCenter";
import { brands } from "@/data/mock-data";

const brandColors: Record<string, string> = {
  VCS: "#D4AF37",
  BSL: "#3B82F6",
  DPL: "#22C55E",
};

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/clients": "Clients",
  "/employees": "Team",
  "/tasks": "Tasks",
  "/pipeline": "Pipeline",
  "/reports": "Reports",
  "/attendance": "Attendance",
  "/invoices": "Invoices",
  "/calendar": "Calendar",
  "/audit": "Audit Log",
  "/settings": "Settings",
};

const demoUsers = [
  { email: "admin@fu-corp.com", password: "admin123", role: "SUPER_ADMIN", name: "Umer Khan" },
  { email: "pm@fu-corp.com", password: "pm123", role: "PROJECT_MANAGER", name: "Sarah Williams" },
  { email: "dev@fu-corp.com", password: "dev123", role: "EMPLOYEE", name: "John Smith" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<typeof demoUsers[0] | null>(null);
  const [selectedBrand, setSelectedBrand] = useState("1");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check auth on mount
  useEffect(() => {
    const stored = localStorage.getItem("fu-crm-user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch {}
    }
    setCheckingAuth(false);
  }, []);

  // Theme effect
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!checkingAuth && !isAuthenticated) {
      router.push("/login");
    }
  }, [checkingAuth, isAuthenticated, router]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("fu-crm-user");
    setCurrentUser(null);
    setIsAuthenticated(false);
    router.push("/login");
  };

  const currentBrandData = brands.find((b) => b.id === selectedBrand);
  const brandColor = brandColors[currentBrandData?.code || "VCS"] || "#D4AF37";
  const pageTitle = pageTitles[pathname] || "Dashboard";

  // Show nothing while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]">
      {/* Mobile Header */}
      <MobileHeader
        onMenuOpen={() => setSidebarOpen(true)}
        brandColor={brandColor}
        title={pageTitle}
      />

      {/* Sidebar */}
      <Sidebar
        currentUser={currentUser}
        selectedBrand={selectedBrand}
        onBrandChange={setSelectedBrand}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main
        className={clsx(
          "min-h-screen pt-16 lg:pt-0 transition-all duration-300",
          "px-4 sm:px-6 lg:px-8 py-6 lg:py-8",
          "lg:ml-[260px]"
        )}
      >
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
            <p className="text-white/50 text-sm mt-1">
              {currentBrandData?.name} &bull; {currentUser?.role}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search shortcut hint */}
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
              className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/10 transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span className="text-xs">Search...</span>
              <kbd className="ml-4 px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono">Ctrl+K</kbd>
            </button>

            <NotificationCenter />

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            >
              {theme === "dark" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              )}
            </button>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white/80 cursor-pointer"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id} className="bg-[#0f0f18]">
                  {brand.code} - {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Page Content */}
        <div className="animate-fade-in-up">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="lg:ml-[260px] border-t border-white/10 py-4 px-6 text-center text-xs text-white/30">
        <p>FU Corp Command Center &bull; Built for Excellence</p>
      </footer>

      {/* AI Chat */}
      <AIChat />

      {/* Command Palette */}
      <CommandPalette />
    </div>
  );
}
