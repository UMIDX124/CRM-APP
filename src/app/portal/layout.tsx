"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Ticket,
  User,
} from "lucide-react";

interface PortalUser {
  clientId: string;
  companyName: string;
  contactName: string;
  email: string;
}

const NAV_ITEMS = [
  { href: "/portal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/invoices", label: "Invoices", icon: FileText },
  { href: "/portal/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/portal/tickets", label: "Tickets", icon: Ticket },
  { href: "/portal/messages", label: "Messages", icon: MessageSquare },
  { href: "/portal/profile", label: "Profile", icon: User },
];

const PUBLIC_PATHS = ["/portal/login", "/portal/verify"];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isPublicPath) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function checkAuth() {
      try {
        const res = await fetch("/api/portal/me", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) router.replace("/portal/login");
          return;
        }
        const data = await res.json();
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) router.replace("/portal/login");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [isPublicPath, router]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/portal/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // proceed to redirect regardless
    }
    router.replace("/portal/login");
  }, [router]);

  // Public pages render without layout shell
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: sidebarOpen ? 0 : -240,
          bottom: 0,
          zIndex: 50,
          transition: "left 0.2s ease",
        }}
        className="portal-sidebar"
      >
        {/* Brand */}
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius)",
                background:
                  "linear-gradient(135deg, var(--primary), var(--primary-dark))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 14,
                color: "#000",
              }}
            >
              A
            </div>
            <span
              style={{
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: "-0.02em",
              }}
            >
              Client Portal
            </span>
          </div>
          {/* Mobile close */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="portal-sidebar-close"
            style={{
              display: "none",
              background: "none",
              border: "none",
              color: "var(--foreground-muted)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: "var(--radius)",
                  fontSize: 14,
                  fontWeight: isActive ? 500 : 400,
                  color: isActive
                    ? "var(--primary)"
                    : "var(--foreground-muted)",
                  background: isActive
                    ? "var(--primary-subtle)"
                    : "transparent",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  marginBottom: 2,
                  cursor: "pointer",
                }}
              >
                <Icon size={18} />
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "var(--foreground-muted)",
                marginBottom: 2,
              }}
            >
              {user.contactName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--foreground-dim)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </div>
          </div>
        )}
      </aside>

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          marginLeft: 0,
        }}
        className="portal-main"
      >
        {/* Header */}
        <header
          style={{
            height: 56,
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 20px",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="portal-menu-btn"
              style={{
                display: "none",
                background: "none",
                border: "none",
                color: "var(--foreground-muted)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <Menu size={22} />
            </button>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              {user?.companyName || "Portal"}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--foreground-muted)",
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-hover)";
              e.currentTarget.style.color = "var(--foreground)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--foreground-muted)";
            }}
          >
            <LogOut size={14} />
            Log Out
          </button>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 24, maxWidth: 1200, width: "100%" }}>
          {children}
        </main>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 768px) {
          .portal-sidebar {
            left: 0 !important;
          }
          .portal-main {
            margin-left: 240px !important;
          }
          .portal-menu-btn {
            display: none !important;
          }
          .portal-sidebar-close {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .portal-menu-btn {
            display: flex !important;
          }
          .portal-sidebar-close {
            display: flex !important;
          }
          .portal-main {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
