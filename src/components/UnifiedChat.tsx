"use client";

import Image from "next/image";
import React, { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, X, Sparkles, Loader2, Zap, BarChart3,
  Users, Briefcase, Trash2, Copy, Check, Hash, AlertCircle,
  MessageSquare, CornerDownRight, Reply as ReplyIcon, Smile,
} from "lucide-react";
import { WolfIcon } from "./WolfLogo";
import { clsx } from "clsx";
import { useRealtime } from "@/components/RealtimeProvider";

// ─── Shared Types ───────────────────────────────────────

interface Channel {
  id: string;
  name: string;
  description: string | null;
  type: string;
  memberCount: number;
  messageCount: number;
  unreadCount?: number;
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
  parentMessageId?: string | null;
  parent?: { id: string; content: string; authorName: string } | null;
  replyCount?: number;
  reactions?: Array<{ emoji: string; count: number; reactedByMe: boolean }>;
}

// Quick-react palette — a hand-picked set instead of a full emoji picker
// library so we don't ship ~300KB of emoji-mart just for 8 options.
const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "✅", "👀", "🚀"] as const;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  avatar: string | null;
  brand?: { code: string; color?: string } | null;
}

/**
 * Parse @mentions out of plain text and return JSX with highlighted spans.
 * Matches `@firstName` (word chars only). Non-matching text is returned
 * as plain text nodes so newlines still wrap via `whitespace-pre-wrap`.
 */
