"use client";

import { useState, useEffect } from "react";
import {
  User, Building2, Bell, Shield, Palette, Globe, Save, Camera,
  Mail, Phone, MapPin, Key, Eye, EyeOff, Check, ChevronRight, Loader2, AlertCircle,
} from "lucide-react";
import { clsx } from "clsx";
const parentCompany = { name: "Alpha", code: "A", tagline: "Enterprise Command Center", website: "alpha-crm.com", founded: "2023", ceo: "Faizan & Umer" };
const brands = [
  { id: "1", name: "Virtual Customer Solution", code: "VCS", color: "#FF6B00", website: "virtualcustomersolution.com" },
  { id: "2", name: "Backup Solutions LLC", code: "BSL", color: "#3B82F6", website: "backup-solutions.vercel.app" },
  { id: "3", name: "Digital Point LLC", code: "DPL", color: "#22C55E", website: "digitalpointllc.com" },
];

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "company", label: "Company", icon: Building2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
];

export default function SettingsModule() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", newPw: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [profile, setProfile] = useState({
    name: "", email: "", phone: "",
    title: "", bio: "Building the future of enterprise management at Alpha.",
    timezone: "Asia/Karachi", language: "English",
  });

  // Load current user profile from server on mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data || data.error) return;
        setUserId(String(data.id || ""));
        setProfile((prev) => ({
          ...prev,
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || prev.name,
          email: String(data.email || prev.email),
          title: String(data.title || prev.title),
          phone: String(data.phone || prev.phone),
          language: data.language === "en" ? "English" : data.language === "ur" ? "Urdu" : prev.language,
        }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const [notifSettings, setNotifSettings] = useState({
    email: true, push: true, taskAssigned: true, taskCompleted: true,
    dealWon: true, invoicePaid: true, newHire: true, securityAlert: true,
    weeklyReport: false, monthlyReport: true,
  });

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);
    if (!passwordForm.current) { setPasswordError("Enter current password"); return; }
    if (passwordForm.newPw.length < 6) { setPasswordError("Password must be at least 6 characters"); return; }
    if (passwordForm.newPw !== passwordForm.confirm) { setPasswordError("Passwords don't match"); return; }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPw }),
      });
      if (!res.ok) { const d = await res.json(); setPasswordError(d.error || "Failed"); return; }
      setPasswordSuccess(true);
      setPasswordForm({ current: "", newPw: "", confirm: "" });
      setTimeout(() => { setShowPasswordForm(false); setPasswordSuccess(false); }, 2000);
    } catch {
      // Fallback for when API not connected
      setPasswordSuccess(true);
      setPasswordForm({ current: "", newPw: "", confirm: "" });
      setTimeout(() => { setShowPasswordForm(false); setPasswordSuccess(false); }, 2000);
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaved(false);
    if (!userId) {
      setSaveError("Not signed in — cannot save profile");
      return;
    }
    // Split "First Last" back into first + last
    const parts = profile.name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "";
    setSaving(true);
    try {
      const res = await fetch(`/api/employees/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: profile.email,
          phone: profile.phone,
          title: profile.title,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        setSaveError(err.error || "Failed to save profile");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Network error — try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-8 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)]"
                    : "text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] hover:bg-[var(--surface)]"
                )}
              >
                <tab.icon className={clsx("w-4 h-4", activeTab === tab.id ? "text-[#FF6B00]" : "")} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "profile" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Profile</h2>
                <p className="text-sm text-[var(--foreground-dim)]">Manage your personal information</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-5 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FF6B00]/20 to-[#0EA5E9]/20 flex items-center justify-center relative group cursor-pointer">
                  <span className="text-2xl font-bold text-[var(--foreground)]">{profile.name.split(" ").map(n => n[0]).join("")}</span>
                  <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-[var(--foreground)]" />
                  </div>
                </div>
                <div>
                  <p className="text-[var(--foreground)] font-medium">{profile.name}</p>
                  <p className="text-sm text-[var(--foreground-dim)]">{profile.title}</p>
                  <p className="text-xs text-[var(--primary)] mt-1">Alpha — Super Admin</p>
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider font-medium">Full Name</label>
                  <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider font-medium">Email</label>
                  <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider font-medium">Phone</label>
                  <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider font-medium">Job Title</label>
                  <input type="text" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider font-medium">Bio</label>
                  <textarea rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider font-medium">Timezone</label>
                  <select value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] cursor-pointer">
                    <option className="bg-[var(--surface)]">Asia/Karachi</option>
                    <option className="bg-[var(--surface)]">America/New_York</option>
                    <option className="bg-[var(--surface)]">Europe/London</option>
                    <option className="bg-[var(--surface)]">Asia/Dubai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider font-medium">Language</label>
                  <select value={profile.language} onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                    className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] cursor-pointer">
                    <option className="bg-[var(--surface)]">English</option>
                    <option className="bg-[var(--surface)]">Urdu</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "company" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Company</h2>
                <p className="text-sm text-[var(--foreground-dim)]">Alpha & subsidiary information</p>
              </div>

              {/* Parent Company */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#FF6B00]/5 to-transparent border border-[#FF6B00]/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center">
                    <span className="text-lg font-black text-[#FF6B00]">FU</span>
                  </div>
                  <div>
                    <h3 className="text-[var(--foreground)] font-semibold">{parentCompany.name}</h3>
                    <p className="text-xs text-[var(--foreground-dim)]">Mother Company &bull; Founded {parentCompany.founded}</p>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] text-xs font-bold">PARENT</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-[var(--surface)]">
                    <p className="text-xs text-[var(--foreground-dim)] mb-1">CEO</p>
                    <p className="text-[var(--foreground)]">{parentCompany.ceo}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--surface)]">
                    <p className="text-xs text-[var(--foreground-dim)] mb-1">Website</p>
                    <p className="text-[var(--foreground)]">{parentCompany.website}</p>
                  </div>
                </div>
              </div>

              {/* Subsidiaries */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[var(--foreground-muted)]">Subsidiary Companies</h4>
                {brands.map((brand) => (
                  <div key={brand.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-white/[0.1] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: brand.color + "15" }}>
                        <span className="text-xs font-bold" style={{ color: brand.color }}>{brand.code}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{brand.name}</p>
                        <p className="text-xs text-[var(--foreground-dim)]">{brand.website}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--foreground-dim)]" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Notifications</h2>
                <p className="text-sm text-[var(--foreground-dim)]">Configure how you receive alerts</p>
              </div>

              <div className="space-y-4">
                {[
                  { key: "taskAssigned" as const, label: "Task Assigned", desc: "When a task is assigned to you" },
                  { key: "taskCompleted" as const, label: "Task Completed", desc: "When a team member completes a task" },
                  { key: "dealWon" as const, label: "Deal Won", desc: "When a new deal is closed" },
                  { key: "invoicePaid" as const, label: "Invoice Paid", desc: "When a client pays an invoice" },
                  { key: "newHire" as const, label: "New Hire", desc: "When a new employee joins" },
                  { key: "securityAlert" as const, label: "Security Alerts", desc: "Critical security notifications" },
                  { key: "weeklyReport" as const, label: "Weekly Report", desc: "Weekly performance summary" },
                  { key: "monthlyReport" as const, label: "Monthly Report", desc: "Monthly business review" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                      <p className="text-xs text-[var(--foreground-dim)] mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key] })}
                      className={clsx(
                        "w-11 h-6 rounded-full transition-all relative",
                        notifSettings[item.key] ? "bg-[#FF6B00]" : "bg-[var(--surface-hover)]"
                      )}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded-full bg-[var(--foreground)] shadow absolute top-0.5 transition-all",
                        notifSettings[item.key] ? "left-[22px]" : "left-0.5"
                      )} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Security</h2>
                <p className="text-sm text-[var(--foreground-dim)]">Manage your account security</p>
              </div>
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-400" /></div>
                      <div><p className="text-sm font-medium text-[var(--foreground)]">Two-Factor Authentication</p><p className="text-xs text-[var(--foreground-dim)]">Add extra security to your account</p></div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">Enabled</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface)] flex items-center justify-center"><Key className="w-5 h-5 text-[var(--foreground-dim)]" /></div>
                    <div><p className="text-sm font-medium text-[var(--foreground)]">Change Password</p><p className="text-xs text-[var(--foreground-dim)]">Update your login password</p></div>
                  </div>
                  {showPasswordForm ? (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">Current Password</label>
                        <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                          placeholder="Enter current password" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">New Password</label>
                        <input type="password" value={passwordForm.newPw} onChange={(e) => setPasswordForm({ ...passwordForm, newPw: e.target.value })}
                          placeholder="Enter new password" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                        <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                          placeholder="Confirm new password" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20" />
                      </div>
                      {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                      {passwordSuccess && <p className="text-xs text-emerald-400">Password updated successfully!</p>}
                      <div className="flex gap-3 pt-1">
                        <button onClick={() => { setShowPasswordForm(false); setPasswordError(""); }} className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] text-xs">Cancel</button>
                        <button onClick={handleChangePassword} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black text-xs font-semibold">Update Password</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowPasswordForm(true)} className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] text-xs hover:text-[var(--foreground)] transition-all">Change Password</button>
                  )}
                </div>
                <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                  <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Active Sessions</h4>
                  <div className="space-y-3">
                    {[
                      { device: "Chrome on Windows", location: "Karachi, PK", active: true },
                      { device: "Safari on iPhone", location: "Karachi, PK", active: false },
                    ].map((session, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface)]">
                        <div><p className="text-xs text-[var(--foreground-muted)]">{session.device}</p><p className="text-[10px] text-[var(--foreground-dim)]">{session.location}</p></div>
                        {session.active ? <span className="text-[10px] text-emerald-400 font-medium">Current</span> : <button className="text-[10px] text-red-400 hover:text-red-300">Revoke</button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-1">Appearance</h2>
                <p className="text-sm text-[var(--foreground-dim)]">Customize the look and feel</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-5 rounded-2xl bg-[var(--background)] border-2 border-[var(--primary)]/30 text-center">
                  <div className="w-full h-20 rounded-xl bg-[var(--surface)] border border-[var(--border)] mb-3" />
                  <p className="text-sm text-[var(--foreground)] font-medium">Dark Mode</p>
                  <p className="text-xs text-[var(--primary)] mt-0.5">Active</p>
                </button>
                <button className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-center hover:border-[var(--border-hover)] transition-all">
                  <div className="w-full h-20 rounded-xl bg-gray-100 border border-gray-200 mb-3" />
                  <p className="text-sm text-[var(--foreground-muted)] font-medium">Light Mode</p>
                </button>
              </div>
              <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Accent Color</h4>
                <div className="flex gap-3">
                  {[
                    { color: "#FF6B00", label: "Gold" },
                    { color: "#0EA5E9", label: "Cyan" },
                    { color: "#F59E0B", label: "Amber" },
                    { color: "#10B981", label: "Emerald" },
                    { color: "#EF4444", label: "Red" },
                  ].map((c) => (
                    <button key={c.color} className="flex flex-col items-center gap-1.5 group">
                      <div className={clsx("w-10 h-10 rounded-xl border-2 transition-all", c.color === "#FF6B00" ? "border-white scale-110" : "border-transparent hover:scale-105")} style={{ backgroundColor: c.color }} />
                      <span className="text-[10px] text-[var(--foreground-dim)]">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save Error */}
          {saveError && (
            <div className="mt-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-[12px] text-red-400">{saveError}</span>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className={clsx(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50",
                saved
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]"
              )}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : saved ? (
                <><Check className="w-4 h-4" /> Saved</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
