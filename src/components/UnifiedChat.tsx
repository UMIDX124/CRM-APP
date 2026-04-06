"use client";

import Image from "next/image";
import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, X, Sparkles, Loader2, Zap, BarChart3,
  Users, Briefcase, Trash2, Copy, Check, Hash, AlertCircle,
} from "lucide-react";
import { WolfIcon } from "./WolfLogo";
import { clsx } from "clsx";

// ─── Shared Types ───────────────────────────────────────

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

interface TeamMessage {
  id: string;
  content: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  author: MessageAuthor;
}

// ─── Helpers ────────────────────────────────────────────

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "#6366F1", PROJECT_MANAGER: "#3B82F6",
  DEPT_HEAD: "#F59E0B", TEAM_LEAD: "#22C55E", EMPLOYEE: "#71717A",
};

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const quickActions = [
  { icon: BarChart3, label: "Analytics", prompt: "Show me a summary of our dashboard analytics with key metrics" },
  { icon: Users, label: "Team Stats", prompt: "Show team performance across all brands with scores and workload" },
  { icon: Briefcase, label: "Top Clients", prompt: "Who are our top clients by MRR? Include their health scores" },
  { icon: Zap, label: "Quick Report", prompt: "Give me a quick business overview - revenue, tasks, and highlights" },
];

// ─── Copy Button ────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={handleCopy} className="p-1 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] transition-all" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Markdown Renderer ──────────────────────────────────

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-[var(--foreground)]">{children}</strong>,
        em: ({ children }) => <em className="italic text-[var(--foreground-muted)]">{children}</em>,
        h1: ({ children }) => <h1 className="text-base font-bold text-[var(--foreground)] mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold text-[var(--foreground)] mb-2 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1.5 mt-2 first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-[var(--foreground-muted)]">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-[var(--foreground-muted)]">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ className, children, ...props }) => {
          if (!className) return <code className="px-1.5 py-0.5 rounded-md bg-[var(--surface-hover)] text-[var(--primary-light)] text-xs font-mono" {...props}>{children}</code>;
          return <code className="block p-3 rounded-xl bg-black/40 border border-[var(--border)] text-xs font-mono text-green-300 overflow-x-auto mb-2" {...props}>{children}</code>;
        },
        pre: ({ children }) => <pre className="mb-2">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-[var(--primary)]/50 pl-3 italic text-[var(--foreground-muted)] mb-2">{children}</blockquote>,
        table: ({ children }) => <div className="overflow-x-auto mb-2 rounded-lg border border-[var(--border)]"><table className="w-full text-xs">{children}</table></div>,
        thead: ({ children }) => <thead className="bg-[var(--surface)]">{children}</thead>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)] border-b border-[var(--border)]">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-[var(--foreground-muted)] border-b border-[var(--border-subtle)]">{children}</td>,
        hr: () => <hr className="border-[var(--border)] my-3" />,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:text-[var(--primary-light)] underline underline-offset-2">{children}</a>,
      }}
    >{content}</ReactMarkdown>
  );
}

// ─── AI Assistant Tab ───────────────────────────────────

