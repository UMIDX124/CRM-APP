"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, MessageSquare, LifeBuoy, Target } from "lucide-react";
import { clsx } from "clsx";

// Bottom-nav tabs surface the 5 highest-traffic destinations on mobile.
// Pixels: 64px height + safe-area inset, primary color when active.
const tabs = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/clients", icon: Building2, label: "Clients" },
  { href: "/deals", icon: Target, label: "Deals" },
  { href: "/tickets", icon: LifeBuoy, label: "Tickets" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-xl border-t border-[var(--border)] px-1 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-1.5">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[56px] relative",
                active ? "text-[var(--primary)]" : "text-[var(--foreground-dim)]"
              )}
            >
              {active && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[var(--primary)]" style={{ boxShadow: "0 0 8px rgba(255,107,0,0.4)" }} />
              )}
              <tab.icon className={clsx("w-5 h-5 transition-transform", active && "scale-110")} style={active ? { filter: "drop-shadow(0 0 6px rgba(255,107,0,0.4))" } : undefined} />
              <span className={clsx("text-[10px]", active ? "font-semibold" : "font-medium")}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
