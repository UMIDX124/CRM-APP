"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Send, Eye, MessageSquare, AlertTriangle, UserMinus,
  Play, Pause, Loader2, Mail, RefreshCw, Settings, Users, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

interface Campaign {
  id: string;
  name: string;
  niche: string;
  location: string | null;
  status: string;
  totalProspects: number;
  emailsSent: number;
  emailsOpened: number;
  replies: number;
  bounces: number;
  unsubscribes: number;
  senderName: string;
  senderEmail: string;
  dailyLimit: number;
  sendingDays: string;
  sendingHours: string;
  systemPrompt: string | null;
  createdAt: string;
  creator: { firstName: string; lastName: string };
  sequences: Array<{ id: string; stepNumber: number; delayDays: number; subject: string; bodyTemplate: string }>;
  _count: { leads: number };
}

interface CampaignLead {
  id: string;
  status: string;
  currentStep: number;
  generatedSubject: string | null;
  generatedEmail: string | null;
  createdAt: string;
  prospect: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    emailStatus: string;
    website: string | null;
  };
}

interface SentEmailItem {
  id: string;
  subject: string;
  status: string;
  sentAt: string;
  messageId: string | null;
  campaignLead: {
    prospect: { email: string; firstName: string | null; company: string | null };
  };
}

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  completed: { label: "Completed", variant: "info" },
};

const leadStatusConfig: Record<string, { label: string; color: string }> = {
  queued: { label: "Queued", color: "text-gray-400" },
  sent: { label: "Sent", color: "text-emerald-400" },
  opened: { label: "Opened", color: "text-purple-400" },
  replied: { label: "Replied", color: "text-amber-400" },
  bounced: { label: "Bounced", color: "text-red-400" },
  unsubscribed: { label: "Unsubscribed", color: "text-gray-500" },
};

