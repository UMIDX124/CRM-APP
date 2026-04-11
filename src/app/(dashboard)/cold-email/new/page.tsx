"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Search, Shield, Sparkles, Rocket,
  Loader2, Check, X, RefreshCw, Globe, AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

const NICHES = [
  "HVAC", "Dental", "Legal", "Plumbing", "Roofing", "Landscaping",
  "Auto Repair", "Restaurant", "Real Estate", "Accounting", "Cleaning",
  "Photography", "Veterinary", "Fitness", "Salon", "Custom",
];

const DAYS = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

interface WebsiteEntry {
  url: string;
  businessName: string;
}

interface ProspectResult {
  id: string;
  email: string;
  firstName: string | null;
  company: string | null;
  website: string | null;
  emailStatus: string;
}

interface EmailPreview {
  prospectId?: string;
  leadId?: string;
  subject: string;
  body: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  // Wizard state
  const [step, setStep] = useState(1);

  // Step 1 — Target
  const [campaignName, setCampaignName] = useState("");
  const [niche, setNiche] = useState("HVAC");
  const [location, setLocation] = useState("");
  const [websites, setWebsites] = useState<WebsiteEntry[]>([{ url: "", businessName: "" }]);
  const [scraping, setScraping] = useState(false);
  const [prospects, setProspects] = useState<ProspectResult[]>([]);
  const [prospectIds, setProspectIds] = useState<string[]>([]);
  const [scrapeStats, setScrapeStats] = useState<{ scraped: number; saved: number; duplicates: number } | null>(null);
  const [manualEntry, setManualEntry] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  // Step 2 — Email Setup
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPassword, setSenderPassword] = useState("");
  const [dailyLimit, setDailyLimit] = useState(20);
  const [sendingDays, setSendingDays] = useState(["mon", "tue", "wed", "thu", "fri"]);
  const [sendingHoursStart, setSendingHoursStart] = useState("09:00");
  const [sendingHoursEnd, setSendingHoursEnd] = useState("17:00");

  // Step 3 — AI Email
  const [systemPrompt, setSystemPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [emailPreviews, setEmailPreviews] = useState<EmailPreview[]>([]);

  // Step 4 — Launch
  const [verifying, setVerifying] = useState(false);
  const [verifyDone, setVerifyDone] = useState(false);
  const [genAllDone, setGenAllDone] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  // ─── Handlers ──────────────────────────────────────

  function addWebsiteRow() {
    setWebsites([...websites, { url: "", businessName: "" }]);
  }

  function updateWebsite(idx: number, field: "url" | "businessName", val: string) {
    const updated = [...websites];
    updated[idx][field] = val;
    setWebsites(updated);
  }

  function removeWebsite(idx: number) {
    setWebsites(websites.filter((_, i) => i !== idx));
  }

  async function handleScrape() {
    const validSites = websites.filter((w) => w.url.trim());
    if (validSites.length === 0) {
      toastError("Add at least one website URL");
      return;
    }

    setScraping(true);
    setScrapeStats(null);
    try {
      const res = await fetch("/api/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websites: validSites.map((w) => ({
            url: w.url.trim(),
            businessName: w.businessName.trim() || undefined,
            niche,
            city: location || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Scraping failed");
      }

      const data = await res.json();
      setScrapeStats({ scraped: data.scraped, saved: data.saved, duplicates: data.duplicates });
      setProspectIds(data.prospectIds || []);

      // Fetch prospect details
      if (data.prospectIds?.length > 0) {
        const prospectRes = await fetch("/api/cold-email/prospects?" + new URLSearchParams({ ids: data.prospectIds.join(",") }));
        if (prospectRes.ok) {
          const pData = await prospectRes.json();
          setProspects(pData.prospects || []);
        }
      }

      success(`Found ${data.scraped} prospects with emails`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Scraping failed");
    } finally {
      setScraping(false);
    }
  }

  async function handleAddManualProspects() {
    const lines = manualEntry
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toastError("Paste at least one email address");
      return;
    }

    const parsed = lines.map((line) => {
      const [email, firstName, company] = line.split(",").map((s) => s?.trim());
      return {
        email: email || "",
        firstName: firstName || undefined,
        company: company || undefined,
        niche,
        city: location || undefined,
      };
    });

    setAddingManual(true);
    try {
      const res = await fetch("/api/cold-email/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospects: parsed }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add prospects");
      }

      const data = await res.json();
      const newIds: string[] = data.prospectIds || [];
      setProspectIds((prev) => Array.from(new Set([...prev, ...newIds])));
      setScrapeStats({
        scraped: newIds.length,
        saved: data.saved || 0,
        duplicates: data.duplicates || 0,
      });

      if (newIds.length > 0) {
        const prospectRes = await fetch(
          "/api/cold-email/prospects?" + new URLSearchParams({ ids: newIds.join(",") })
        );
        if (prospectRes.ok) {
          const pData = await prospectRes.json();
          setProspects((prev) => {
            const merged = [...prev];
            for (const p of pData.prospects || []) {
              if (!merged.some((m) => m.id === p.id)) merged.push(p);
            }
            return merged;
          });
        }
      }

      setManualEntry("");
      success(`Added ${data.saved} new prospects (${data.duplicates} already existed)`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to add prospects");
    } finally {
      setAddingManual(false);
    }
  }

  function toggleDay(day: string) {
    setSendingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function createCampaignIfNeeded(): Promise<string | null> {
    if (campaignId) return campaignId;

    try {
      const res = await fetch("/api/cold-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName || `${niche} Campaign`,
          niche,
          location: location || null,
          senderName,
          senderEmail,
          senderPassword,
          dailyLimit,
          sendingDays: sendingDays.join(","),
          sendingHours: `${sendingHoursStart}-${sendingHoursEnd}`,
          systemPrompt: systemPrompt || null,
          sequences: [
            { stepNumber: 1, delayDays: 0, subject: "{{subject}}", bodyTemplate: "{{body}}" },
          ],
        }),
      });

      if (!res.ok) throw new Error("Failed to create campaign");
      const data = await res.json();
      const newId = data.campaign.id;
      setCampaignId(newId);

      // Add prospects to campaign
      if (prospectIds.length > 0) {
        await fetch(`/api/cold-email/${newId}/leads`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prospectIds }),
        });
      }

      return newId;
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to create campaign");
      return null;
    }
  }

  async function handleGeneratePreview() {
    setGenerating(true);
    setEmailPreviews([]);
    try {
      const cId = await createCampaignIfNeeded();
      if (!cId) return;

      const res = await fetch(`/api/cold-email/${cId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setEmailPreviews(data.previews || []);
      success(`Generated ${data.generated} emails`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleVerifyEmails() {
    if (prospects.length === 0) {
      toastError("No prospects to verify");
      return;
    }
    setVerifying(true);
    try {
      const emails = prospects.map((p) => p.email);
      const res = await fetch("/api/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!res.ok) throw new Error("Verification failed");
      const data = await res.json();
      success(`Verified: ${data.summary.valid} valid, ${data.summary.invalid} invalid, ${data.summary.risky} risky`);
      setVerifyDone(true);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function handleGenerateAll() {
    setGeneratingAll(true);
    try {
      const cId = await createCampaignIfNeeded();
      if (!cId) return;

      const res = await fetch(`/api/cold-email/${cId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      success(`Generated ${data.generated} emails`);
      setGenAllDone(true);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingAll(false);
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    try {
      const cId = await createCampaignIfNeeded();
      if (!cId) return;

      const res = await fetch(`/api/cold-email/${cId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error("Launch failed");
      success("Campaign launched! Emails will send on schedule.");
      router.push(`/cold-email/${cId}`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Launch failed");
    } finally {
      setLaunching(false);
    }
  }

  // ─── Render ────────────────────────────────────────

  const steps = [
    { num: 1, label: "Target", icon: Search },
    { num: 2, label: "Email Setup", icon: Shield },
    { num: 3, label: "AI Email", icon: Sparkles },
    { num: 4, label: "Launch", icon: Rocket },
  ];

  const canGoNext = () => {
    if (step === 1) return true;
    if (step === 2) return senderName && senderEmail && senderPassword;
    if (step === 3) return true;
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/cold-email")}
        className="flex items-center gap-1.5 text-sm text-[var(--foreground-dim)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Campaigns
      </button>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              onClick={() => step > s.num && setStep(s.num)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                step === s.num
                  ? "bg-[var(--primary)] text-black"
                  : step > s.num
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground-dim)]"
              }`}
            >
              {step > s.num ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && <div className="w-6 h-px bg-[var(--border)]" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">

        {/* ─── STEP 1: TARGET ─── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">Find Prospects</h3>
              <p className="text-sm text-[var(--foreground-dim)]">Add business websites to scrape for contact emails.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Denver HVAC Outreach"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">Niche</label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                >
                  {NICHES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Denver, Colorado"
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
              />
            </div>

            {/* Website list */}
            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">Business Websites</label>
              <div className="space-y-2">
                {websites.map((w, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={w.url}
                      onChange={(e) => updateWebsite(idx, "url", e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                    />
                    <input
                      type="text"
                      value={w.businessName}
                      onChange={(e) => updateWebsite(idx, "businessName", e.target.value)}
                      placeholder="Business name (optional)"
                      className="w-48 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                    />
                    {websites.length > 1 && (
                      <button onClick={() => removeWebsite(idx)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addWebsiteRow} className="mt-2 text-sm text-[var(--primary)] hover:underline">
                + Add another website
              </button>
            </div>

            <button
              onClick={handleScrape}
              disabled={scraping || !websites.some((w) => w.url.trim())}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              {scraping ? "Scraping..." : "Scrape for Emails"}
            </button>

            {/* Manual prospect entry — fallback when scraping times out or URLs aren't known */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)]">Or add prospects manually</p>
                  <p className="text-xs text-[var(--foreground-dim)] mt-0.5">
                    One per line. Format: <code className="text-[var(--primary)]">email@domain.com, First Name, Company</code> (name &amp; company optional).
                  </p>
                </div>
              </div>
              <textarea
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                rows={5}
                placeholder={"john@acme.com, John, Acme Inc\nsarah@example.com\ninfo@biz.co, , Biz Co"}
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 resize-y"
              />
              <button
                onClick={handleAddManualProspects}
                disabled={addingManual || !manualEntry.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border)] font-medium text-sm hover:border-[var(--primary)] transition-colors disabled:opacity-50"
              >
                {addingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {addingManual ? "Adding..." : "Add Prospects"}
              </button>
            </div>

            {/* Results */}
            {scrapeStats && (
              <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--foreground)]">
                  Found <strong>{scrapeStats.scraped}</strong> prospects with emails.
                  {scrapeStats.saved > 0 && <> Saved <strong>{scrapeStats.saved}</strong> new.</>}
                  {scrapeStats.duplicates > 0 && <> <span className="text-[var(--foreground-dim)]">{scrapeStats.duplicates} already existed.</span></>}
                </p>
              </div>
            )}

            {prospectIds.length > 0 && (
              <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3">
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">{prospectIds.length} prospects ready</p>
                <div className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Prospects added to campaign pool
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 2: EMAIL SETUP ─── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">Sender Configuration</h3>
              <p className="text-sm text-[var(--foreground-dim)]">Configure your Gmail sender account and sending schedule.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">Gmail Address</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">Gmail App Password</label>
              <input
                type="password"
                value={senderPassword}
                onChange={(e) => setSenderPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
              />
              <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-300">
                  Use a Gmail App Password, not your regular password. Go to Google Account &rarr; Security &rarr; 2-Step Verification &rarr; App Passwords to generate one.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">
                Daily Send Limit: <span className="text-[var(--primary)]">{dailyLimit}</span>
              </label>
              <input
                type="range"
                min={5}
                max={50}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value, 10))}
                className="w-full accent-[var(--primary)]"
              />
              <div className="flex justify-between text-xs text-[var(--foreground-dim)]">
                <span>5</span><span>50</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-2">Sending Days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      sendingDays.includes(d.key)
                        ? "bg-[var(--primary)] text-black"
                        : "bg-[var(--background)] text-[var(--foreground-dim)] border border-[var(--border)]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">Start Hour (UTC)</label>
                <input
                  type="time"
                  value={sendingHoursStart}
                  onChange={(e) => setSendingHoursStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">End Hour (UTC)</label>
                <input
                  type="time"
                  value={sendingHoursEnd}
                  onChange={(e) => setSendingHoursEnd(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: AI EMAIL ─── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">AI-Generated Emails</h3>
              <p className="text-sm text-[var(--foreground-dim)]">Customize the AI prompt and preview generated emails.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--foreground-muted)] mb-1.5">
                System Prompt <span className="text-[var(--foreground-dim)]">(optional — uses default PAS framework if empty)</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                placeholder="Leave empty to use the default PAS (Problem-Agitate-Solution) framework prompt..."
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 resize-y"
              />
            </div>

            <button
              onClick={handleGeneratePreview}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Generating..." : "Generate Preview Emails"}
            </button>

            {emailPreviews.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-[var(--foreground)]">Preview ({emailPreviews.length} emails)</p>
                {emailPreviews.map((preview, idx) => (
                  <div key={idx} className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-[var(--primary)]">Subject: {preview.subject}</p>
                      <button
                        onClick={handleGeneratePreview}
                        className="p-1.5 rounded text-[var(--foreground-dim)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                        title="Regenerate"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm text-[var(--foreground-muted)] whitespace-pre-wrap leading-relaxed">{preview.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 4: LAUNCH ─── */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">Review & Launch</h3>
              <p className="text-sm text-[var(--foreground-dim)]">Verify emails, generate all content, and launch your campaign.</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{prospectIds.length}</p>
                <p className="text-xs text-[var(--foreground-dim)]">Prospects</p>
              </div>
              <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{dailyLimit}</p>
                <p className="text-xs text-[var(--foreground-dim)]">Daily Limit</p>
              </div>
              <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 text-center">
                <p className="text-2xl font-bold text-[var(--foreground)]">{sendingDays.length}</p>
                <p className="text-xs text-[var(--foreground-dim)]">Send Days</p>
              </div>
              <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 text-center">
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{senderEmail || "—"}</p>
                <p className="text-xs text-[var(--foreground-dim)]">Sender</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleVerifyEmails}
                disabled={verifying || verifyDone || prospects.length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 font-medium text-sm hover:bg-blue-600/20 transition-colors disabled:opacity-50"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : verifyDone ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                {verifying ? "Verifying..." : verifyDone ? "Emails Verified" : "Verify Emails"}
              </button>

              <button
                onClick={handleGenerateAll}
                disabled={generatingAll || genAllDone}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-600/10 text-purple-400 border border-purple-500/20 font-medium text-sm hover:bg-purple-600/20 transition-colors disabled:opacity-50"
              >
                {generatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : genAllDone ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                {generatingAll ? "Generating..." : genAllDone ? "All Emails Generated" : "Generate All Emails"}
              </button>

              <button
                onClick={handleLaunch}
                disabled={launching}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--primary)] text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {launching ? "Launching..." : "Launch Campaign"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[var(--foreground-dim)] hover:text-[var(--foreground)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>
        {step < 4 && (
          <button
            onClick={() => setStep(Math.min(4, step + 1))}
            disabled={!canGoNext()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--primary)] text-black hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
