"use client";

import { useState } from "react";
import {
  User, Building2, Bell, Shield, Palette, Globe, Save, Camera,
  Mail, Phone, MapPin, Key, Eye, EyeOff, Check, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { parentCompany, brands } from "@/data/mock-data";

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
  const [profile, setProfile] = useState({
    name: "Umer Khan", email: "umi@digitalpointllc.com", phone: "+92 300-7654321",
    title: "Co-Founder & CTO", bio: "Building the future of enterprise management at FU Corp.",
    timezone: "Asia/Karachi", language: "English",
  });
  const [notifSettings, setNotifSettings] = useState({
    email: true, push: true, taskAssigned: true, taskCompleted: true,
    dealWon: true, invoicePaid: true, newHire: true, securityAlert: true,
    weeklyReport: false, monthlyReport: true,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
                    ? "bg-white/[0.06] text-white border border-white/[0.08]"
                    : "text-white/50 hover:text-white/70 hover:bg-white/[0.03]"
                )}
              >
                <tab.icon className={clsx("w-4 h-4", activeTab === tab.id ? "text-[#D4AF37]" : "")} />
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
                <h2 className="text-lg font-semibold text-white mb-1">Profile</h2>
                <p className="text-sm text-white/40">Manage your personal information</p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-5 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#0EA5E9]/20 flex items-center justify-center relative group cursor-pointer">
                  <span className="text-2xl font-bold text-white">{profile.name.split(" ").map(n => n[0]).join("")}</span>
                  <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-white font-medium">{profile.name}</p>
                  <p className="text-sm text-white/40">{profile.title}</p>
                  <p className="text-xs text-[#D4AF37] mt-1">FU Corp — Super Admin</p>
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Full Name</label>
                  <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Email</label>
                  <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Phone</label>
                  <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Job Title</label>
                  <input type="text" value={profile.title} onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Bio</label>
                  <textarea rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 resize-none" />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Timezone</label>
                  <select value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    <option className="bg-[#0f0f1e]">Asia/Karachi</option>
                    <option className="bg-[#0f0f1e]">America/New_York</option>
                    <option className="bg-[#0f0f1e]">Europe/London</option>
                    <option className="bg-[#0f0f1e]">Asia/Dubai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5 uppercase tracking-wider font-medium">Language</label>
                  <select value={profile.language} onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white cursor-pointer">
                    <option className="bg-[#0f0f1e]">English</option>
                    <option className="bg-[#0f0f1e]">Urdu</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "company" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Company</h2>
                <p className="text-sm text-white/40">FU Corp & subsidiary information</p>
              </div>

              {/* Parent Company */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#D4AF37]/5 to-transparent border border-[#D4AF37]/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                    <span className="text-lg font-black text-[#D4AF37]">FU</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{parentCompany.name}</h3>
                    <p className="text-xs text-white/40">Mother Company &bull; Founded {parentCompany.founded}</p>
                  </div>
                  <span className="ml-auto px-3 py-1 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-bold">PARENT</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl bg-white/[0.03]">
                    <p className="text-xs text-white/40 mb-1">CEO</p>
                    <p className="text-white">{parentCompany.ceo}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03]">
                    <p className="text-xs text-white/40 mb-1">Website</p>
                    <p className="text-white">{parentCompany.website}</p>
                  </div>
                </div>
              </div>

              {/* Subsidiaries */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white/60">Subsidiary Companies</h4>
                {brands.map((brand) => (
                  <div key={brand.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: brand.color + "15" }}>
                        <span className="text-xs font-bold" style={{ color: brand.color }}>{brand.code}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{brand.name}</p>
                        <p className="text-xs text-white/40">{brand.website}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Notifications</h2>
                <p className="text-sm text-white/40">Configure how you receive alerts</p>
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
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key] })}
                      className={clsx(
                        "w-11 h-6 rounded-full transition-all relative",
                        notifSettings[item.key] ? "bg-[#D4AF37]" : "bg-white/10"
                      )}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all",
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
                <h2 className="text-lg font-semibold text-white mb-1">Security</h2>
                <p className="text-sm text-white/40">Manage your account security</p>
              </div>
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-400" /></div>
                      <div><p className="text-sm font-medium text-white">Two-Factor Authentication</p><p className="text-xs text-white/40">Add extra security to your account</p></div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">Enabled</span>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"><Key className="w-5 h-5 text-white/50" /></div>
                      <div><p className="text-sm font-medium text-white">Change Password</p><p className="text-xs text-white/40">Last changed 30 days ago</p></div>
                    </div>
                    <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs hover:text-white transition-all">Change</button>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <h4 className="text-sm font-medium text-white mb-3">Active Sessions</h4>
                  <div className="space-y-3">
                    {[
                      { device: "Chrome on Windows", location: "Karachi, PK", active: true },
                      { device: "Safari on iPhone", location: "Karachi, PK", active: false },
                    ].map((session, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                        <div><p className="text-xs text-white/70">{session.device}</p><p className="text-[10px] text-white/30">{session.location}</p></div>
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
                <h2 className="text-lg font-semibold text-white mb-1">Appearance</h2>
                <p className="text-sm text-white/40">Customize the look and feel</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-5 rounded-2xl bg-[#060610] border-2 border-[#D4AF37]/30 text-center">
                  <div className="w-full h-20 rounded-xl bg-[#0a0a14] border border-white/10 mb-3" />
                  <p className="text-sm text-white font-medium">Dark Mode</p>
                  <p className="text-xs text-[#D4AF37] mt-0.5">Active</p>
                </button>
                <button className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center hover:border-white/[0.12] transition-all">
                  <div className="w-full h-20 rounded-xl bg-gray-100 border border-gray-200 mb-3" />
                  <p className="text-sm text-white/60 font-medium">Light Mode</p>
                </button>
              </div>
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <h4 className="text-sm font-medium text-white mb-3">Accent Color</h4>
                <div className="flex gap-3">
                  {[
                    { color: "#D4AF37", label: "Gold" },
                    { color: "#0EA5E9", label: "Cyan" },
                    { color: "#8B5CF6", label: "Purple" },
                    { color: "#10B981", label: "Emerald" },
                    { color: "#EF4444", label: "Red" },
                  ].map((c) => (
                    <button key={c.color} className="flex flex-col items-center gap-1.5 group">
                      <div className={clsx("w-10 h-10 rounded-xl border-2 transition-all", c.color === "#D4AF37" ? "border-white scale-110" : "border-transparent hover:scale-105")} style={{ backgroundColor: c.color }} />
                      <span className="text-[10px] text-white/40">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              className={clsx(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all",
                saved
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-black hover:shadow-lg hover:shadow-[#D4AF37]/20"
              )}
            >
              {saved ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
