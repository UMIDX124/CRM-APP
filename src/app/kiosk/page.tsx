"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Hash, Fingerprint } from "lucide-react";
import { clsx } from "clsx";
interface KioskEmployee { id: string; name: string; title: string; brand: string; email: string }

export default function KioskPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pinCode, setPinCode] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [employee, setEmployee] = useState<KioskEmployee | null>(null);
  const [employees, setEmployees] = useState<KioskEmployee[]>([]);

  useEffect(() => {
    fetch("/api/employees")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setEmployees(data.map((e: Record<string, unknown>) => ({
            id: String(e.id),
            name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
            title: String(e.title || ""),
            brand: (e.brand as Record<string, string>)?.code || "",
            email: String(e.email || ""),
          })));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = currentTime.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const handleKey = (key: string) => {
    if (status !== "idle") return;
    if (key === "clear") { setPinCode(""); return; }
    if (key === "enter") {
      const idx = parseInt(pinCode) - 1000;
      const emp = employees[idx];
      if (emp) {
        setEmployee(emp);
        setStatus("success");
        setTimeout(() => { setStatus("idle"); setPinCode(""); setEmployee(null); }, 4000);
      } else {
        setStatus("error");
        setTimeout(() => { setStatus("idle"); setPinCode(""); }, 2500);
      }
      return;
    }
    if (pinCode.length < 4) setPinCode((p) => p + key);
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-[#FF6B00]/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-[#FF6B00]/[0.02] rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="text-center mb-10 relative z-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B00] to-[#E05500] mb-4 shadow-2xl shadow-[#FF6B00]/20">
          <span className="text-2xl font-black text-black">FU</span>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">FU Corp</h1>
        <p className="text-white/30 text-sm mt-1">Attendance Kiosk</p>
      </div>

      {/* Clock */}
      <div className="text-center mb-10 relative z-10">
        <p className="text-6xl font-bold text-white font-mono tracking-widest">{timeStr}</p>
        <p className="text-white/30 text-base mt-2">{dateStr}</p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md relative z-10">
        {status === "success" && employee ? (
          <div className="p-10 rounded-3xl bg-emerald-500/5 border-2 border-emerald-500/20 text-center animate-scale-in">
            <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
            <p className="text-3xl font-bold text-white mb-1">{employee.name}</p>
            <p className="text-emerald-400 text-lg">{employee.title}</p>
            <p className="text-white/30 text-sm mt-2">{employee.brand} &bull; Checked In</p>
            <div className="mt-4 px-6 py-3 rounded-xl bg-emerald-500/10 inline-block">
              <p className="text-emerald-400 text-2xl font-mono font-bold">
                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ) : status === "error" ? (
          <div className="p-10 rounded-3xl bg-red-500/5 border-2 border-red-500/20 text-center animate-scale-in">
            <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-4" />
            <p className="text-2xl font-bold text-red-400">Invalid PIN</p>
            <p className="text-white/30 mt-2">Please try again</p>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] text-center space-y-8">
            <div>
              <Fingerprint className="w-12 h-12 text-[#FF6B00] mx-auto mb-3" />
              <p className="text-white/50 text-sm">Enter your 4-digit PIN to check in</p>
            </div>

            {/* PIN dots */}
            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={clsx(
                  "w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-bold transition-all",
                  pinCode[i]
                    ? "border-[#FF6B00]/60 bg-[#FF6B00]/10 text-[#FF6B00] shadow-lg shadow-[#FF6B00]/10"
                    : "border-white/10 bg-white/[0.02] text-white/15"
                )}>
                  {pinCode[i] ? "\u2022" : ""}
                </div>
              ))}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "enter"].map((key) => (
                <button key={key} onClick={() => handleKey(key)}
                  className={clsx(
                    "py-5 rounded-2xl text-xl font-bold transition-all active:scale-90",
                    key === "enter"
                      ? "bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black shadow-lg shadow-[#FF6B00]/20"
                      : key === "clear"
                      ? "bg-red-500/10 border border-red-500/20 text-red-400 text-base"
                      : "bg-white/[0.05] border border-white/[0.08] text-white hover:bg-white/[0.1] active:bg-white/[0.15]"
                  )}>
                  {key === "clear" ? "CLR" : key === "enter" ? "GO" : key}
                </button>
              ))}
            </div>

            <p className="text-white/15 text-[10px]">Place this screen at office entrance for staff check-in</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-white/15 text-xs mt-8 relative z-10">FU Corp Attendance Kiosk &bull; v1.0</p>
    </div>
  );
}
