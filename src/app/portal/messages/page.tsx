"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Send, Loader2, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";

interface Message {
  id: string;
  sender: "client" | "agent";
  senderName: string;
  message: string;
  createdAt: string;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) return time;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday ${time}`;

  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${time}`;
}

export default function PortalMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessages = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const res = await fetch("/api/portal/messages", {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error(`Failed to load messages (${res.status})`);
        }
        const json = await res.json();
        const fetched: Message[] = json.messages || json;
        setMessages(fetched);
        setError(null);
      } catch (err) {
        if (showLoading) {
          setError(
            err instanceof Error ? err.message : "Failed to load messages"
          );
        }
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Poll every 10 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchMessages(false);
    }, 10000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: "client",
      senderName: "You",
      message: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");

    try {
      const res = await fetch("/api/portal/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      // Refresh messages to get server-confirmed version
      await fetchMessages(false);
    } catch {
      // Remove optimistic message and show error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setError("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }, [input, sending, fetchMessages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (error && loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <AlertCircle
          size={40}
          style={{ color: "var(--danger)", marginBottom: 16 }}
        />
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            margin: "0 0 8px 0",
            color: "var(--foreground)",
          }}
        >
          Failed to load messages
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--foreground-muted)",
            margin: "0 0 20px 0",
          }}
        >
          {error}
        </p>
        <button
          onClick={() => fetchMessages(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 20px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--foreground)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 56px - 48px)",
        maxHeight: 800,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            Messages
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--foreground-muted)",
              marginTop: 4,
            }}
          >
            Communicate directly with your account team.
          </p>
        </div>
      </div>

      {/* Inline error for send failures */}
      {error && !loading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: "var(--radius)",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            marginBottom: 12,
            fontSize: 13,
            color: "#EF4444",
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#EF4444",
              cursor: "pointer",
              fontSize: 16,
              padding: "0 4px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Messages container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          overflow: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {loading ? (
          // Skeleton loading
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: i % 2 === 0 ? "flex-start" : "flex-end",
                }}
              >
                <div
                  style={{
                    maxWidth: "70%",
                    padding: 14,
                    borderRadius: "var(--radius-lg)",
                    background:
                      i % 2 === 0
                        ? "var(--surface-elevated)"
                        : "var(--primary-dim)",
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 10,
                      borderRadius: 3,
                      background: "var(--surface-hover)",
                      animation: "pulse 1.5s ease-in-out infinite",
                      marginBottom: 8,
                    }}
                  />
                  <div
                    style={{
                      width: 140 + (i * 30) % 80,
                      height: 12,
                      borderRadius: 4,
                      background: "var(--surface-hover)",
                      animation: "pulse 1.5s ease-in-out infinite",
                      marginBottom: 4,
                    }}
                  />
                  <div
                    style={{
                      width: 80 + (i * 17) % 60,
                      height: 12,
                      borderRadius: 4,
                      background: "var(--surface-hover)",
                      animation: "pulse 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            ))}
          </>
        ) : messages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--foreground-dim)",
              padding: 32,
            }}
          >
            <MessageSquare
              size={40}
              style={{ marginBottom: 12, opacity: 0.3 }}
            />
            <p style={{ fontSize: 14, margin: 0 }}>No messages yet</p>
            <p style={{ fontSize: 13, marginTop: 4, opacity: 0.7 }}>
              Send a message to start a conversation.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isClient = msg.sender === "client";
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: isClient ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "75%",
                    minWidth: 120,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--foreground-dim)",
                      marginBottom: 4,
                      textAlign: isClient ? "right" : "left",
                      paddingLeft: isClient ? 0 : 4,
                      paddingRight: isClient ? 4 : 0,
                    }}
                  >
                    {msg.senderName}
                  </div>
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: isClient
                        ? "var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)"
                        : "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)",
                      background: isClient
                        ? "var(--primary-dim)"
                        : "var(--surface-elevated)",
                      border: isClient
                        ? "1px solid var(--border-primary)"
                        : "1px solid var(--border)",
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--foreground)",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.message}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--foreground-dim)",
                      marginTop: 4,
                      textAlign: isClient ? "right" : "left",
                      paddingLeft: isClient ? 0 : 4,
                      paddingRight: isClient ? 4 : 0,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderTop: "none",
          borderRadius: "0 0 var(--radius-xl) var(--radius-xl)",
          padding: 12,
          display: "flex",
          alignItems: "flex-end",
          gap: 10,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={sending}
          rows={1}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--background)",
            color: "var(--foreground)",
            fontSize: 14,
            lineHeight: 1.5,
            resize: "none",
            outline: "none",
            minHeight: 42,
            maxHeight: 120,
            fontFamily: "inherit",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.boxShadow = "var(--shadow-ring)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 42,
            height: 42,
            borderRadius: "var(--radius)",
            border: "none",
            background:
              !input.trim() || sending
                ? "var(--surface-hover)"
                : "var(--primary)",
            color: !input.trim() || sending ? "var(--foreground-dim)" : "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: !input.trim() || sending ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            flexShrink: 0,
          }}
        >
          {sending ? (
            <Loader2
              size={18}
              style={{ animation: "spin 0.8s linear infinite" }}
            />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
