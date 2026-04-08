"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";
import { Search, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import Sidebar, { MobileHeader } from "@/components/layout/Sidebar";
import CommandPalette from "@/components/CommandPalette";
import NotificationCenter from "@/components/NotificationCenter";
import { ToastProvider } from "@/components/ui/toast";
import EmailCompose from "@/components/EmailCompose";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { CompanyProvider } from "@/components/CompanyContext";
import { ThemeProvider, useTheme } from "@/components/ThemeContext";
import CompanySwitcher from "@/components/CompanySwitcher";
import { RealtimeProvider, ConnectionIndicator } from "@/components/RealtimeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";

// UnifiedChat ships react-markdown + remark-gfm + ai-sdk — a substantial
// bundle that we don't need on the initial dashboard paint. Lazy-load it
// so it doesn't block first interactive.
const UnifiedChat = dynamic(() => import("@/components/UnifiedChat"), {
  ssr: false,
});

const pageTitles: Record<string, string> = {
  "/": "Dashboard", "/clients": "Clients", "/employees": "Team", "/tasks": "Tasks",
  "/pipeline": "Pipeline", "/funnel": "Lead Funnel", "/reports": "Reports", "/attendance": "Attendance",
  "/attendance/checkin": "Check In", "/invoices": "Invoices", "/calendar": "Calendar",
  "/leaves": "Leave Management", "/payroll": "Payroll", "/expenses": "Expenses",
  "/audit": "Audit Log", "/guide": "User Guide", "/shortcuts": "Keyboard Shortcuts",
  "/settings": "Settings",
};

const pageDescriptions: Record<string, string> = {
  "/": "Overview of your business performance",
  "/clients": "Manage client relationships and revenue",
  "/employees": "Your team across all subsidiaries",
  "/tasks": "Track and manage all work items",
  "/pipeline": "Sales pipeline and lead management",
  "/funnel": "Lead conversion funnel across all websites",
  "/invoices": "Billing, invoices, and payments",
  "/reports": "Business intelligence and insights",
  "/attendance": "Team attendance and tracking",
  "/settings": "System configuration and preferences",
};

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string; email: string } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // P0-7 FIX: Validate auth via server call, not just localStorage
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      // First check localStorage for initial render
      const stored = localStorage.getItem("fu-crm-user");
      if (!stored) {
        setCheckingAuth(false);
        return;
      }

      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem("fu-crm-user");
      }

      // Then validate with server (non-blocking)
      try {
        const res = await fetch("/api/auth/me");
        if (!cancelled && !res.ok) {
          // Server says session invalid — clear and redirect
          localStorage.removeItem("fu-crm-user");
          setCurrentUser(null);
          setIsAuthenticated(false);
        }
      } catch {
        // Server unreachable — keep localStorage auth as fallback
      }

      if (!cancelled) setCheckingAuth(false);
    }

    checkAuth();
    return () => { cancelled = true; };
  }, []);

  // Theme is managed by ThemeProvider — class applied automatically
  useEffect(() => { if (!checkingAuth && !isAuthenticated) router.push("/login"); }, [checkingAuth, isAuthenticated, router]);

  // P0-8 FIX: Destroy server session on logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Logout API failed — still clear local state
    }
    localStorage.removeItem("fu-crm-user");
    setCurrentUser(null);
    setIsAuthenticated(false);
    router.push("/login");
  };

  const pageTitle = pageTitles[pathname] || "Dashboard";
  const pageDesc = pageDescriptions[pathname] || "";

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:flex flex-col w-[256px] h-screen border-r border-[var(--border)] bg-[var(--surface)] p-4 gap-4 shrink-0">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-9 h-9 rounded-xl skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 skeleton rounded" />
              <div className="h-2 w-16 skeleton rounded" />
            </div>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <div className="w-5 h-5 skeleton rounded" />
              <div className="h-3 skeleton rounded" style={{ width: `${60 + (i * 7) % 40}%` }} />
            </div>
          ))}
        </aside>
        {/* Main content skeleton */}
        <div className="flex-1 min-h-screen">
          <div className="h-[56px] border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between px-6">
            <div className="h-4 w-28 skeleton rounded" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-40 skeleton rounded-lg" />
              <div className="w-8 h-8 skeleton rounded-lg" />
              <div className="w-8 h-8 skeleton rounded-lg" />
            </div>
          </div>
          <div className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] p-5 space-y-3 bg-[var(--surface)]">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 skeleton rounded-xl" />
                    <div className="h-5 w-16 skeleton rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-7 w-24 skeleton rounded" />
                    <div className="h-3 w-20 skeleton rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-xl border border-[var(--border)] p-5 bg-[var(--surface)]">
                <div className="h-4 w-32 skeleton rounded mb-4" />
                <div className="h-[200px] skeleton rounded-xl" />
              </div>
              <div className="rounded-xl border border-[var(--border)] p-5 space-y-3 bg-[var(--surface)]">
                <div className="h-4 w-24 skeleton rounded" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <div className="h-3 w-16 skeleton rounded" />
                      <div className="h-3 w-8 skeleton rounded" />
                    </div>
                    <div className="h-2 skeleton rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <CompanyProvider>
    <ToastProvider>
    <RealtimeProvider>
      <div className="min-h-screen bg-[var(--background)]">
        <MobileHeader onMenuOpen={() => setSidebarOpen(true)} title={pageTitle} />

        <Sidebar
          currentUser={currentUser}
          theme={theme} onToggleTheme={toggleTheme} onLogout={handleLogout}
          isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed}
        />

        <main className={clsx(
          "min-h-screen transition-all duration-300 ease-out",
          "pt-14 lg:pt-0",
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[256px]"
        )}>
          {/* Desktop Header */}
          <header className="hidden lg:flex items-center justify-between h-[56px] px-6 border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-[15px] font-semibold text-[var(--foreground)] tracking-tight">{pageTitle}</h1>
                {pageDesc && <p className="text-[11px] text-[var(--foreground-dim)] -mt-0.5">{pageDesc}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground-dim)] hover:border-[var(--border-hover)] transition-all cursor-pointer group"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-[12px]">Search</span>
                <kbd className="ml-4 px-1.5 py-0.5 rounded text-[9px] font-mono bg-[var(--surface-elevated)] text-[var(--foreground-dim)] border border-[var(--border)]">
                  <span className="opacity-60">Ctrl</span> K
                </kbd>
              </button>

              <ConnectionIndicator />

              <NotificationCenter />

              <button
                onClick={() => setShowEmailCompose(true)}
                className="p-2 rounded-lg text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)] transition-all"
                title="Compose"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </button>

              <CompanySwitcher />
            </div>
          </header>

          {/* Page Content */}
          <div className="px-4 sm:px-6 lg:px-6 py-5 lg:py-6 mobile-safe-bottom relative z-10">
            <div key={pathname} className="animate-fade-in-up">
              <ErrorBoundary label={pageTitle}>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </main>

        <UnifiedChat />
        <MobileBottomNav />
        <EmailCompose isOpen={showEmailCompose} onClose={() => setShowEmailCompose(false)} />
        <CommandPalette />
      </div>
    </RealtimeProvider>
    </ToastProvider>
    </CompanyProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ThemeProvider>
  );
}
