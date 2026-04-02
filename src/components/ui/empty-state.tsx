"use client";

import { clsx } from "clsx";

type EmptyType = "clients" | "tasks" | "employees" | "invoices" | "leads" | "attendance" | "leaves" | "projects" | "search" | "error" | "generic";

const illustrations: Record<EmptyType, { svg: string; title: string; desc: string }> = {
  clients: { svg: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-2 15H8v-2h2v2Zm0-4H8V7h2v6Zm6 4h-2v-2h2v2Zm0-4h-2V7h2v6Z", title: "No clients yet", desc: "Add your first client to start managing relationships" },
  tasks: { svg: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m-6 9 2 2 4-4", title: "No tasks found", desc: "Create your first task to get things moving" },
  employees: { svg: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75", title: "No team members", desc: "Hire your first employee to build your team" },
  invoices: { svg: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M16 13H8M16 17H8M10 9H8", title: "No invoices", desc: "Create your first invoice to start billing" },
  leads: { svg: "M22 12h-4l-3 9L9 3l-3 9H2", title: "No leads in pipeline", desc: "Add leads to track your sales pipeline" },
  attendance: { svg: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z", title: "No attendance records", desc: "Check-in to start tracking attendance" },
  leaves: { svg: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z", title: "No leave requests", desc: "Apply for leave when you need time off" },
  projects: { svg: "M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z", title: "No projects yet", desc: "Create a project to organize your tasks" },
  search: { svg: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z", title: "No results found", desc: "Try a different search term" },
  error: { svg: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z", title: "Something went wrong", desc: "Please try again or contact support" },
  generic: { svg: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", title: "Nothing here yet", desc: "This section is empty" },
};

export default function EmptyState({
  type = "generic",
  title,
  description,
  action,
  onAction,
}: {
  type?: EmptyType;
  title?: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}) {
  const cfg = illustrations[type];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
      {/* Icon circle */}
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B00]/10 to-[#FF6B00]/5 flex items-center justify-center mb-5">
        <svg className="w-10 h-10 text-[#FF6B00]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d={cfg.svg} />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-white/70 mb-1.5">{title || cfg.title}</h3>
      <p className="text-sm text-white/30 text-center max-w-sm">{description || cfg.desc}</p>

      {action && onAction && (
        <button onClick={onAction}
          className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm hover:shadow-lg hover:shadow-[#FF6B00]/20 transition-all">
          {action}
        </button>
      )}
    </div>
  );
}
