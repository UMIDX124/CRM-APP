"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, MessageSquare, LifeBuoy, TrendingUp } from "lucide-react";
import { clsx } from "clsx";

// Bottom-nav tabs surface the 5 highest-traffic destinations on mobile.
// Pixels: 64px height + safe-area inset, primary color when active.
// The "Chat" tab is special: there is no /chat page, the chat lives as
// a floating UnifiedChat panel. We render it as a button that dispatches
// the `open-unified-chat` window event, which UnifiedChat listens for.
type NavTab =
  | { href: string; icon: typeof LayoutDashboard; label: string; kind: "link" }
  | { action: "open-chat"; icon: typeof LayoutDashboard; label: string; kind: "button" };

const tabs: NavTab[] = [
  { href: "/", icon: LayoutDashboard, label: "Home", kind: "link" },
  { href: "/clients", icon: Building2, label: "Clients", kind: "link" },
  { href: "/analytics", icon: TrendingUp, label: "Analytics", kind: "link" },
  { href: "/tickets", icon: LifeBuoy, label: "Tickets", kind: "link" },
  { action: "open-chat", icon: MessageSquare, label: "Chat", kind: "button" },
];

// Routes where the bottom nav is hidden to give multi-step flows the full viewport.
const HIDDEN_ROUTES = ["/cold-email/new"];

export default function MobileBottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    return null;
  }

  const tabBaseClass = (active: boolean) =>
    clsx(
      "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px] relative",
      active ? "text-[var(--primary)]" : "text-[var(--foreground-dim)]"
    );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--border)] px-1 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-1.5">
        {tabs.map((tab) => {
          if (tab.kind === "button") {
            // Chat tab: dispatch the open event to the UnifiedChat panel
            // instead of navigating. Using a real <button> so it gets
            // keyboard focus + the same hit target as the links.
            const Icon = tab.icon;
            return (
              <button
                key={tab.action}
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("open-unified-chat"));
                  }
                }}
                className={tabBaseClass(false)}
              >
                <Icon className="w-5 h-5 transition-transform" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          }
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={tabBaseClass(active)}
            >
              {active && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--primary)]" style={{ boxShadow: "0 0 8px rgba(255,107,0,0.4)" }} />
              )}
              <Icon className={clsx("w-5 h-5 transition-transform", active && "scale-110")} style={active ? { filter: "drop-shadow(0 0 6px rgba(255,107,0,0.4))" } : undefined} />
              <span className={clsx("text-[10px]", active ? "font-semibold" : "font-medium")}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
