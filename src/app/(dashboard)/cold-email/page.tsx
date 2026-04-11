"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Mail, Send, Eye, MessageSquare, AlertTriangle, UserMinus,
  MoreVertical, Play, Pause, Trash2, Loader2,
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
  createdAt: string;
  creator: { firstName: string; lastName: string };
  _count: { leads: number; sequences: number };
}

const statusConfig: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" | "outline" }> = {
  draft: { label: "Draft", variant: "outline" },
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  completed: { label: "Completed", variant: "info" },
};

export default function ColdEmailPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/cold-email");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error(err);
      toastError("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  async function updateStatus(id: string, status: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/cold-email/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      success(`Campaign ${status === "active" ? "activated" : status}`);
      fetchCampaigns();
    } catch {
      toastError("Failed to update campaign");
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this draft campaign?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/cold-email/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      success("Campaign deleted");
      fetchCampaigns();
    } catch {
      toastError("Failed to delete campaign");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 skeleton rounded-lg" />
          <div className="h-10 w-40 skeleton rounded-lg" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
              <div className="flex justify-between">
                <div className="h-5 w-48 skeleton rounded" />
                <div className="h-5 w-16 skeleton rounded-full" />
              </div>
              <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="h-4 skeleton rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Campaigns</h2>
          <p className="text-sm text-[var(--foreground-dim)]">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => router.push("/cold-email/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-black font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-elevated)] flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-[var(--foreground-dim)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--foreground)] mb-1">No campaigns yet</h3>
          <p className="text-sm text-[var(--foreground-dim)] mb-6 max-w-sm">
            Create your first cold email campaign to start reaching potential customers.
          </p>
          <button
            onClick={() => router.push("/cold-email/new")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-black font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const sc = statusConfig[campaign.status] || statusConfig.draft;
            const openRate = campaign.emailsSent > 0 ? ((campaign.emailsOpened / campaign.emailsSent) * 100).toFixed(1) : "0";
            const replyRate = campaign.emailsSent > 0 ? ((campaign.replies / campaign.emailsSent) * 100).toFixed(1) : "0";
            const isLoading = actionLoading === campaign.id;

            return (
              <div
                key={campaign.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)] transition-all cursor-pointer"
                onClick={() => router.push(`/cold-email/${campaign.id}`)}
              >
                <div className="p-5">
                  {/* Top Row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-[var(--foreground)] truncate">{campaign.name}</h3>
                        <Badge variant={sc.variant}>{sc.label}</Badge>
                      </div>
                      <p className="text-xs text-[var(--foreground-dim)]">
                        {campaign.niche}{campaign.location ? ` — ${campaign.location}` : ""} &middot; by {campaign.creator.firstName} {campaign.creator.lastName}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-4" onClick={(e) => e.stopPropagation()}>
                      {campaign.status === "draft" && (
                        <button
                          onClick={() => updateStatus(campaign.id, "active")}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Activate"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        </button>
                      )}
                      {campaign.status === "active" && (
                        <button
                          onClick={() => updateStatus(campaign.id, "paused")}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
                          title="Pause"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                        </button>
                      )}
                      {campaign.status === "paused" && (
                        <button
                          onClick={() => updateStatus(campaign.id, "active")}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Resume"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        </button>
                      )}
                      {campaign.status === "draft" && (
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--foreground-dim)]">Prospects</p>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{campaign._count.leads}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--foreground-dim)]">Sent</p>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{campaign.emailsSent}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Eye className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--foreground-dim)]">Opens</p>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{openRate}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--foreground-dim)]">Replies</p>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{replyRate}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--foreground-dim)]">Bounces</p>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{campaign.bounces}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gray-500/10 flex items-center justify-center">
                        <UserMinus className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--foreground-dim)]">Unsubs</p>
                        <p className="text-sm font-semibold text-[var(--foreground)]">{campaign.unsubscribes}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
