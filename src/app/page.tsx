"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckSquare,
  DollarSign,
  BarChart3,
  Building2,
  Crown,
  Bell,
  Menu,
  X,
  LogOut,
  Settings,
  ChevronLeft,
  Search,
  Plus,
  Moon,
  Sun,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import { clsx } from "clsx";
import { brands, clients, employees, tasks, leads } from "@/data/mock-data";
import ClientManagement from "@/components/ClientManagement";
import EmployeeDirectory from "@/components/EmployeeDirectory";
import TaskManagement from "@/components/TaskManagement";
import PipelineModule from "@/components/PipelineModule";
import ReportsModule from "@/components/ReportsModule";
import DashboardModule from "@/components/DashboardModule";
import AIChat from "@/components/AIChat";

type ModuleType = "dashboard" | "clients" | "employees" | "tasks" | "pipeline" | "reports";
type AuthView = "login" | "register";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Building2 },
  { id: "employees", label: "Team", icon: Users },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "pipeline", label: "Pipeline", icon: Briefcase },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

const brandColors: Record<string, string> = {
  VCS: "#D4AF37",
  BSL: "#3B82F6",
  DPL: "#22C55E",
};

// Demo users for different roles
const demoUsers = [
  { email: "admin@fu-corp.com", password: "admin123", role: "SUPER_ADMIN", name: "Umer Khan" },
  { email: "pm@fu-corp.com", password: "pm123", role: "PROJECT_MANAGER", name: "Sarah Williams" },
  { email: "dev@fu-corp.com", password: "dev123", role: "EMPLOYEE", name: "John Smith" },
];

