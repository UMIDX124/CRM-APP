"use client";

import { useEffect, useState } from "react";
import { User, Mail, Phone, Building2, Globe, Save, Loader2, Check, AlertCircle } from "lucide-react";
import { clsx } from "clsx";

interface ClientProfile {
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  country: string | null;
  website: string | null;
}

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && !data.error) {
          setProfile({
            companyName: data.companyName || "",
            contactName: data.contactName || "",
            email: data.email || "",
            phone: data.phone || "",
            country: data.country || "",
            website: data.website || "",
          });
        }
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contactName: profile.contactName,
          phone: profile.phone,
          country: profile.country,
          website: profile.website,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Save failed" }));
        setError(data.error || "Failed to save");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-[13px] text-red-400">Failed to load profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Profile</h1>
        <p className="text-sm text-[var(--foreground-dim)] mt-0.5">Manage your contact information</p>
      </div>

      <div className="card p-6 space-y-5">
        {/* Company (read-only) */}
        <div>
          <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Company</label>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--surface-hover)] text-[var(--foreground-muted)] text-[13px]">
            <Building2 className="w-4 h-4 text-[var(--foreground-dim)]" />
            {profile.companyName}
          </div>
          <p className="text-[10px] text-[var(--foreground-dim)] mt-1">Company name can only be changed by your account manager.</p>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Email</label>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--surface-hover)] text-[var(--foreground-muted)] text-[13px]">
            <Mail className="w-4 h-4 text-[var(--foreground-dim)]" />
            {profile.email}
          </div>
          <p className="text-[10px] text-[var(--foreground-dim)] mt-1">This email is used for login. Contact support to change it.</p>
        </div>

        {/* Contact Name (editable) */}
        <div>
          <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Contact Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)] pointer-events-none" />
            <input
              type="text"
              value={profile.contactName}
              onChange={(e) => setProfile({ ...profile, contactName: e.target.value })}
              className="input-field pl-10"
              placeholder="Your name"
            />
          </div>
        </div>

        {/* Phone (editable) */}
        <div>
          <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)] pointer-events-none" />
            <input
              type="tel"
              value={profile.phone || ""}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className="input-field pl-10"
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        {/* Country (editable) */}
        <div>
          <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Country</label>
          <input
            type="text"
            value={profile.country || ""}
            onChange={(e) => setProfile({ ...profile, country: e.target.value })}
            className="input-field"
            placeholder="United States"
          />
        </div>

        {/* Website (editable) */}
        <div>
          <label className="block text-[12px] text-[var(--foreground-dim)] mb-1.5 font-medium">Website</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--foreground-dim)] pointer-events-none" />
            <input
              type="url"
              value={profile.website || ""}
              onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              className="input-field pl-10"
              placeholder="https://yourcompany.com"
            />
          </div>
        </div>

        {error && (
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={clsx(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50",
              saved
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary-dark)]"
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
  );
}
