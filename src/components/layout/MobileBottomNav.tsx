"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, CheckSquare, Users, Menu } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

const tabs = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/clients", icon: Building2, label: "Clients" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/employees", icon: Users, label: "Team" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0D10]/95 backdrop-blur-xl border-t border-white/[0.06] px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className={clsx("flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-[60px]",
                active ? "text-[#FF6B00]" : "text-white/30"
              )}>
              <tab.icon className={clsx("w-5 h-5", active && "drop-shadow-[0_0_8px_rgba(255,107,0,0.5)]")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-[#FF6B00]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
