"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const pathLabels: Record<string, string> = {
  "": "Dashboard",
  clients: "Clients",
  employees: "Team",
  tasks: "Tasks",
  pipeline: "Pipeline",
  attendance: "Attendance",
  checkin: "Check In",
  calendar: "Calendar",
  invoices: "Invoices",
  reports: "Reports",
  settings: "Settings",
  audit: "Audit Log",
  guide: "User Guide",
  payroll: "Payroll",
  leaves: "Leaves",
  projects: "Projects",
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => ({
    label: pathLabels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav className="flex items-center gap-1.5 text-xs text-white/30 mb-4">
      <Link href="/" className="flex items-center gap-1 hover:text-white/50 transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center gap-1.5">
          <ChevronRight className="w-3 h-3" />
          {crumb.isLast ? (
            <span className="text-white/60 font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-white/50 transition-colors">{crumb.label}</Link>
          )}
        </div>
      ))}
    </nav>
  );
}
