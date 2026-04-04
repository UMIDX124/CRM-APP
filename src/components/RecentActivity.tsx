"use client";

import { CheckCircle, Trophy, DollarSign, UserPlus, MessageCircle, Star, AlertCircle, Clock } from "lucide-react";
import { clsx } from "clsx";

interface Activity {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  icon: string;
}

const iconMap: Record<string, React.ElementType> = {
  check: CheckCircle,
  trophy: Trophy,
  dollar: DollarSign,
  "user-plus": UserPlus,
  message: MessageCircle,
  star: Star,
  alert: AlertCircle,
  clock: Clock,
};

const iconColors: Record<string, string> = {
  check: "#22C55E",
  trophy: "#FF6B00",
  dollar: "#22C55E",
  "user-plus": "#3B82F6",
  message: "#F59E0B",
  star: "#FF6B00",
  alert: "#EF4444",
  clock: "#6B7280",
};

const activities: Activity[] = [
  {
    id: "1",
    type: "task_completed",
    title: "Task Completed",
    message: "Ahmed Khan completed 'Weekly SEO Report' for TechFlow Solutions",
    time: "5 minutes ago",
    icon: "check",
  },
  {
    id: "2",
    type: "lead_won",
    title: "New Client Won",
    message: "Cape Town Logistics signed up for SDR services",
    time: "2 hours ago",
    icon: "trophy",
  },
  {
    id: "3",
    type: "invoice_paid",
    title: "Invoice Paid",
    message: "Gulf Tech Industries paid invoice #INV-2026-034",
    time: "3 hours ago",
    icon: "dollar",
  },
  {
    id: "4",
    type: "task_assigned",
    title: "Task Assigned",
    message: "Ali Raza assigned to 'Website Migration' for Gulf Tech",
    time: "4 hours ago",
    icon: "user-plus",
  },
  {
    id: "5",
    type: "client_update",
    title: "Client Update",
    message: "New feedback received from Sydney Scale Up",
    time: "5 hours ago",
    icon: "message",
  },
  {
    id: "6",
    type: "lead_new",
    title: "New Lead",
    message: "Tokyo Tech Ventures submitted inquiry via VCS website",
    time: "8 hours ago",
    icon: "star",
  },
  {
    id: "7",
    type: "task_overdue",
    title: "Task Overdue",
    message: "Content Calendar Q2 is past due for Berlin Digital",
    time: "1 day ago",
    icon: "alert",
  },
  {
    id: "8",
    type: "time_logged",
    title: "Time Logged",
    message: "Hamza Ali logged 4 hours on Security Audit",
    time: "1 day ago",
    icon: "clock",
  },
];

export default function RecentActivity() {
  return (
    <div className="relative rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-[var(--border)] p-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: "#F59E0B" }} />

      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Recent Activity</h3>
          <p className="text-sm text-[var(--foreground-dim)] mt-0.5">Latest updates across all modules</p>
        </div>
        <button className="text-xs text-[#FF6B00] hover:text-[#FF8A33] transition-colors font-medium">
          View All
        </button>
      </div>

      <div className="space-y-1">
        {activities.map((activity, index) => {
          const Icon = iconMap[activity.icon] || Star;
          const iconColor = iconColors[activity.icon] || "#6B7280";

          return (
            <div
              key={activity.id}
              className={clsx(
                "flex items-start gap-4 p-3 rounded-xl transition-all duration-200",
                "hover:bg-[var(--surface)] cursor-pointer group"
              )}
              style={{
                animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${iconColor}20` }}
              >
                <Icon className="w-4 h-4" style={{ color: iconColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--foreground)] group-hover:text-[#FF6B00] transition-colors">
                    {activity.title}
                  </p>
                  <span className="text-xs text-[var(--foreground-dim)] shrink-0">{activity.time}</span>
                </div>
                <p className="text-xs text-[var(--foreground-dim)] mt-0.5 line-clamp-2">{activity.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
