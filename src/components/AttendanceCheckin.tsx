"use client";

import { useState, useEffect } from "react";
import {
  Clock, CheckCircle2, LogIn, LogOut, MapPin, Fingerprint, Users,
  Shield, AlertTriangle, Timer, Hash,
} from "lucide-react";
import { clsx } from "clsx";
import { employees, brands } from "@/data/mock-data";
import type { Employee } from "@/data/mock-data";

type CheckInMode = "self" | "admin" | "pin";

export default function AttendanceCheckin() {
  const [mode, setMode] = useState<CheckInMode>("self");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [adminAction, setAdminAction] = useState<"checkin" | "checkout" | "leave" | "absent">("checkin");
  const [pinCode, setPinCode] = useState("");
  const [pinEmployee, setPinEmployee] = useState<Employee | null>(null);
  const [pinStatus, setPinStatus] = useState<"idle" | "success" | "error">("idle");
  const [recentCheckins, setRecentCheckins] = useState<{ name: string; time: string; type: string }[]>([]);

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Self check-in
  const handleSelfCheckIn = () => {
    const now = new Date();
    setCheckInTime(now);
    setCheckedIn(true);
    addRecent("You", now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), "Check In");
  };

  const handleSelfCheckOut = () => {
    const now = new Date();
    setCheckOutTime(now);
    setCheckedIn(false);
    addRecent("You", now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), "Check Out");
  };

  // Admin mark
  const handleAdminMark = () => {
    if (!selectedEmployee) return;
    const emp = employees.find((e) => e.id === selectedEmployee);
    if (!emp) return;
    const now = new Date();
    const timeLabel = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const actionLabels = { checkin: "Check In", checkout: "Check Out", leave: "Leave", absent: "Absent" };
    addRecent(emp.name, timeLabel, actionLabels[adminAction]);
    setSelectedEmployee("");
  };

  // PIN check-in (each employee has a 4-digit PIN = last 4 of their phone or id-based)
  const handlePinSubmit = () => {
    // Simple PIN mapping: employee index + 1000
    const empIndex = parseInt(pinCode) - 1000;
    const emp = employees[empIndex];
    if (emp) {
      setPinEmployee(emp);
      setPinStatus("success");
      const now = new Date();
      addRecent(emp.name, now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }), "PIN Check In");
      setTimeout(() => { setPinStatus("idle"); setPinCode(""); setPinEmployee(null); }, 3000);
    } else {
      setPinStatus("error");
      setTimeout(() => { setPinStatus("idle"); setPinCode(""); }, 2000);
    }
  };

  const addRecent = (name: string, time: string, type: string) => {
    setRecentCheckins((prev) => [{ name, time, type }, ...prev].slice(0, 10));
  };

  const handlePinKey = (key: string) => {
    if (key === "clear") { setPinCode(""); return; }
    if (key === "enter") { handlePinSubmit(); return; }
    if (pinCode.length < 4) setPinCode((prev) => prev + key);
  };

  // Calculate hours worked
  const hoursWorked = checkInTime && !checkOutTime
    ? ((currentTime.getTime() - checkInTime.getTime()) / 3600000).toFixed(1)
    : checkInTime && checkOutTime
    ? ((checkOutTime.getTime() - checkInTime.getTime()) / 3600000).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-8">
      {/* Live Clock */}
      <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-[#FF6B00]/5 to-transparent border border-[#FF6B00]/10">
        <p className="text-5xl font-bold text-white font-mono tracking-wider">{timeStr}</p>
        <p className="text-white/40 text-sm mt-2">{dateStr}</p>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {([
          ["self", "Self Check-in", LogIn],
          ["admin", "Admin Panel", Shield],
          ["pin", "PIN Kiosk", Hash],
        ] as const).map(([m, label, Icon]) => (
          <button key={m} onClick={() => setMode(m)}
            className={clsx("flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              mode === m ? "bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/20" : "text-white/40 hover:text-white/60")}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ═══ SELF CHECK-IN ═══ */}
      {mode === "self" && (
        <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[#FF6B00]/20 to-[#FF6B00]/5 flex items-center justify-center">
            {checkedIn ? <CheckCircle2 className="w-10 h-10 text-emerald-400" /> : <Clock className="w-10 h-10 text-[#FF6B00]" />}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white">
              {checkedIn ? "You're Checked In" : "Ready to Check In?"}
            </h3>
            <p className="text-white/40 text-sm mt-1">
              {checkedIn
                ? `Since ${checkInTime?.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} — ${hoursWorked}h worked`
                : "Tap the button to start your day"}
            </p>
          </div>

          {/* Status badges */}
          {checkInTime && (
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{checkInTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              {checkOutTime && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400">{checkOutTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <Timer className="w-3.5 h-3.5 text-white/50" />
                <span className="text-white/50">{hoursWorked}h</span>
              </div>
            </div>
          )}

          <button
            onClick={checkedIn ? handleSelfCheckOut : handleSelfCheckIn}
            className={clsx(
              "px-10 py-4 rounded-2xl font-semibold text-lg transition-all",
              checkedIn
                ? "bg-red-500/10 border-2 border-red-500/30 text-red-400 hover:bg-red-500/20"
                : "bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black hover:shadow-lg hover:shadow-[#FF6B00]/25"
            )}
          >
            {checkedIn ? (
              <span className="flex items-center gap-2"><LogOut className="w-5 h-5" /> Check Out</span>
            ) : (
              <span className="flex items-center gap-2"><LogIn className="w-5 h-5" /> Check In Now</span>
            )}
          </button>
        </div>
      )}

      {/* ═══ ADMIN PANEL ═══ */}
      {mode === "admin" && (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[#FF6B00]" />
            <h3 className="text-lg font-semibold text-white">Admin Attendance Marking</h3>
          </div>
          <p className="text-white/40 text-sm">Mark attendance for any employee — peons, office boys, tech staff, everyone.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">Select Employee</label>
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white cursor-pointer">
                <option value="" className="bg-[#111114]">Choose employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-[#111114]">{emp.name} — {emp.title} ({emp.brand})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">Action</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["checkin", "Check In", "emerald"],
                  ["checkout", "Check Out", "red"],
                  ["leave", "Leave", "purple"],
                  ["absent", "Absent", "amber"],
                ] as const).map(([action, label, color]) => (
                  <button key={action} onClick={() => setAdminAction(action)}
                    className={clsx("px-3 py-2.5 rounded-xl text-xs font-medium border transition-all",
                      adminAction === action
                        ? `bg-${color}-500/10 border-${color}-500/20 text-${color}-400`
                        : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:text-white/60"
                    )}
                    style={adminAction === action ? {
                      backgroundColor: color === "emerald" ? "rgba(16,185,129,0.1)" : color === "red" ? "rgba(239,68,68,0.1)" : color === "purple" ? "rgba(139,92,246,0.1)" : "rgba(245,158,11,0.1)",
                      borderColor: color === "emerald" ? "rgba(16,185,129,0.2)" : color === "red" ? "rgba(239,68,68,0.2)" : color === "purple" ? "rgba(139,92,246,0.2)" : "rgba(245,158,11,0.2)",
                      color: color === "emerald" ? "#10B981" : color === "red" ? "#EF4444" : color === "purple" ? "#8B5CF6" : "#F59E0B",
                    } : undefined}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleAdminMark} disabled={!selectedEmployee}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm hover:shadow-lg hover:shadow-[#FF6B00]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            Mark Attendance
          </button>
        </div>
      )}

      {/* ═══ PIN KIOSK ═══ */}
      {mode === "pin" && (
        <div className="max-w-sm mx-auto p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center space-y-6">
          <div>
            <Hash className="w-10 h-10 text-[#FF6B00] mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white">PIN Check-In</h3>
            <p className="text-white/40 text-xs mt-1">Enter your 4-digit employee PIN</p>
          </div>

          {/* PIN display */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={clsx(
                "w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all",
                pinCode[i]
                  ? "border-[#FF6B00]/50 bg-[#FF6B00]/10 text-[#FF6B00]"
                  : "border-white/10 bg-white/[0.03] text-white/20"
              )}>
                {pinCode[i] ? "*" : ""}
              </div>
            ))}
          </div>

          {/* Status message */}
          {pinStatus === "success" && pinEmployee && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-400 font-medium">{pinEmployee.name}</p>
              <p className="text-emerald-400/60 text-xs">Checked in successfully!</p>
            </div>
          )}
          {pinStatus === "error" && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 font-medium">Invalid PIN</p>
              <p className="text-red-400/60 text-xs">Please try again</p>
            </div>
          )}

          {/* Number pad */}
          {pinStatus === "idle" && (
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "enter"].map((key) => (
                <button key={key} onClick={() => handlePinKey(key)}
                  className={clsx(
                    "py-4 rounded-xl text-lg font-semibold transition-all active:scale-95",
                    key === "enter"
                      ? "bg-[#FF6B00]/10 border border-[#FF6B00]/20 text-[#FF6B00]"
                      : key === "clear"
                      ? "bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                      : "bg-white/[0.04] border border-white/[0.08] text-white hover:bg-white/[0.08]"
                  )}>
                  {key === "clear" ? "CLR" : key === "enter" ? "GO" : key}
                </button>
              ))}
            </div>
          )}

          <p className="text-white/20 text-[10px]">
            PIN codes: 1000-{999 + employees.length} (employee #{"{1-" + employees.length + "}"})
          </p>
        </div>
      )}

      {/* Recent Activity */}
      {recentCheckins.length > 0 && (
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FF6B00]" />
            Recent Check-ins
          </h4>
          <div className="space-y-2">
            {recentCheckins.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className={clsx("w-2 h-2 rounded-full",
                    item.type.includes("In") ? "bg-emerald-400" : item.type.includes("Out") ? "bg-red-400" : "bg-amber-400"
                  )} />
                  <span className="text-sm text-white">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40">{item.type}</span>
                  <span className="text-xs text-white/30 font-mono">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
