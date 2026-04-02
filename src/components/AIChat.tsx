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
      className="p-1 rounded-md hover:bg-white/10 text-white/30 hover:text-white/60 transition-all"
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
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-white/80">{children}</em>,
        h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2 mt-3 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold text-white mb-2 mt-3 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold text-white mb-1.5 mt-2 first:mt-0">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-white/80">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-white/80">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-pink-300 text-xs font-mono" {...props}>
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
          <blockquote className="border-l-2 border-pink-400/50 pl-3 italic text-white/60 mb-2">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-2 rounded-lg border border-white/10">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-white/80 border-b border-white/10">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-white/60 border-b border-white/5">{children}</td>,
        hr: () => <hr className="border-white/10 my-3" />,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline underline-offset-2">
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
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
      >
        <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 animate-pulse" />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg shadow-pink-500/30 flex items-center justify-center hover:scale-110 transition-transform">
          <div className="relative">
            <MessageCircle className="w-8 h-8 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-bounce" />
          </div>
        </div>
        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-white/60 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          FU AI Assistant
        </span>
      </button>
    );
  }

  return (
    <div
      className={clsx(
        "fixed z-50 transition-all duration-300",
        isMinimized
          ? "bottom-4 right-4 sm:bottom-6 sm:right-6 w-16 h-16"
          : "bottom-3 right-3 sm:bottom-6 sm:right-6 w-[calc(100vw-24px)] sm:w-[440px] h-[640px]",
        isMinimized ? "" : "max-h-[calc(100vh-48px)] sm:max-h-[calc(100vh-100px)]"
      )}
    >
      <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border border-white/10 shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#1a1a2e]" />
            </div>
            <div>
              <h3 className="text-white font-semibold">FU AI</h3>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                {isLoading ? "Thinking..." : "Online"} • Groq Powered
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/60 transition-all"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-all"
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
                  <div className="max-w-[88%] rounded-2xl px-4 py-3 bg-white/5 border border-white/10 text-white/90 rounded-bl-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span className="text-xs text-pink-400 font-medium">FU AI</span>
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
                          ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-md"
                          : "bg-white/5 border border-white/10 text-white/90 rounded-bl-md"
                      )}
                    >
                      {message.role === "assistant" && (
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-pink-400" />
                            <span className="text-xs text-pink-400 font-medium">FU AI</span>
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
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
                      <span className="text-xs text-pink-400">Thinking...</span>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-pink-400/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-pink-400/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-pink-400/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions - show only with welcome message */}
              {messages.length === 0 && !isLoading && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs text-white/40 text-center">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(action.prompt)}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-xs text-white/70 hover:text-white transition-all group"
                      >
                        <action.icon className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isLoading ? "FU AI is thinking..." : "Ask me anything..."}
                  disabled={isLoading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50 disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className={clsx(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                    inputValue.trim() && !isLoading
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 hover:scale-105"
                      : "bg-white/5 text-white/30 cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
              <p className="text-[10px] text-white/30 text-center mt-2">
                Powered by Groq AI • FU Corp Command Center
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
