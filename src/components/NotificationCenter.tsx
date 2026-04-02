"use client";

import { useState } from "react";
import {
  Bell, X, Check, CheckCheck, Clock, DollarSign, UserPlus, AlertTriangle,
  Trophy, Zap, Shield, BarChart3, Trash2,
} from "lucide-react";
import { clsx } from "clsx";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "info" | "revenue" | "task" | "hire";
  time: string;
  read: boolean;
}

const iconMap = {
  success: { icon: Trophy, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
  info: { icon: Zap, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  revenue: { icon: DollarSign, color: "text-[#FF6B00]", bg: "bg-[#FF6B00]/10" },
  task: { icon: Check, color: "text-blue-400", bg: "bg-blue-500/10" },
  hire: { icon: UserPlus, color: "text-purple-400", bg: "bg-purple-500/10" },
};

const initialNotifications: Notification[] = [
  { id: "1", title: "Deal Won", message: "Cape Town Logistics signed $5,600/mo contract", type: "revenue", time: "2 min ago", read: false },
  { id: "2", title: "Task Completed", message: "Faizan completed Meta Ads Campaign Optimization", type: "task", time: "15 min ago", read: false },
  { id: "3", title: "Invoice Paid", message: "SecureBank paid invoice #INV-045 — $25,000", type: "revenue", time: "1 hr ago", read: false },
  { id: "4", title: "New Employee", message: "Bilal Rashid joined VCS as Video Editor", type: "hire", time: "3 hrs ago", read: true },
  { id: "5", title: "Security Alert", message: "SecureBank passed all security protocols — zero breaches", type: "success", time: "5 hrs ago", read: true },
  { id: "6", title: "Performance Alert", message: "DTC E-Commerce ROAS dropped below 4x target", type: "warning", time: "8 hrs ago", read: true },
  { id: "7", title: "AI Deployed", message: "DataFlow Analytics dashboard live — 98% accuracy", type: "info", time: "1 day ago", read: true },
  { id: "8", title: "Revenue Milestone", message: "DPL crossed $124,890 monthly revenue", type: "revenue", time: "1 day ago", read: true },
];

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF6B00] text-black text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-[380px] max-h-[520px] bg-[#0c0c18] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[400px] scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-sm text-white/30">All caught up!</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const cfg = iconMap[notif.type] || iconMap.info;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => markRead(notif.id)}
                      className={clsx(
                        "flex gap-3 px-5 py-3.5 border-b border-white/[0.04] cursor-pointer transition-colors group",
                        notif.read ? "hover:bg-white/[0.02]" : "bg-white/[0.03] hover:bg-white/[0.05]"
                      )}
                    >
                      <div className={clsx("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                        <Icon className={clsx("w-4 h-4", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={clsx("text-sm font-medium truncate", notif.read ? "text-white/60" : "text-white")}>
                            {notif.title}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-white/20 hover:text-white/50 transition-all shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{notif.message}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Clock className="w-3 h-3 text-white/20" />
                          <span className="text-[10px] text-white/20">{notif.time}</span>
                          {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] ml-1" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
