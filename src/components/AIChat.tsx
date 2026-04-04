"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  X,
  Minimize2,
  Sparkles,
  Loader2,
  MessageCircle,
  Zap,
  BarChart3,
  Users,
  Briefcase,
  Trash2,
  Copy,
  Check,
} from "lucide-react";
import { clsx } from "clsx";
import FUMascot from "./FUMascot";

const quickActions = [
  { icon: BarChart3, label: "Analytics", prompt: "Show me a summary of our dashboard analytics with key metrics" },
  { icon: Users, label: "Team Stats", prompt: "Show team performance across all brands with scores and workload" },
  { icon: Briefcase, label: "Top Clients", prompt: "Who are our top clients by MRR? Include their health scores" },
  { icon: Zap, label: "Quick Report", prompt: "Give me a quick business overview - revenue, tasks, and highlights" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] transition-all"
      title="Copy message"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-[var(--foreground)]">{children}</strong>,
        em: ({ children }) => <em className="italic text-[var(--foreground-muted)]">{children}</em>,
        h1: ({ children }) => <h1 className="text-lg font-bold text-[var(--foreground)] mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold text-[var(--foreground)] mb-2 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold text-[var(--foreground)] mb-1.5 mt-2 first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-[var(--foreground-muted)]">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-[var(--foreground-muted)]">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-[var(--surface-hover)] text-[var(--primary-light)] text-xs font-mono" {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className="block p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-green-300 overflow-x-auto mb-2" {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="mb-2">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[var(--primary)]/50 pl-3 italic text-[var(--foreground-muted)] mb-2">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-2 rounded-lg border border-[var(--border)]">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-[var(--surface)]">{children}</thead>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-[var(--foreground-muted)] border-b border-[var(--border)]">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-[var(--foreground-muted)] border-b border-white/5">{children}</td>,
        hr: () => <hr className="border-[var(--border)] my-3" />,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:text-[var(--primary-light)] underline underline-offset-2">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [welcomeShown, setWelcomeShown] = useState(true);
  const { messages, sendMessage, status, setMessages } = useChat();

  const isLoading = status === "streaming" || status === "submitted";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue.trim() });
    setInputValue("");
  };

  const handleQuickAction = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ text: prompt });
  };

  const handleClearChat = () => {
    setMessages([]);
    setWelcomeShown(true);
  };

  const getMessageText = (message: typeof messages[0]): string => {
    return (message.parts || [])
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  };

  // Mascot emotion based on state
  const mascotEmotion = isLoading ? "thinking" : messages.length > 0 ? "happy" : "idle";

  // Floating mascot button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[88px] right-4 lg:bottom-6 lg:right-6 z-40 group cursor-pointer"
      >
        <div className="absolute inset-[-12px] rounded-full bg-[var(--primary)]/10 blur-xl group-hover:bg-[var(--primary)]/20 transition-all duration-500" />
        <div className="relative hover:scale-110 active:scale-95 transition-transform duration-200">
          <FUMascot emotion="excited" size={64} />
          <span className="absolute top-0 right-0 w-5 h-5 bg-green-400 rounded-full border-[3px] border-[var(--background)] shadow-lg shadow-green-400/30">
            <span className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-60" />
          </span>
        </div>
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] text-[var(--primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 font-semibold backdrop-blur-sm">
          Ask FU AI
        </span>
      </button>
    );
  }

  return (
    <div
      className={clsx(
        "fixed z-50 transition-all duration-300",
        isMinimized
          ? "bottom-[88px] right-4 lg:bottom-6 lg:right-6 w-16 h-16"
          : "bottom-[88px] right-3 lg:bottom-6 lg:right-6 w-[calc(100vw-24px)] sm:w-[420px] h-[500px] lg:h-[600px]",
        isMinimized ? "" : "max-h-[calc(100vh-100px)]"
      )}
    >
      <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[var(--surface-elevated)] to-[var(--surface)] border border-[var(--border)] shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--primary)]/10 to-[var(--primary-dark)]/10">
          <div className="flex items-center gap-3">
            <FUMascot emotion={mascotEmotion} size={44} />
            <div>
              <h3 className="text-[var(--foreground)] font-semibold">FU AI</h3>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {isLoading ? "Thinking..." : "Online"} • Groq Powered
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)] transition-all"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {/* Welcome message */}
              {welcomeShown && messages.length === 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl px-4 py-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                      <span className="text-xs text-[var(--primary)] font-medium">FU AI</span>
                    </div>
                    <div className="text-sm">
                      <MarkdownContent content={"Hey there! I'm **FU AI** \u{1F916}\n\nYour intelligent CRM assistant powered by Groq. I can help you with:\n\n- **Dashboard insights** & analytics\n- **Client management** & health scores\n- **Team performance** & workloads\n- **Task tracking** & priorities\n- **Revenue reports** & trends\n\nWhat can I help you with today?"} />
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => {
                const text = getMessageText(message);
                return (
                  <div
                    key={message.id}
                    className={clsx(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={clsx(
                        "max-w-[88%] rounded-2xl px-4 py-3 group relative",
                        message.role === "user"
                          ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-[var(--foreground)] rounded-br-md"
                          : "bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-md"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                            <span className="text-xs text-[var(--primary)] font-medium">FU AI</span>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyButton text={text} />
                          </div>
                        </div>
                      )}
                      <div className={clsx(
                        "text-sm",
                        message.role === "user" ? "whitespace-pre-wrap leading-relaxed" : "prose-sm"
                      )}>
                        {message.role === "assistant" ? (
                          <MarkdownContent content={text} />
                        ) : (
                          <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Streaming indicator */}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3">
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

              {/* Quick Actions - show only with welcome message */}
              {messages.length === 0 && !isLoading && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-[var(--foreground-dim)] text-center">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(action.prompt)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-white/5 hover:border-white/15 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all group"
                      >
                        <action.icon className="w-4 h-4 text-[var(--primary)] group-hover:scale-110 transition-transform" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[var(--border)]">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isLoading ? "FU AI is thinking..." : "Ask me anything..."}
                  disabled={isLoading}
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={clsx(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                    inputValue.trim() && !isLoading
                      ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-[var(--foreground)] hover:opacity-90 hover:scale-105"
                      : "bg-[var(--surface)] text-[var(--foreground-dim)] cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
              <p className="text-[10px] text-[var(--foreground-dim)] text-center mt-2">
                Powered by Groq AI • FU Corp Command Center
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