function AITab() {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, sendMessage, status, setMessages } = useChat();
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, status]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue.trim() });
    setInputValue("");
  };

  const getMessageText = (message: typeof messages[0]): string => {
    return (message.parts || []).filter((part): part is { type: "text"; text: string } => part.type === "text").map((part) => part.text).join("");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && !isLoading && (
          <>
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl px-4 py-3 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-bl-md">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                  <span className="text-xs text-[var(--primary)] font-medium">Alpha AI</span>
                </div>
                <div className="text-sm text-[var(--foreground-muted)]">
                  <MarkdownContent content={"Hey! I'm **Alpha** — your AI assistant.\n\nI can help with:\n- **Dashboard insights** & analytics\n- **Client management** & health scores\n- **Team performance** & workloads\n- **Revenue reports** & trends\n\nWhat do you need?"} />
                </div>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <p className="text-[10px] text-[var(--foreground-dim)] text-center">Quick Actions</p>
              <div className="grid grid-cols-2 gap-1.5">
                {quickActions.map((action, i) => (
                  <button key={i} onClick={() => !isLoading && sendMessage({ text: action.prompt })}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[10px] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all">
                    <action.icon className="w-3.5 h-3.5 text-[var(--primary)]" />{action.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {messages.map((message) => {
          const text = getMessageText(message);
          return (
            <div key={message.id} className={clsx("flex", message.role === "user" ? "justify-end" : "justify-start")}>
              <div className={clsx("max-w-[88%] rounded-2xl px-4 py-3 group relative",
                message.role === "user"
                  ? "bg-[var(--primary)] text-white rounded-br-md"
                  : "bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-md"
              )}>
                {message.role === "assistant" && (
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                      <span className="text-[10px] text-[var(--primary)] font-medium">Alpha</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity"><CopyButton text={text} /></div>
                  </div>
                )}
                <div className="text-[13px]">
                  {message.role === "assistant" ? <MarkdownContent content={text} /> : <p className="whitespace-pre-wrap leading-relaxed">{text}</p>}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-[var(--primary)] animate-pulse" />
                <span className="text-xs text-[var(--primary)]">Thinking...</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-[var(--primary)]/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-[var(--primary)]/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-[var(--primary)]/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)]">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input ref={inputRef} type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
            placeholder={isLoading ? "Thinking..." : "Ask anything..."} disabled={isLoading}
            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:border-[var(--primary)] disabled:opacity-50" />
          <button type="submit" disabled={!inputValue.trim() || isLoading}
            className={clsx("p-2 rounded-lg transition-all shrink-0", inputValue.trim() && !isLoading ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-light)]" : "bg-[var(--surface-elevated)] text-[var(--foreground-dim)]")}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[9px] text-[var(--foreground-dim)]">Powered by Groq AI</p>
          <button onClick={() => setMessages([])} className="text-[9px] text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] flex items-center gap-1">
            <Trash2 className="w-2.5 h-2.5" /> Clear
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Team Chat Tab ──────────────────────────────────────

function TeamTab() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (Array.isArray(data)) { setChannels(data); if (data.length > 0) setActiveChannelId(data[0].id); } })
      .catch(() => {});
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!activeChannelId) return;
    try {
      const res = await fetch(`/api/channels/${activeChannelId}/messages?limit=50`);
      if (res.ok) { const data = await res.json(); if (data.messages) { setMessages(data.messages); setError(null); } }
    } catch { setError("Failed to load messages"); }
  }, [activeChannelId]);

  useEffect(() => {
    if (!activeChannelId) return;
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChannelId, fetchMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMsg = async () => {
    if (!input.trim() || !activeChannelId || sending) return;
    const content = input.trim(); setInput(""); setSending(true);
    try {
      const res = await fetch(`/api/channels/${activeChannelId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      if (res.ok) { const newMsg = await res.json(); setMessages((prev) => [...prev, newMsg]); }
      else { setError("Failed to send"); setInput(content); }
    } catch { setError("Network error"); setInput(content); }
    setSending(false);
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-1 min-h-0">
        {/* Channel list */}
        <div className="w-[90px] shrink-0 border-r border-[var(--border)] overflow-y-auto py-1.5 scrollbar-thin">
          {channels.map((ch) => (
            <button key={ch.id} onClick={() => setActiveChannelId(ch.id)}
              className={clsx("w-full flex items-center gap-1 px-2 py-1.5 text-left transition-colors",
                ch.id === activeChannelId ? "bg-[var(--surface-active)] text-[var(--foreground)]" : "text-[var(--foreground-dim)] hover:bg-[var(--surface-hover)]"
              )}>
              <Hash className="w-2.5 h-2.5 shrink-0 opacity-50" />
              <span className="text-[10px] font-medium truncate">{ch.name}</span>
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeChannel && (
            <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center gap-1.5">
              <Hash className="w-3 h-3 text-[var(--foreground-dim)]" />
              <span className="text-[11px] font-medium text-[var(--foreground)]">{activeChannel.name}</span>
              <span className="text-[9px] text-[var(--foreground-dim)] ml-auto flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{activeChannel.memberCount}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="w-5 h-5 text-[var(--foreground-dim)] animate-spin" /></div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Hash className="w-6 h-6 text-[var(--foreground-dim)] mb-1.5 opacity-30" />
                <p className="text-[11px] text-[var(--foreground-dim)]">No messages yet</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSystem = msg.type === "SYSTEM" || msg.type === "LEAD_ALERT" || msg.type === "TASK_UPDATE";
                const color = roleColors[msg.author.role] || "#71717A";
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-[var(--primary)]/5 border border-[var(--border)]">
                      <Zap className="w-3 h-3 text-[var(--primary)] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">{msg.content}</p>
                        <p className="text-[9px] text-[var(--foreground-dim)] mt-0.5">{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[9px] font-semibold mt-0.5" style={{ backgroundColor: `${color}15`, color }}>{msg.author.name.charAt(0)}</div>
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

          {error && (
            <div className="px-3 py-1 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-red-400 shrink-0" /><span className="text-[10px] text-red-400 flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400"><X className="w-3 h-3" /></button>
            </div>
          )}

          <div className="px-3 py-2 border-t border-[var(--border)]">
            <div className="flex items-center gap-2">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMsg()}
                placeholder={activeChannel ? `#${activeChannel.name}` : "Select a channel..."}
                disabled={!activeChannelId || sending}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[12px] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:border-[var(--primary)] disabled:opacity-50" />
              <button onClick={sendMsg} disabled={!input.trim() || !activeChannelId || sending}
                className="p-1.5 rounded-lg bg-[var(--primary)] text-white disabled:opacity-30 hover:bg-[var(--primary-light)] transition-colors">
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Unified Chat Component ─────────────────────────────

type ChatTab = "ai" | "team";

export default function UnifiedChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ChatTab>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("unified-chat-tab") as ChatTab) || "ai";
    }
    return "ai";
  });

  useEffect(() => {
    localStorage.setItem("unified-chat-tab", activeTab);
  }, [activeTab]);

  // FAB when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[88px] right-4 lg:bottom-6 lg:right-6 z-40 w-[60px] h-[60px] rounded-full bg-[var(--surface-elevated)] border-2 border-[var(--primary)] flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer overflow-hidden p-0"
        title="Alpha AI"
      >
        <Image
          src="/mascot-192.png"
          alt="Alpha"
          width={56}
          height={56}
          className="w-full h-full object-cover rounded-full"
          priority
        />
      </button>
    );
  }

  // Panel when open
  return (
    <div className="fixed bottom-[88px] right-3 lg:bottom-6 lg:right-6 z-50 w-[calc(100vw-24px)] sm:w-[400px] h-[520px] max-h-[calc(100vh-120px)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-scale-in">
      {/* Header with tabs */}
      <div className="flex items-center border-b border-[var(--border)] bg-[var(--surface-elevated)]">
        <button
          onClick={() => setActiveTab("ai")}
          className={clsx(
            "flex-1 py-3 text-[12px] font-medium text-center transition-colors relative",
            activeTab === "ai" ? "text-[var(--foreground)]" : "text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)]"
          )}
        >
          <span className="flex items-center justify-center gap-1.5">
            <WolfIcon size={14} /> Alpha AI
          </span>
          {activeTab === "ai" && <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-[var(--primary)] rounded-full" />}
        </button>
        <div className="w-px h-5 bg-[var(--border)]" />
        <button
          onClick={() => setActiveTab("team")}
          className={clsx(
            "flex-1 py-3 text-[12px] font-medium text-center transition-colors relative",
            activeTab === "team" ? "text-[var(--foreground)]" : "text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)]"
          )}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Hash className="w-3.5 h-3.5" /> Team Chat
          </span>
          {activeTab === "team" && <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-[var(--primary)] rounded-full" />}
        </button>
        <button onClick={() => setIsOpen(false)} className="px-3 py-3 text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "ai" ? <AITab /> : <TeamTab />}
    </div>
  );
}