function AuthScreen({ onLogin }: { onLogin: (user: typeof demoUsers[0]) => void }) {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const user = demoUsers.find(u => u.email === email && u.password === password);
    
    if (user) {
      onLogin(user);
    } else {
      setError("Invalid credentials. Try: admin@fu-corp.com / admin123");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError("Please fill all fields");
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    // Simulate registration
    onLogin({ email, password, role: "EMPLOYEE", name });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flexitems-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8860B] mb-4 shadow-lg shadow-[#D4AF37]/20">
            <span className="text-3xl font-black text-black">FU</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">FU Corp</h1>
          <p className="text-gray-400">Enterprise Command Center</p>
        </div>

        {/* Auth Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setView("login")}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                view === "login"
                  ? "bg-[#D4AF37] text-black"
                  : "bg-white/5 text-white/60 hover:text-white"
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => setView("register")}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                view === "register"
                  ? "bg-[#D4AF37] text-black"
                  : "bg-white/5 text-white/60 hover:text-white"
              )}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {view === "login" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@fu-corp.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all"
                />
              </div>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Create Account
                  </>
                )}
              </button>
            </div>
          )}

          {/* Demo Credentials */}
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-white/40 mb-2 text-center">Demo Credentials</p>
            <div className="space-y-1 text-xs text-white/50">
              <p><span className="text-[#D4AF37]">Admin:</span> admin@fu-corp.com / admin123</p>
              <p><span className="text-[#3B82F6]">PM:</span> pm@fu-corp.com / pm123</p>
              <p><span className="text-[#22C55E]">Employee:</span> dev@fu-corp.com / dev123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SearchResult {
  type: "client" | "employee" | "task" | "lead";
  title: string;
  subtitle: string;
  module: ModuleType;
}

function Sidebar({
  activeModule,
  onModuleChange,
  isOpen,
  onClose,
  currentUser,
  onLogout,
  globalSearch,
  setGlobalSearch,
  showSearchResults,
  setShowSearchResults,
  searchResults,
  theme,
  onToggleTheme,
}: {
  activeModule: ModuleType;
  onModuleChange: (module: ModuleType) => void;
  isOpen: boolean;
  onClose: () => void;
  currentUser: typeof demoUsers[0] | null;
  onLogout: () => void;
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
  showSearchResults: boolean;
  setShowSearchResults: (v: boolean) => void;
  searchResults: SearchResult[];
  theme: "dark" | "light";
  onToggleTheme: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("1");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentBrand = brands.find((b) => b.id === selectedBrand);
  const brandColor = brandColors[currentBrand?.code || "VCS"] || "#D4AF37";

  const handleNavClick = (moduleId: string) => {
    onModuleChange(moduleId as ModuleType);
    onClose();
  };

  const searchIconForType = (type: SearchResult["type"]) => {
    switch (type) {
      case "client": return <Building2 className="w-4 h-4 text-[#3B82F6]" />;
      case "employee": return <Users className="w-4 h-4 text-[#22C55E]" />;
      case "task": return <CheckSquare className="w-4 h-4 text-[#D4AF37]" />;
      case "lead": return <Briefcase className="w-4 h-4 text-[#8B5CF6]" />;
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          "fixed top-0 left-0 h-full flex flex-col border-r border-white/10 transition-all duration-300 z-50",
          "bg-gradient-to-b from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]",
          collapsed ? "w-[72px]" : "w-[280px]",
          !isOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0"
              style={{ backgroundColor: brandColor, color: "#000" }}
            >
              FU
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/90 focus:outline-none cursor-pointer appearance-none"
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id} className="bg-[#0f0f18]">
                      {brand.code}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="p-4 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search... (Ctrl+K)"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowSearchResults(e.target.value.length >= 2);
                }}
                onFocus={() => {
                  if (globalSearch.length >= 2) setShowSearchResults(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSearchResults(false), 200);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white/80 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-50 backdrop-blur-xl bg-white/[0.08] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
                {searchResults.map((result, idx) => (
                  <button
                    key={`${result.type}-${idx}`}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onModuleChange(result.module);
                      setGlobalSearch("");
                      setShowSearchResults(false);
                      onClose();
                    }}
                  >
                    {searchIconForType(result.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{result.title}</p>
                      <p className="text-xs text-white/40 truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-[10px] uppercase text-white/30 font-medium">{result.type}</span>
                  </button>
                ))}
              </div>
            )}
            {showSearchResults && globalSearch.length >= 2 && searchResults.length === 0 && (
              <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-50 backdrop-blur-xl bg-white/[0.08] border border-white/15 rounded-xl shadow-2xl p-4 text-center text-sm text-white/40">
                No results found
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-2 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={clsx(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    activeModule === item.id
                      ? "text-white"
                      : "text-white/60 hover:text-white/80 hover:bg-white/5"
                  )}
                  style={
                    activeModule === item.id
                      ? {
                          background: `linear-gradient(135deg, ${brandColor}20, ${brandColor}10)`,
                          boxShadow: `0 0 20px ${brandColor}15`,
                        }
                      : undefined
                  }
                >
                  <item.icon
                    className={clsx("w-5 h-5 shrink-0")}
                    style={activeModule === item.id ? { color: brandColor } : undefined}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Section */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-all">
            <Bell className="w-5 h-5" />
            {!collapsed && <span>Notifications</span>}
            <span className="ml-auto px-2 py-0.5 rounded-full bg-[#D4AF37] text-black text-xs font-bold">3</span>
          </button>
          <div className="flex items-center gap-1">
            <button className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:text-white/80 hover:bg-white/5 transition-all">
              <Settings className="w-5 h-5" />
              {!collapsed && <span>Settings</span>}
            </button>
            <button
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl text-white/60 hover:text-white/80 hover:bg-white/5 transition-all"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center shrink-0">
              <span className="text-black text-xs font-bold">{currentUser?.name?.charAt(0) || "U"}</span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                <p className="text-[10px] text-[#D4AF37]">{currentUser?.role}</p>
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

export default function Home() {
  const [activeModule, setActiveModule] = useState<ModuleType>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<typeof demoUsers[0] | null>(null);
  const [selectedBrand, setSelectedBrand] = useState("1");
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Theme effect
  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  // Cmd+K / Ctrl+K keyboard shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Global search logic
  const searchResults: SearchResult[] = useMemo(() => {
    if (globalSearch.length < 2) return [];
    const query = globalSearch.toLowerCase();
    const results: SearchResult[] = [];

    // Search clients
    for (const c of clients) {
      if (results.length >= 8) break;
      if (c.companyName.toLowerCase().includes(query) || c.contactName.toLowerCase().includes(query)) {
        results.push({ type: "client", title: c.companyName, subtitle: c.contactName, module: "clients" });
      }
    }

    // Search employees
    for (const e of employees) {
      if (results.length >= 8) break;
      if (e.name.toLowerCase().includes(query) || e.title.toLowerCase().includes(query)) {
        results.push({ type: "employee", title: e.name, subtitle: e.title, module: "employees" });
      }
    }

    // Search tasks
    for (const t of tasks) {
      if (results.length >= 8) break;
      if (t.title.toLowerCase().includes(query) || t.client.toLowerCase().includes(query)) {
        results.push({ type: "task", title: t.title, subtitle: t.client, module: "tasks" });
      }
    }

    // Search leads
    for (const l of leads) {
      if (results.length >= 8) break;
      if (l.companyName.toLowerCase().includes(query)) {
        results.push({ type: "lead", title: l.companyName, subtitle: l.contactName, module: "pipeline" });
      }
    }

    return results.slice(0, 8);
  }, [globalSearch]);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const handleLogin = (user: typeof demoUsers[0]) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setActiveModule("dashboard");
  };

  const currentBrandData = brands.find((b) => b.id === selectedBrand);
  const brandColor = brandColors[currentBrandData?.code || "VCS"] || "#D4AF37";

  // Auth Screen
  if (!isAuthenticated) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  const getModuleTitle = () => {
    const titles: Record<ModuleType, string> = {
      dashboard: "Dashboard",
      clients: "Clients",
      employees: "Team",
      tasks: "Tasks",
      pipeline: "Pipeline",
      reports: "Reports",
    };
    return titles[activeModule];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0f0f18] to-[#0a0a0f]">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
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
            <h1 className="text-lg font-semibold text-white">{getModuleTitle()}</h1>
          </div>
          <button className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        showSearchResults={showSearchResults}
        setShowSearchResults={setShowSearchResults}
        searchResults={searchResults}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content */}
      <main
        className={clsx(
          "min-h-screen pt-16 lg:pt-0 transition-all duration-300",
          "px-4 sm:px-6 lg:px-8 py-6 lg:py-8",
          isDesktop ? "lg:ml-[280px]" : ""
        )}
      >
        {/* Brand Selector (Desktop) */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{getModuleTitle()}</h1>
            <p className="text-white/50 text-sm mt-1">
              {currentBrandData?.name} • {currentUser?.role}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
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

        {/* Module Content */}
        <div key={activeModule} className="animate-fade-in-up">
          {activeModule === "dashboard" && <DashboardModule brandId={selectedBrand} brandColor={brandColor} />}
          {activeModule === "clients" && <ClientManagement brandId={selectedBrand} />}
          {activeModule === "employees" && <EmployeeDirectory brandId={selectedBrand} />}
          {activeModule === "tasks" && <TaskManagement brandId={selectedBrand} />}
          {activeModule === "pipeline" && <PipelineModule brandId={selectedBrand} />}
          {activeModule === "reports" && <ReportsModule />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 px-6 text-center text-xs text-white/30">
        <p>FU Corp Command Center • Built for Excellence</p>
      </footer>

      {/* AI Chat Assistant */}
      <AIChat />
    </div>
  );
}
