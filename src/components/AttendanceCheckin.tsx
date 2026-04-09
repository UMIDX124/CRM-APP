"use client";

import { useState, useEffect } from "react";
import {
  Clock, CheckCircle2, LogIn, LogOut, Shield, AlertTriangle, Timer, Hash,
} from "lucide-react";
import { clsx } from "clsx";

type CheckInMode = "self" | "admin" | "pin";

/**
 * Shape we get from /api/employees?minimal=1 — flat name, title, and
 * brand code. Kept local because this component is the only consumer.
 */
interface KioskEmployee {
  id: string;
  name: string;
  title: string;
  brand: string;
}

/**
 * Response from POST /api/attendance/pin-verify — identity of the matched
 * employee. The server never returns the PIN itself.
 */
interface PinVerifiedEmployee {
  id: string;
  name: string;
  title: string;
  email?: string;
  brand: string;
}

export default function AttendanceCheckin() {
  const [mode, setMode] = useState<CheckInMode>("self");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<Date | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [adminAction, setAdminAction] = useState<"checkin" | "checkout" | "leave" | "absent">("checkin");
  const [pinCode, setPinCode] = useState("");
  const [pinEmployee, setPinEmployee] = useState<PinVerifiedEmployee | null>(null);
  const [pinStatus, setPinStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [pinError, setPinError] = useState<string | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<{ name: string; time: string; type: string }[]>([]);

  // Admin panel needs the employee roster. We fetch the minimal set on
  // mount so the select populates without every full employee record.
  const [employees, setEmployees] = useState<KioskEmployee[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/employees?minimal=1")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped: KioskEmployee[] = data.map((u: unknown) => {
          const emp = u as Record<string, unknown>;
          const brandObj = emp.brand as Record<string, unknown> | null;
          return {
            id: String(emp.id),
            name: `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim(),
            title: emp.title ? String(emp.title) : "",
            brand: brandObj ? String(brandObj.code ?? "") : "",
          };
        });
        setEmployees(mapped);
      })
      .catch((err) => {
        console.error("[checkin] employee roster fetch failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // PIN check-in — verify against server-side bcrypt compare. Never
  // derive identity from PIN on the client; the old empIndex hack
  // leaked every employee's PIN to anyone reading /api/employees.
  const handlePinSubmit = async () => {
    if (pinCode.length < 4) return;
    setPinStatus("verifying");
    setPinError(null);
    try {
      const res = await fetch("/api/attendance/pin-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinCode }),
      });
      if (res.status === 429) {
        setPinStatus("error");
        setPinError("Too many attempts — try again later");
        setTimeout(() => { setPinStatus("idle"); setPinCode(""); setPinError(null); }, 3000);
        return;
      }
      if (!res.ok) {
        setPinStatus("error");
        setPinError("Invalid PIN");
        setTimeout(() => { setPinStatus("idle"); setPinCode(""); setPinError(null); }, 2000);
        return;
      }
      const data = (await res.json()) as PinVerifiedEmployee;
      setPinEmployee(data);
      setPinStatus("success");
      const now = new Date();
      addRecent(
        data.name,
        now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        "PIN Check In"
      );
      setTimeout(() => {
        setPinStatus("idle");
        setPinCode("");
        setPinEmployee(null);
      }, 3000);
    } catch (err) {
      console.error("[checkin] pin-verify network error:", err);
      setPinStatus("error");
      setPinError("Connection failed");
      setTimeout(() => { setPinStatus("idle"); setPinCode(""); setPinError(null); }, 2000);
    }
  };

  const addRecent = (name: string, time: string, type: string) => {
    setRecentCheckins((prev) => [{ name, time, type }, ...prev].slice(0, 10));
  };

  const handlePinKey = (key: string) => {
    if (key === "clear") { setPinCode(""); return; }
    if (key === "enter") { void handlePinSubmit(); return; }
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
      <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-[var(--primary)]/5 to-transparent border border-[var(--primary)]/10">
        <p className="text-5xl font-bold text-[var(--foreground)] font-mono tracking-wider">{timeStr}</p>
        <p className="text-[var(--foreground-dim)] text-sm mt-2">{dateStr}</p>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 p-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
        {([
          ["self", "Self Check-in", LogIn],
          ["admin", "Admin Panel", Shield],
          ["pin", "PIN Kiosk", Hash],
        ] as const).map(([m, label, Icon]) => (
          <button key={m} onClick={() => setMode(m)}
            className={clsx("flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all",
              mode === m ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20" : "text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)]")}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ═══ SELF CHECK-IN ═══ */}
      {mode === "self" && (
        <div className="p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5 flex items-center justify-center">
            {checkedIn ? <CheckCircle2 className="w-10 h-10 text-emerald-400" /> : <Clock className="w-10 h-10 text-[var(--primary)]" />}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[var(--foreground)]">
              {checkedIn ? "You're Checked In" : "Ready to Check In?"}
            </h3>
            <p className="text-[var(--foreground-dim)] text-sm mt-1">
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
                <Timer className="w-3.5 h-3.5 text-[var(--foreground-dim)]" />
                <span className="text-[var(--foreground-dim)]">{hoursWorked}h</span>
              </div>
            </div>
          )}

          <button
            onClick={checkedIn ? handleSelfCheckOut : handleSelfCheckIn}
            className={clsx(
              "px-10 py-4 rounded-2xl font-semibold text-lg transition-all",
              checkedIn
                ? "bg-red-500/10 border-2 border-red-500/30 text-red-400 hover:bg-red-500/20"
                : "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-black hover:shadow-lg hover:shadow-[var(--primary)]/25"
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
        <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[var(--primary)]" />
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Admin Attendance Marking</h3>
          </div>
          <p className="text-[var(--foreground-dim)] text-sm">Mark attendance for any employee on file.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--foreground-dim)] mb-2 uppercase tracking-wider font-medium">Select Employee</label>
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] cursor-pointer">
                <option value="" className="bg-[var(--surface)]">
                  {employees.length === 0 ? "Loading roster…" : "Choose employee..."}
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id} className="bg-[var(--surface)]">
                    {emp.name} — {emp.title} ({emp.brand})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--foreground-dim)] mb-2 uppercase tracking-wider font-medium">Action</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["checkin", "Check In", "emerald"],
                  ["checkout", "Check Out", "red"],
                  ["leave", "Leave", "amber"],
                  ["absent", "Absent", "amber"],
                ] as const).map(([action, label, color]) => (
                  <button key={action} onClick={() => setAdminAction(action)}
                    className={clsx(
                      "px-3 py-2.5 rounded-xl text-xs font-medium border transition-all",
                      adminAction === action
                        ? ""
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)]"
                    )}
                    style={adminAction === action ? {
                      backgroundColor: color === "emerald" ? "rgba(16,185,129,0.1)" : color === "red" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                      borderColor: color === "emerald" ? "rgba(16,185,129,0.2)" : color === "red" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                      color: color === "emerald" ? "#10B981" : color === "red" ? "#EF4444" : "#F59E0B",
                    } : undefined}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleAdminMark} disabled={!selectedEmployee}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-black font-semibold text-sm hover:shadow-lg hover:shadow-[var(--primary)]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            Mark Attendance
          </button>
        </div>
      )}

      {/* ═══ PIN KIOSK ═══ */}
      {mode === "pin" && (
        <div className="max-w-sm mx-auto p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center space-y-6">
          <div>
            <Hash className="w-10 h-10 text-[var(--primary)] mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-[var(--foreground)]">PIN Check-In</h3>
            <p className="text-[var(--foreground-dim)] text-xs mt-1">Enter your 4-digit employee PIN</p>
          </div>

          {/* PIN display */}
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={clsx(
                "w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all",
                pinCode[i]
                  ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-dim)]"
              )}>
                {pinCode[i] ? "*" : ""}
              </div>
            ))}
          </div>

          {/* Status message */}
          {pinStatus === "verifying" && (
            <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-[var(--foreground-dim)] text-sm">Verifying…</p>
            </div>
          )}
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
              <p className="text-red-400 font-medium">{pinError || "Invalid PIN"}</p>
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
                      ? "bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)]"
                      : key === "clear"
                      ? "bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                      : "bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                  )}>
                  {key === "clear" ? "CLR" : key === "enter" ? "GO" : key}
                </button>
              ))}
            </div>
          )}

          <p className="text-[var(--foreground-dim)] text-[10px]">
            PIN is verified server-side with bcrypt — your input is never
            compared client-side.
          </p>
        </div>
      )}

      {/* Recent Activity */}
      {recentCheckins.length > 0 && (
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--primary)]" />
            Recent Check-ins
          </h4>
          <div className="space-y-2">
            {recentCheckins.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--surface)]">
                <div className="flex items-center gap-3">
                  <div className={clsx("w-2 h-2 rounded-full",
                    item.type.includes("In") ? "bg-emerald-400" : item.type.includes("Out") ? "bg-red-400" : "bg-amber-400"
                  )} />
                  <span className="text-sm text-[var(--foreground)]">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--foreground-dim)]">{item.type}</span>
                  <span className="text-xs text-[var(--foreground-dim)] font-mono">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