function renderWithMentions(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const regex = /@(\w+)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index));
    }
    out.push(
      <span
        key={`m-${key++}`}
        className="px-1 rounded bg-[var(--primary)]/15 text-[var(--primary)] font-medium"
      >
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

/**
 * Given the compose text and the current caret position, return the
 * mention query if the caret is inside an `@word` token, otherwise null.
 *
 * Walks backwards from the caret to find a preceding `@` that sits at the
 * start-of-input or after whitespace, collecting word characters after it.
 * Returns null if the token breaks (non-word char), if no `@` is found,
 * or if there's a space between the `@` and the caret.
 */
function getMentionQuery(text: string, caretPos: number): string | null {
  if (caretPos < 0 || caretPos > text.length) return null;
  let i = caretPos - 1;
  while (i >= 0) {
    const ch = text[i];
    if (ch === "@") {
      // Must be at start of input or preceded by whitespace
      if (i === 0 || /\s/.test(text[i - 1])) {
        return text.slice(i + 1, caretPos);
      }
      return null;
    }
    if (!/\w/.test(ch)) return null;
    i--;
  }
  return null;
}

// ─── Helpers ────────────────────────────────────────────

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "#F59E0B", PROJECT_MANAGER: "#3B82F6",
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
  // DM picker modal
  const [dmOpen, setDmOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  // Reply target — when non-null, next message is sent with parentMessageId
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null);
  // Typing state for OTHER users (by channel id)
  const [typingByChannel, setTypingByChannel] = useState<Record<string, string[]>>({});
  const typingPingRef = useRef<number>(0);
  // DM brand filter (ALL = no filter)
  const [dmBrandFilter, setDmBrandFilter] = useState<string>("ALL");
  // @-mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionResults, setMentionResults] = useState<Employee[]>([]);
  const mentionAbortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Emoji reaction picker — which message id currently has its popover open
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  // Thread state — which message id is expanded, plus its loaded replies
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [threadCache, setThreadCache] = useState<Record<string, { replies: TeamMessage[]; hasMore: boolean; nextCursor: string | null; loading: boolean }>>({});

  const loadThread = async (messageId: string, append = false) => {
    setThreadCache((prev) => ({
      ...prev,
      [messageId]: {
        replies: prev[messageId]?.replies ?? [],
        hasMore: prev[messageId]?.hasMore ?? false,
        nextCursor: prev[messageId]?.nextCursor ?? null,
        loading: true,
      },
    }));
    try {
      const cursor = append ? threadCache[messageId]?.nextCursor : null;
      const url = `/api/messages/${messageId}/thread?limit=30${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setThreadCache((prev) => {
        const existing = prev[messageId]?.replies ?? [];
        return {
          ...prev,
          [messageId]: {
            replies: append ? [...existing, ...data.replies] : data.replies,
            hasMore: data.hasMore,
            nextCursor: data.nextCursor,
            loading: false,
          },
        };
      });
    } catch {
      setThreadCache((prev) => ({
        ...prev,
        [messageId]: {
          ...(prev[messageId] ?? { replies: [], hasMore: false, nextCursor: null }),
          loading: false,
        },
      }));
    }
  };

  const toggleThread = (messageId: string) => {
    if (openThreadId === messageId) {
      setOpenThreadId(null);
      return;
    }
    setOpenThreadId(messageId);
    if (!threadCache[messageId]) void loadThread(messageId);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtime = useRealtime();
  const activeChannelIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

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

  // Initial load on channel switch — no more 5s polling, SSE pushes new
  // messages via the RealtimeProvider subscription below.
  useEffect(() => {
    if (!activeChannelId) return;
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
    // Mark the channel read on open so the unread badge clears.
    // Optimistically zero out the local counter so the UI feels instant.
    fetch(`/api/channels/${activeChannelId}/read`, { method: "POST" }).catch(() => {});
    setChannels((prev) =>
      prev.map((c) => (c.id === activeChannelId ? { ...c, unreadCount: 0 } : c))
    );
  }, [activeChannelId, fetchMessages]);

  // Subscribe to live message events from the shared SSE stream
  useEffect(() => {
    const unsubscribe = realtime.subscribeMessage((m) => {
      // Always bump the unread counter for the channel unless it's
      // the active one (the view will be marked-read on each open).
      if (m.channelId !== activeChannelIdRef.current) {
        setChannels((prev) =>
          prev.map((c) =>
            c.id === m.channelId
              ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 }
              : c
          )
        );
        return;
      }
      setMessages((prev) => {
        if (prev.some((p) => p.id === m.id)) return prev;
        return [...prev, m as unknown as TeamMessage];
      });
    });
    return unsubscribe;
  }, [realtime]);

  // Subscribe to typing events
  useEffect(() => {
    const unsubscribe = realtime.subscribeTyping((t) => {
      setTypingByChannel((prev) => ({
        ...prev,
        [t.channelId]: t.users.map((u) => u.name),
      }));
    });
    return unsubscribe;
  }, [realtime]);

  // The DM picker still needs a full employee list — fetched lazily
  // the first time the DM modal opens. The @-mention dropdown uses the
  // new keystroke-driven /api/employees/search endpoint below, so it
  // does NOT rely on the full list being preloaded.
  useEffect(() => {
    if (!dmOpen || employees.length > 0) return;
    fetch("/api/employees?minimal=1")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setEmployees(data);
      })
      .catch(() => {});
  }, [dmOpen, employees.length]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMsg = async () => {
    if (!input.trim() || !activeChannelId || sending) return;
    const content = input.trim();
    const parentId = replyTo?.id ?? null;
    setInput("");
    setReplyTo(null);
    setSending(true);
    try {
      const res = await fetch(`/api/channels/${activeChannelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentMessageId: parentId }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        // Clear typing state on send
        fetch(`/api/channels/${activeChannelId}/typing`, { method: "DELETE" }).catch(() => {});
      } else {
        setError("Failed to send");
        setInput(content);
      }
    } catch {
      setError("Network error");
      setInput(content);
    }
    setSending(false);
  };

  // Typing ping — throttled to once per 5s while user is composing.
  // Also detects `@foo` at the caret and opens the mention dropdown.
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const caret = e.target.selectionStart ?? v.length;
    setInput(v);

    const q = getMentionQuery(v, caret);
    if (q !== null) {
      setMentionQuery(q);
      setMentionIndex(0);
    } else if (mentionQuery !== null) {
      setMentionQuery(null);
    }

    if (!activeChannelId || !v.trim()) return;
    const now = Date.now();
    if (now - typingPingRef.current > 5000) {
      typingPingRef.current = now;
      fetch(`/api/channels/${activeChannelId}/typing`, { method: "POST" }).catch(() => {});
    }
  };

  // Fetch mention matches from /api/employees/search on every query
  // change (debounced 120ms). Previous in-memory filter against a
  // preloaded employee list is replaced so the client never pulls the
  // full org. Aborts in-flight calls when the user keeps typing.
  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }
    mentionAbortRef.current?.abort();
    const ctrl = new AbortController();
    mentionAbortRef.current = ctrl;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/employees/search?q=${encodeURIComponent(mentionQuery)}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as Employee[];
        if (!ctrl.signal.aborted && Array.isArray(data)) {
          setMentionResults(data);
          setMentionIndex(0);
        }
      } catch {
        // Aborted or network error — ignore, next keystroke will retry
      }
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [mentionQuery]);

  // Alias so the render code below keeps reading `mentionMatches`
  // without having to rename everywhere. Also clamps keyboard index.
  const mentionMatches = mentionResults;
  useEffect(() => {
    if (mentionMatches.length === 0) {
      setMentionIndex(0);
    } else if (mentionIndex >= mentionMatches.length) {
      setMentionIndex(mentionMatches.length - 1);
    }
  }, [mentionMatches, mentionIndex]);

  // Replace the `@query` fragment under the caret with `@firstName ` and
  // close the dropdown. Focus stays in the input.
  const selectMention = (employee: Employee) => {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? input.length;
    // Walk back from caret to the `@` marker
    let start = caret - 1;
    while (start >= 0 && input[start] !== "@") start--;
    if (start < 0) {
      setMentionQuery(null);
      return;
    }
    const before = input.slice(0, start);
    const after = input.slice(caret);
    const inserted = `@${employee.firstName} `;
    const next = `${before}${inserted}${after}`;
    setInput(next);
    setMentionQuery(null);
    // Restore caret after the inserted token
    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Mention dropdown navigation takes priority when open
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(mentionMatches[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      sendMsg();
    }
  };

  // Optimistic toggle — POST to the reactions endpoint, flip the local
  // reactedByMe flag + count, and swap the message in-place. The server
  // is idempotent so a double-click won't corrupt state.
  const toggleReaction = async (messageId: string, emoji: string) => {
    setReactionPickerFor(null);
    // Optimistic local update
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions ? [...m.reactions] : [];
        const idx = reactions.findIndex((r) => r.emoji === emoji);
        if (idx === -1) {
          reactions.push({ emoji, count: 1, reactedByMe: true });
        } else {
          const existing = reactions[idx];
          if (existing.reactedByMe) {
            // Was my reaction → remove
            const nextCount = existing.count - 1;
            if (nextCount <= 0) reactions.splice(idx, 1);
            else reactions[idx] = { ...existing, count: nextCount, reactedByMe: false };
          } else {
            reactions[idx] = { ...existing, count: existing.count + 1, reactedByMe: true };
          }
        }
        return { ...m, reactions };
      })
    );
    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch {
      // On failure the optimistic state stays — next channel load refetches real state
    }
  };

  const startDm = async (userId: string) => {
    try {
      const res = await fetch("/api/channels/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setDmOpen(false);
      // Refresh channel list so the new DM shows up
      fetch("/api/channels")
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => {
          if (Array.isArray(list)) {
            setChannels(list);
            setActiveChannelId(data.id);
          }
        })
        .catch(() => {});
    } catch {
      // ignore
    }
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const typersHere =
    activeChannelId && typingByChannel[activeChannelId]
      ? typingByChannel[activeChannelId]
      : [];

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <div className="flex flex-1 min-h-0">
        {/* Channel list */}
        <div className="w-[90px] shrink-0 border-r border-[var(--border)] overflow-y-auto py-1.5 scrollbar-thin">
          <button
            onClick={() => setDmOpen(true)}
            className="w-full flex items-center gap-1 px-2 py-1.5 text-left text-[var(--primary)] hover:bg-[var(--surface-hover)] transition-colors"
            title="Start a direct message"
          >
            <MessageSquare className="w-2.5 h-2.5 shrink-0" />
            <span className="text-[10px] font-semibold">New DM</span>
          </button>
          <div className="h-px bg-[var(--border)] my-1 mx-2" />
          {channels.map((ch) => {
            const isDm = ch.type === "DIRECT";
            const unread = ch.unreadCount ?? 0;
            const hasUnread = unread > 0 && ch.id !== activeChannelId;
            return (
              <button key={ch.id} onClick={() => setActiveChannelId(ch.id)}
                className={clsx("w-full flex items-center gap-1 px-2 py-1.5 text-left transition-colors",
                  ch.id === activeChannelId ? "bg-[var(--surface-active)] text-[var(--foreground)]" : hasUnread ? "text-[var(--foreground)] hover:bg-[var(--surface-hover)]" : "text-[var(--foreground-dim)] hover:bg-[var(--surface-hover)]"
                )}>
                {isDm ? (
                  <MessageSquare className="w-2.5 h-2.5 shrink-0 opacity-50" />
                ) : (
                  <Hash className="w-2.5 h-2.5 shrink-0 opacity-50" />
                )}
                <span className={clsx("text-[10px] truncate flex-1", hasUnread ? "font-semibold" : "font-medium")}>
                  {isDm ? ch.name.replace(/^dm-/, "").slice(0, 10) : ch.name}
                </span>
                {hasUnread && (
                  <span className="inline-flex items-center justify-center min-w-[14px] h-[14px] rounded-full bg-[var(--primary)] text-white text-[8px] font-bold tabular-nums px-1 shrink-0">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            );
          })}
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
                  <div key={msg.id} className="flex items-start gap-2 group relative">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[9px] font-semibold mt-0.5" style={{ backgroundColor: `${color}15`, color }}>{msg.author.name.charAt(0)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-medium text-[var(--foreground)]">{msg.author.name}</span>
                        <span className="text-[9px] text-[var(--foreground-dim)]">{formatTime(msg.createdAt)}</span>
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-[var(--foreground-dim)] hover:text-[var(--primary)] flex items-center gap-0.5 ml-1"
                          title="Reply in thread"
                        >
                          <ReplyIcon className="w-2.5 h-2.5" /> Reply
                        </button>
                        <button
                          onClick={() =>
                            setReactionPickerFor((id) => (id === msg.id ? null : msg.id))
                          }
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-[var(--foreground-dim)] hover:text-[var(--primary)] flex items-center gap-0.5"
                          title="Add reaction"
                        >
                          <Smile className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      {/* Reaction picker popover — shown when user clicks the smile button */}
                      {reactionPickerFor === msg.id && (
                        <div className="mt-1 inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-[var(--surface-elevated,var(--surface))] border border-[var(--border)] shadow-lg">
                          {REACTION_EMOJIS.map((e) => (
                            <button
                              key={e}
                              onClick={() => toggleReaction(msg.id, e)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-hover)] text-[13px] leading-none"
                              title={`React with ${e}`}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                      {msg.parent && (
                        <div className="mt-0.5 px-2 py-1 rounded border-l-2 border-[var(--primary)]/40 bg-[var(--surface-hover)]/40 text-[10px] text-[var(--foreground-dim)] truncate">
                          <CornerDownRight className="w-2.5 h-2.5 inline mr-1" />
                          <span className="font-medium">{msg.parent.authorName}</span>: {msg.parent.content.slice(0, 80)}
                        </div>
                      )}
                      <p className="text-[12px] text-[var(--foreground-muted)] leading-relaxed break-words whitespace-pre-wrap">
                        {renderWithMentions(msg.content)}
                      </p>
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {msg.reactions.map((r) => (
                            <button
                              key={r.emoji}
                              onClick={() => toggleReaction(msg.id, r.emoji)}
                              className={clsx(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] leading-none border transition-colors",
                                r.reactedByMe
                                  ? "bg-[var(--primary)]/15 border-[var(--primary)]/40 text-[var(--primary)]"
                                  : "bg-[var(--surface-hover)] border-[var(--border)] text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]/80"
                              )}
                              title={r.reactedByMe ? "Remove reaction" : "Add reaction"}
                            >
                              <span className="text-[11px]">{r.emoji}</span>
                              <span className="tabular-nums">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {!!msg.replyCount && msg.replyCount > 0 && (
                        <button
                          onClick={() => toggleThread(msg.id)}
                          className="text-[10px] text-[var(--primary)] mt-0.5 font-medium hover:underline"
                        >
                          {openThreadId === msg.id ? "Hide" : "View"} {msg.replyCount}{" "}
                          {msg.replyCount === 1 ? "reply" : "replies"}
                        </button>
                      )}
                      {openThreadId === msg.id && (
                        <div className="mt-2 ml-4 pl-3 border-l-2 border-[var(--primary)]/30 space-y-2">
                          {threadCache[msg.id]?.replies.map((r) => {
                            const rc = roleColors[r.author.role] || "#71717A";
                            return (
                              <div key={r.id} className="flex items-start gap-2">
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[8px] font-semibold mt-0.5"
                                  style={{ backgroundColor: `${rc}15`, color: rc }}
                                >
                                  {r.author.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-[10px] font-medium text-[var(--foreground)]">
                                      {r.author.name}
                                    </span>
                                    <span className="text-[9px] text-[var(--foreground-dim)]">
                                      {formatTime(r.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed break-words whitespace-pre-wrap">
                                    {renderWithMentions(r.content)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          {threadCache[msg.id]?.loading && (
                            <p className="text-[10px] text-[var(--foreground-dim)] italic">Loading…</p>
                          )}
                          {threadCache[msg.id]?.hasMore && !threadCache[msg.id]?.loading && (
                            <button
                              onClick={() => loadThread(msg.id, true)}
                              className="text-[10px] text-[var(--primary)] hover:underline"
                            >
                              Load more
                            </button>
                          )}
                          <button
                            onClick={() => setReplyTo(msg)}
                            className="text-[10px] text-[var(--foreground-dim)] hover:text-[var(--primary)] flex items-center gap-0.5"
                          >
                            <ReplyIcon className="w-2.5 h-2.5" /> Reply to thread
                          </button>
                        </div>
                      )}
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

          {typersHere.length > 0 && (
            <div className="px-3 py-1 text-[10px] text-[var(--foreground-dim)] italic">
              {typersHere.slice(0, 3).join(", ")}{typersHere.length > 3 ? ` and ${typersHere.length - 3} more` : ""} {typersHere.length === 1 ? "is" : "are"} typing…
            </div>
          )}

          {replyTo && (
            <div className="px-3 py-1.5 border-t border-[var(--border)] bg-[var(--surface-hover)]/40 flex items-start gap-2">
              <CornerDownRight className="w-3 h-3 text-[var(--primary)] mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-[var(--foreground-dim)]">
                  Replying to <span className="font-medium text-[var(--foreground-muted)]">{replyTo.author.name}</span>
                </p>
                <p className="text-[10px] text-[var(--foreground-dim)] truncate">{replyTo.content}</p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] shrink-0"
                title="Cancel reply"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="px-3 py-2 border-t border-[var(--border)] relative">
            {/* @-mention autocomplete dropdown — floats above the input */}
            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="absolute left-3 right-3 bottom-full mb-1 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated,var(--surface))] shadow-xl overflow-hidden z-20">
                <div className="px-3 py-1 text-[9px] text-[var(--foreground-dim)] uppercase tracking-wider border-b border-[var(--border)]">
                  {mentionQuery ? `Matching "${mentionQuery}"` : "Team members"}
                </div>
                {mentionMatches.map((emp, idx) => (
                  <button
                    key={emp.id}
                    onMouseDown={(e) => {
                      // onMouseDown fires before input blur, preserving focus
                      e.preventDefault();
                      selectMention(emp);
                    }}
                    onMouseEnter={() => setMentionIndex(idx)}
                    className={clsx(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors",
                      idx === mentionIndex
                        ? "bg-[var(--primary)]/10 text-[var(--foreground)]"
                        : "hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)]"
                    )}
                  >
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[9px] font-semibold"
                      style={{
                        backgroundColor: `${emp.brand?.color || "#F59E0B"}15`,
                        color: emp.brand?.color || "#F59E0B",
                      }}
                    >
                      {emp.firstName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-[var(--foreground)] truncate">
                        @{emp.firstName}{" "}
                        <span className="text-[var(--foreground-dim)]">{emp.lastName}</span>
                      </p>
                      {emp.title && (
                        <p className="text-[9px] text-[var(--foreground-dim)] truncate">{emp.title}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={onInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={() => {
                  // Close mention dropdown when focus leaves — but delay so a
                  // click on a dropdown item has time to fire via onMouseDown.
                  setTimeout(() => setMentionQuery(null), 120);
                }}
                placeholder={activeChannel ? (activeChannel.type === "DIRECT" ? "Send a DM…" : `#${activeChannel.name}`) : "Select a channel..."}
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

      {/* DM picker modal */}
      {dmOpen && (
        <div
          className="absolute inset-0 z-10 bg-[var(--background)]/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDmOpen(false)}
        >
          <div
            className="w-full max-w-[340px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Start a direct message</h3>
              <button onClick={() => setDmOpen(false)} className="text-[var(--foreground-dim)] hover:text-[var(--foreground)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-1">
              {(["ALL", "VCS", "BSL", "DPL"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setDmBrandFilter(b)}
                  className={clsx(
                    "text-[10px] px-2 py-1 rounded font-semibold uppercase tracking-wider transition-colors",
                    dmBrandFilter === b
                      ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                      : "text-[var(--foreground-dim)] hover:bg-[var(--surface-hover)]"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
            <div className="max-h-[280px] overflow-auto">
              {employees.length === 0 ? (
                <div className="p-6 text-center text-[11px] text-[var(--foreground-dim)]">
                  <Loader2 className="w-4 h-4 mx-auto mb-2 animate-spin" />
                  Loading team…
                </div>
              ) : (
                employees
                  .filter((e) =>
                    dmBrandFilter === "ALL" ? true : e.brand?.code === dmBrandFilter
                  )
                  .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => startDm(e.id)}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[var(--surface-hover)] text-left transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center text-[10px] font-semibold shrink-0"
                    >
                      {e.firstName.charAt(0)}
                      {e.lastName?.charAt(0) ?? ""}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-[var(--foreground)] truncate">
                        {e.firstName} {e.lastName}
                      </p>
                      {e.title && (
                        <p className="text-[10px] text-[var(--foreground-dim)] truncate">{e.title}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
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

  // Listen for the `open-unified-chat` window event so surfaces outside
  // the component (e.g. the mobile bottom nav) can open the panel without
  // having to share React state. Detail can optionally specify which tab
  // to land on: { detail: { tab: "ai" | "team" } }.
  useEffect(() => {
    const handler = (e: Event) => {
      setIsOpen(true);
      const ce = e as CustomEvent<{ tab?: ChatTab }>;
      if (ce.detail?.tab) setActiveTab(ce.detail.tab);
    };
    window.addEventListener("open-unified-chat", handler);
    return () => window.removeEventListener("open-unified-chat", handler);
  }, []);

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