export default function CampaignDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { success, error: toastError } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leadStats, setLeadStats] = useState<Record<string, number>>({});
  const [recentEmails, setRecentEmails] = useState<SentEmailItem[]>([]);
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "prospects" | "sent" | "settings">("overview");
  const [sending, setSending] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [campRes, leadsRes] = await Promise.all([
        fetch(`/api/cold-email/${id}`),
        fetch(`/api/cold-email/${id}/leads?limit=100`),
      ]);

      if (!campRes.ok) throw new Error("Campaign not found");
      const campData = await campRes.json();
      setCampaign(campData.campaign);
      setLeadStats(campData.leadStats || {});
      setRecentEmails(campData.recentEmails || []);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(leadsData.leads || []);
      }
    } catch {
      toastError("Failed to load campaign");
      router.push("/cold-email");
    } finally {
      setLoading(false);
    }
  }, [id, router, toastError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function toggleStatus() {
    if (!campaign) return;
    const newStatus = campaign.status === "active" ? "paused" : "active";
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/cold-email/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      success(`Campaign ${newStatus === "active" ? "activated" : "paused"}`);
      fetchData();
    } catch {
      toastError("Failed to update status");
    } finally {
      setStatusLoading(false);
    }
  }

  async function handleSendBatch() {
    setSending(true);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: id, batchSize: 10 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Send failed");
      }
      const data = await res.json();
      if (data.sent > 0) {
        success(`Sent ${data.sent} emails. ${data.remaining} remaining today.`);
      } else {
        toastError(data.error || data.message || "No emails sent");
      }
      fetchData();
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  if (loading || !campaign) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 skeleton rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
              <div className="h-4 w-16 skeleton rounded" />
              <div className="h-8 w-20 skeleton rounded" />
            </div>
          ))}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  const sc = statusConfig[campaign.status] || statusConfig.draft;
  const openRate = campaign.emailsSent > 0 ? ((campaign.emailsOpened / campaign.emailsSent) * 100).toFixed(1) : "0";
  const replyRate = campaign.emailsSent > 0 ? ((campaign.replies / campaign.emailsSent) * 100).toFixed(1) : "0";
  const bounceRate = campaign.emailsSent > 0 ? ((campaign.bounces / campaign.emailsSent) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/cold-email")}
            className="flex items-center gap-1.5 text-sm text-[var(--foreground-dim)] hover:text-[var(--foreground)] transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[var(--foreground)]">{campaign.name}</h2>
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </div>
          <p className="text-sm text-[var(--foreground-dim)] mt-0.5">
            {campaign.niche}{campaign.location ? ` — ${campaign.location}` : ""} &middot; {campaign.senderEmail}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(campaign.status === "active" || campaign.status === "paused" || campaign.status === "draft") && (
            <button
              onClick={toggleStatus}
              disabled={statusLoading}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                campaign.status === "active"
                  ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              }`}
            >
              {statusLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : campaign.status === "active" ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {campaign.status === "active" ? "Pause" : "Activate"}
            </button>
          )}
          {campaign.status === "active" && (
            <button
              onClick={handleSendBatch}
              disabled={sending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary)] text-black text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Batch
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Sent", value: campaign.emailsSent, icon: Send, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Open Rate", value: `${openRate}%`, icon: Eye, color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: "Reply Rate", value: `${replyRate}%`, icon: MessageSquare, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Bounces", value: campaign.bounces, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Unsubs", value: campaign.unsubscribes, icon: UserMinus, color: "text-gray-400", bg: "bg-gray-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="text-xl font-bold text-[var(--foreground)]">{stat.value}</p>
            <p className="text-xs text-[var(--foreground-dim)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {[
          { key: "overview" as const, label: "Overview", icon: Mail },
          { key: "prospects" as const, label: "Prospects", icon: Users },
          { key: "sent" as const, label: "Sent Emails", icon: Send },
          { key: "settings" as const, label: "Settings", icon: Settings },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === t.key
                ? "border-[var(--primary)] text-[var(--foreground)]"
                : "border-transparent text-[var(--foreground-dim)] hover:text-[var(--foreground)]"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Lead Status Breakdown</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Object.entries(leadStatusConfig).map(([key, conf]) => (
                <div key={key} className="text-center">
                  <p className={`text-lg font-bold ${conf.color}`}>{leadStats[key] || 0}</p>
                  <p className="text-xs text-[var(--foreground-dim)]">{conf.label}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Campaign Info</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[var(--foreground-dim)]">Daily Limit</p>
                  <p className="font-medium text-[var(--foreground)]">{campaign.dailyLimit} emails/day</p>
                </div>
                <div>
                  <p className="text-[var(--foreground-dim)]">Sending Days</p>
                  <p className="font-medium text-[var(--foreground)]">{campaign.sendingDays}</p>
                </div>
                <div>
                  <p className="text-[var(--foreground-dim)]">Sending Hours</p>
                  <p className="font-medium text-[var(--foreground)]">{campaign.sendingHours} UTC</p>
                </div>
                <div>
                  <p className="text-[var(--foreground-dim)]">Total Prospects</p>
                  <p className="font-medium text-[var(--foreground)]">{campaign._count.leads}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROSPECTS TAB */}
        {tab === "prospects" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-3 text-[var(--foreground-dim)] font-medium">Prospect</th>
                  <th className="text-left p-3 text-[var(--foreground-dim)] font-medium">Email</th>
                  <th className="text-left p-3 text-[var(--foreground-dim)] font-medium">Status</th>
                  <th className="text-left p-3 text-[var(--foreground-dim)] font-medium">Subject</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[var(--foreground-dim)]">
                      No prospects in this campaign yet.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => {
                    const ls = leadStatusConfig[lead.status] || leadStatusConfig.queued;
                    return (
                      <tr key={lead.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                        <td className="p-3">
                          <p className="font-medium text-[var(--foreground)]">
                            {lead.prospect.firstName || lead.prospect.company || "—"}
                          </p>
                          {lead.prospect.company && lead.prospect.firstName && (
                            <p className="text-xs text-[var(--foreground-dim)]">{lead.prospect.company}</p>
                          )}
                        </td>
                        <td className="p-3 text-[var(--foreground-muted)]">{lead.prospect.email}</td>
                        <td className="p-3">
                          <span className={`text-xs font-medium ${ls.color}`}>{ls.label}</span>
                        </td>
                        <td className="p-3 text-[var(--foreground-dim)] max-w-[200px] truncate">
                          {lead.generatedSubject || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SENT EMAILS TAB */}
        {tab === "sent" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-3 text-[var(--foreground-dim)] font-medium">To</th>
                  <th className="text-left p-3 text-[var(--foreground-dim)] font-medium">Subject</th>
                  <th className="text-left p-3 text-[var(--foreground-dim)] font-medium">Status</th>
                  <th className="text-left p-3 text-[var(--foreground-dim)] font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {recentEmails.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[var(--foreground-dim)]">
                      No emails sent yet.
                    </td>
                  </tr>
                ) : (
                  recentEmails.map((email) => (
                    <tr key={email.id} className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]">
                      <td className="p-3">
                        <p className="font-medium text-[var(--foreground)]">{email.campaignLead.prospect.email}</p>
                        <p className="text-xs text-[var(--foreground-dim)]">
                          {email.campaignLead.prospect.firstName || email.campaignLead.prospect.company || ""}
                        </p>
                      </td>
                      <td className="p-3 text-[var(--foreground-muted)] max-w-[250px] truncate">{email.subject}</td>
                      <td className="p-3">
                        <Badge variant={email.status === "sent" ? "success" : email.status === "bounced" ? "danger" : "info"}>
                          {email.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-[var(--foreground-dim)]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(email.sentAt).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--foreground-dim)] mb-1">Campaign Name</p>
                <p className="font-medium text-[var(--foreground)]">{campaign.name}</p>
              </div>
              <div>
                <p className="text-[var(--foreground-dim)] mb-1">Niche</p>
                <p className="font-medium text-[var(--foreground)]">{campaign.niche}</p>
              </div>
              <div>
                <p className="text-[var(--foreground-dim)] mb-1">Sender</p>
                <p className="font-medium text-[var(--foreground)]">{campaign.senderName} &lt;{campaign.senderEmail}&gt;</p>
              </div>
              <div>
                <p className="text-[var(--foreground-dim)] mb-1">Location</p>
                <p className="font-medium text-[var(--foreground)]">{campaign.location || "��"}</p>
              </div>
              <div>
                <p className="text-[var(--foreground-dim)] mb-1">Daily Limit</p>
                <p className="font-medium text-[var(--foreground)]">{campaign.dailyLimit} emails/day</p>
              </div>
              <div>
                <p className="text-[var(--foreground-dim)] mb-1">Sending Schedule</p>
                <p className="font-medium text-[var(--foreground)]">{campaign.sendingDays} / {campaign.sendingHours} UTC</p>
              </div>
              <div>
                <p className="text-[var(--foreground-dim)] mb-1">Created</p>
                <p className="font-medium text-[var(--foreground)]">
                  {new Date(campaign.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="text-[var(--foreground-dim)] mb-1">Created By</p>
                <p className="font-medium text-[var(--foreground)]">{campaign.creator.firstName} {campaign.creator.lastName}</p>
              </div>
            </div>

            {campaign.sequences.length > 0 && (
              <div className="border-t border-[var(--border)] pt-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Email Sequence</h3>
                <div className="space-y-2">
                  {campaign.sequences.map((seq) => (
                    <div key={seq.id} className="rounded-lg bg-[var(--background)] border border-[var(--border)] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[var(--foreground)]">Step {seq.stepNumber}</p>
                        {seq.delayDays > 0 && (
                          <span className="text-xs text-[var(--foreground-dim)]">{seq.delayDays} day delay</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--foreground-dim)] mt-1">Subject: {seq.subject}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
