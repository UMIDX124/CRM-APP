"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, Hash, Send, X, ChevronDown, Users,
  Loader2, AlertCircle, Zap,
} from "lucide-react";
import { clsx } from "clsx";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  memberCount: number;
  messageCount: number;
  lastMessage: { content: string; author: string; time: string } | null;
}

interface MessageAuthor {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
}

interface ChatMessage {
  id: string;
  content: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  author: MessageAuthor;
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "#6366F1",
  PROJECT_MANAGER: "#3B82F6",
  DEPT_HEAD: "#F59E0B",
  TEAM_LEAD: "#22C55E",
  EMPLOYEE: "#71717A",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TeamChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch channels
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/channels")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setChannels(data);
          if (!activeChannelId && data.length > 0) {
            setActiveChannelId(data[0].id);
          }
        }
      })
      .catch((err) => console.error("Failed to load channels:", err));
  }, [isOpen, activeChannelId]);

  // Fetch messages for active channel
  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) return;
    try {
      const res = await fetch(`/api/channels/${activeChannelId}/messages?limit=50`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
          setError(null);
        }
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      setError("Failed to load messages");
    }
  }, [activeChannelId]);

  useEffect(() => {
    if (!activeChannelId || !isOpen) return;
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));

    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeChannelId, isOpen, fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChannelId || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`/api/channels/${activeChannelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to send" }));
        setError(err.error || "Failed to send message");
        setInput(content); // Restore input on failure
      }
    } catch {
      setError("Network error — message not sent");
      setInput(content);
    }
    setSending(false);
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-30 w-12 h-12 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
        title="Team Chat"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-[380px] h-[520px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[var(--primary)]" />
          <span className="text-[13px] font-semibold text-[var(--foreground)]">Team Chat</span>
          {activeChannel && (
            <span className="text-[11px] text-[var(--foreground-dim)]">#{activeChannel.name}</span>
          )}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Channel sidebar */}
        <div className="w-[100px] shrink-0 border-r border-[var(--border)] overflow-y-auto py-2">
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={clsx(
                "w-full flex items-center gap-1.5 px-2.5 py-1.5 text-left transition-colors",
                ch.id === activeChannelId
                  ? "bg-[var(--surface-active)] text-[var(--foreground)]"
                  : "text-[var(--foreground-dim)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground-muted)]"
              )}
            >
              <Hash className="w-3 h-3 shrink-0 opacity-50" />
              <span className="text-[11px] font-medium truncate">{ch.name}</span>
            </button>
          ))}
        </div>

        {/* Messages area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Channel info bar */}
          {activeChannel && (
            <div className="px-3 py-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3 h-3 text-[var(--foreground-dim)]" />
                <span className="text-[12px] font-medium text-[var(--foreground)]">{activeChannel.name}</span>
                <span className="text-[10px] text-[var(--foreground-dim)] ml-auto flex items-center gap-1">
                  <Users className="w-3 h-3" />{activeChannel.memberCount}
                </span>
              </div>
              {activeChannel.description && (
                <p className="text-[10px] text-[var(--foreground-dim)] mt-0.5 truncate">{activeChannel.description}</p>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-[var(--foreground-dim)] animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Hash className="w-8 h-8 text-[var(--foreground-dim)] mb-2 opacity-30" />
                <p className="text-[12px] text-[var(--foreground-dim)]">No messages yet</p>
                <p className="text-[10px] text-[var(--foreground-dim)] mt-0.5">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSystem = msg.type === "SYSTEM" || msg.type === "LEAD_ALERT" || msg.type === "TASK_UPDATE";
                const color = roleColors[msg.author.role] || "#71717A";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-[var(--primary-subtle)] border border-[var(--border)]">
                      <Zap className="w-3 h-3 text-[var(--primary)] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">{msg.content}</p>
                        <p className="text-[9px] text-[var(--foreground-dim)] mt-0.5">{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex items-start gap-2 group">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[9px] font-semibold mt-0.5"
                      style={{ backgroundColor: `${color}15`, color }}
                    >
                      {msg.author.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-medium text-[var(--foreground)]">{msg.author.name}</span>
                        <span className="text-[9px] text-[var(--foreground-dim)]">{formatTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-[12px] text-[var(--foreground-muted)] leading-relaxed break-words">{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error banner */}
          {error && (
            <div className="px-3 py-1.5 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
              <span className="text-[10px] text-red-400 flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={activeChannel ? `Message #${activeChannel.name}` : "Select a channel..."}
                disabled={!activeChannelId || sending}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:border-[var(--primary)] disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || !activeChannelId || sending}
                className="p-1.5 rounded-lg bg-[var(--primary)] text-white disabled:opacity-30 hover:bg-[var(--primary-light)] transition-colors"
              >
                {sending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
