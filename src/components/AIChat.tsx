"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { clsx } from "clsx";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  context?: {
    userName?: string;
    userRole?: string;
    brand?: string;
    clients?: any[];
    employees?: any[];
    tasks?: any[];
  };
}

const quickActions = [
  { icon: BarChart3, label: "Analytics", prompt: "Show me my dashboard analytics" },
  { icon: Users, label: "Team Stats", prompt: "Show team performance" },
  { icon: Briefcase, label: "Top Clients", prompt: "Who are my top clients by revenue?" },
  { icon: Zap, label: "Quick Actions", prompt: "What can you help me with?" },
];

export default function AIChat({ context }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hey there! I'm FU AI 🤖\n\nYour intelligent CRM assistant powered by Claude. I can help you with:\n\n• Dashboard insights & analytics\n• Client management\n• Team performance\n• Task updates\n• Revenue reports\n\nWhat can I help you with today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          context: context,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Sorry, I couldn't process that request.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Oops! Something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleQuickAction = async (prompt: string) => {
    setInput(prompt);
    setInput("");
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          context: context,
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Sorry, I couldn't process that request.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Oops! Something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
      >
        {/* Floating animation */}
        <div className="absolute -inset-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 animate-pulse" />
        
        {/* Button */}
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg shadow-pink-500/30 flex items-center justify-center hover:scale-110 transition-transform">
          {/* Mascot face */}
          <div className="relative">
            <MessageCircle className="w-8 h-8 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-bounce" />
          </div>
        </div>
        
        {/* Label */}
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
          ? "bottom-6 right-6 w-16 h-16"
          : "bottom-6 right-6 w-96 sm:w-[420px] h-[600px]",
        isMinimized ? "" : "max-h-[calc(100vh-100px)]"
      )}
    >
      <div className="w-full h-full rounded-2xl bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] border border-white/10 shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            {/* Mascot Avatar */}
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
                Online • Claude Powered
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={clsx(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={clsx(
                      "max-w-[85%] rounded-2xl px-4 py-3",
                      message.role === "user"
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-br-md"
                        : "bg-white/5 border border-white/10 text-white/90 rounded-bl-md"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3 h-3 text-pink-400" />
                        <span className="text-xs text-pink-400 font-medium">FU AI</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
                      <span className="text-xs text-pink-400">Thinking...</span>
                      <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {messages.length === 1 && !isLoading && (
                <div className="space-y-2">
                  <p className="text-xs text-white/40 text-center">Quick Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(action.prompt)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-white/70 hover:text-white transition-all"
                      >
                        <action.icon className="w-4 h-4 text-pink-400" />
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
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={clsx(
"w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                    input.trim()
                      ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90"
                      : "bg-white/5 text-white/30 cursor-not-allowed"
                  )}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[10px] text-white/30 text-center mt-2">
                Powered by Claude AI • FU Corp Command Center
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
