"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Send, Loader2, AlertCircle, Link2 } from "lucide-react";

interface EmailThread {
  id: string;
  subject: string;
  messageCount: number;
  lastDate: string;
  messages: {
    id: string;
    from: string;
    to: string;
    subject: string;
    date: string;
    snippet: string;
  }[];
}

interface GmailStatus {
  connected: boolean;
  email: string | null;
}

export default function ClientEmails({ clientEmail }: { clientEmail: string }) {
  const [status, setStatus] = useState<GmailStatus | null>(null);
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/gmail/status");
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
  }, []);

  const fetchThreads = useCallback(async () => {
    if (!clientEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/gmail/threads?clientEmail=${encodeURIComponent(clientEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [clientEmail]);

  useEffect(() => {
    checkStatus().then(() => fetchThreads());
  }, [checkStatus, fetchThreads]);

  async function connectGmail() {
    setConnecting(true);
    try {
      const res = await fetch("/api/gmail/connect", { method: "POST" });
      if (res.ok) {
        const { url } = await res.json();
        window.open(url, "_blank", "width=600,height=700");
      }
    } catch { /* ignore */ }
    setConnecting(false);
  }

  if (!status?.connected) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Mail className="w-10 h-10 text-[var(--foreground-dim)] mb-3" />
        <p className="text-sm text-[var(--foreground-muted)] mb-3">
          Connect your Gmail to view email history with this client
        </p>
        <button
          onClick={connectGmail}
          disabled={connecting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[#0A0A0F] font-semibold text-sm disabled:opacity-50"
        >
          {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Connect Gmail
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-[var(--surface)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="w-8 h-8 text-[var(--foreground-dim)] mb-2" />
        <p className="text-sm text-[var(--foreground-muted)]">
          No email threads found for {clientEmail}
        </p>
        <p className="text-xs text-[var(--foreground-dim)] mt-1">
          Connected as {status.email}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      <p className="text-[11px] text-[var(--foreground-dim)] px-1">
        Connected as {status.email} &middot; {threads.length} thread{threads.length !== 1 ? "s" : ""}
      </p>
      {threads.map((thread) => (
        <div key={thread.id} className="rounded-lg border border-[var(--border)] overflow-hidden">
          <button
            onClick={() => setExpandedThread(expandedThread === thread.id ? null : thread.id)}
            className="w-full text-left px-3 py-2.5 hover:bg-[var(--surface-hover)] transition-colors"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-[var(--foreground)] truncate pr-4">
                {thread.subject}
              </p>
              <span className="text-[11px] text-[var(--foreground-dim)] shrink-0">
                {thread.messageCount} msg{thread.messageCount !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-[var(--foreground-dim)] mt-0.5">
              {thread.lastDate ? new Date(thread.lastDate).toLocaleDateString() : ""}
            </p>
          </button>
          {expandedThread === thread.id && (
            <div className="border-t border-[var(--border)] bg-[var(--surface)] px-3 py-2 space-y-2 max-h-60 overflow-y-auto">
              {thread.messages.map((msg) => (
                <div key={msg.id} className="text-[12px] border-b border-[var(--border)] pb-2 last:border-0">
                  <div className="flex items-center justify-between text-[var(--foreground-dim)]">
                    <span className="truncate">{msg.from.split("<")[0].trim()}</span>
                    <span className="shrink-0 ml-2">{msg.date ? new Date(msg.date).toLocaleDateString() : ""}</span>
                  </div>
                  <p className="text-[var(--foreground-muted)] mt-0.5">{msg.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
