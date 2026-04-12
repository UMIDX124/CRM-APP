"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Search, LayoutDashboard, Building2, Users, CheckSquare, Briefcase,
  BarChart3, ClipboardCheck, ArrowRight, Sparkles, Loader2, Send,
  FileText, LifeBuoy, DollarSign, Plus,
} from "lucide-react";
import { clsx } from "clsx";
// Search data fetched from API on palette open

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: typeof Search;
  category: string;
  action: () => void;
  keywords?: string[];
}

const suggestedPrompts = [
  "Summarize today's pipeline",
  "Show overdue tasks",
  "Draft a follow-up email",
];

interface SearchEmployee { id: string; name: string; title: string; brand: string; email: string; department: string }
interface SearchClient { id: string; companyName: string; contactName: string; email: string; brand: string; mrr: number }
interface SearchTask { id: string; title: string; assignee: string; status: string; client: string; brand: string }
interface SearchLead { id: string; companyName: string; contactName: string; value: number; status: string; salesRep: string }
interface SearchInvoice { id: string; number: string; client: string; total: number; status: string; brand: string }
interface SearchTicket { id: string; number: string; subject: string; priority: string; status: string; client: string; brand: string }
interface SearchDeal { id: string; title: string; client: string; value: number; stage: string; brand: string }

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<"search" | "ai">("search");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const router = useRouter();

  // API-fetched search data
  const [employees, setEmployees] = useState<SearchEmployee[]>([]);
  const [clients, setClients] = useState<SearchClient[]>([]);
  const [tasks, setTasks] = useState<SearchTask[]>([]);
  const [leads, setLeads] = useState<SearchLead[]>([]);
  const [invoices, setInvoices] = useState<SearchInvoice[]>([]);
  const [tickets, setTickets] = useState<SearchTicket[]>([]);
  const [deals, setDeals] = useState<SearchDeal[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // Load recent-item ids once on mount — survives full-page reload
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cmdk-recent");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentIds(parsed.slice(0, 8));
      }
    } catch {
      /* no-op */
    }
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 8);
      try {
        localStorage.setItem("cmdk-recent", JSON.stringify(next));
      } catch {
        /* no-op */
      }
      return next;
    });
  }, []);

  // Fetch data when palette opens
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/employees", { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch("/api/clients", { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch("/api/tasks", { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch("/api/leads", { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch("/api/invoices", { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch("/api/tickets", { cache: "no-store" }).then(r => r.ok ? r.json() : []),
      fetch("/api/deals", { cache: "no-store" }).then(r => r.ok ? r.json() : []),
    ]).then(([emps, cls, tsks, lds, invs, tkts, dls]) => {
      if (Array.isArray(emps)) setEmployees(emps.map((e: Record<string, unknown>) => ({
        id: String(e.id), name: `${e.firstName || ""} ${e.lastName || ""}`.trim(),
        title: String(e.title || ""), brand: (e.brand as Record<string, string>)?.code || "",
        email: String(e.email || ""), department: String(e.department || ""),
      })));
      if (Array.isArray(cls)) setClients(cls.map((c: Record<string, unknown>) => ({
        id: String(c.id), companyName: String(c.companyName || ""),
        contactName: String(c.contactName || ""), email: String(c.email || ""),
        brand: (c.brand as Record<string, string>)?.code || "", mrr: Number(c.mrr) || 0,
      })));
      if (Array.isArray(tsks)) setTasks(tsks.map((t: Record<string, unknown>) => ({
        id: String(t.id), title: String(t.title || ""), status: String(t.status || ""),
        assignee: t.assignee ? `${(t.assignee as Record<string, string>).firstName || ""} ${(t.assignee as Record<string, string>).lastName || ""}`.trim() : "",
        client: (t.client as Record<string, string>)?.companyName || "", brand: (t.brand as Record<string, string>)?.code || "",
      })));
      if (Array.isArray(lds)) setLeads(lds.map((l: Record<string, unknown>) => ({
        id: String(l.id), companyName: String(l.companyName || ""),
        contactName: String(l.contactName || ""), value: Number(l.value) || 0,
        status: String(l.status || ""), salesRep: String(l.salesRepId || ""),
      })));
      if (Array.isArray(invs)) setInvoices(invs.map((i: Record<string, unknown>) => ({
        id: String(i.id), number: String(i.number || ""),
        client: (i.client as Record<string, string>)?.companyName || "",
        total: Number(i.total) || 0, status: String(i.status || ""),
        brand: (i.brand as Record<string, string>)?.code || "",
      })));
      if (Array.isArray(tkts)) setTickets(tkts.map((t: Record<string, unknown>) => ({
        id: String(t.id),
        number: String((t.number ?? "").toString() || ""),
        subject: String(t.subject || ""),
        priority: String(t.priority || ""),
        status: String(t.status || ""),
        client: (t.client as Record<string, string>)?.companyName || "",
        brand: (t.brand as Record<string, string>)?.code || "",
      })));
      if (Array.isArray(dls)) setDeals(dls.map((d: Record<string, unknown>) => ({
        id: String(d.id), title: String(d.title || ""),
        client: (d.client as Record<string, string>)?.companyName || "",
        value: Number(d.value) || 0, stage: String(d.stage || ""),
        brand: (d.brand as Record<string, string>)?.code || "",
      })));
    }).catch(() => {});
  }, [open]);

  const { messages, setMessages, sendMessage, status } = useChat();
  const isStreaming = status === "streaming" || status === "submitted";

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        triggerRef.current = document.activeElement;
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Auto-focus + reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setMode("search");
      setMessages([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // Return focus to triggering element
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
        triggerRef.current = null;
      }
    }
  }, [open, setMessages]);

  const navigate = useCallback((path: string) => {
    router.push(path);
    setOpen(false);
  }, [router]);

  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];
    items.push(
      { id: "nav-dash", label: "Dashboard", description: "Overview & KPIs", icon: LayoutDashboard, category: "Navigation", action: () => navigate("/"), keywords: ["home", "overview"] },
      { id: "nav-clients", label: "Clients", description: "Client management", icon: Building2, category: "Navigation", action: () => navigate("/clients"), keywords: ["contacts", "customers"] },
      { id: "nav-team", label: "Team", description: "Employee directory", icon: Users, category: "Navigation", action: () => navigate("/employees"), keywords: ["employees", "staff", "people"] },
      { id: "nav-tasks", label: "Tasks", description: "Task management", icon: CheckSquare, category: "Navigation", action: () => navigate("/tasks"), keywords: ["todo", "kanban"] },
      { id: "nav-pipeline", label: "Pipeline", description: "Sales pipeline", icon: Briefcase, category: "Navigation", action: () => navigate("/pipeline"), keywords: ["deals", "sales", "leads"] },
      { id: "nav-invoices", label: "Invoices", description: "Billing & payments", icon: FileText, category: "Navigation", action: () => navigate("/invoices"), keywords: ["billing", "payments"] },
      { id: "nav-tickets", label: "Tickets", description: "Support tickets", icon: LifeBuoy, category: "Navigation", action: () => navigate("/tickets"), keywords: ["support", "help"] },
      { id: "nav-attendance", label: "Attendance", description: "Staff attendance", icon: ClipboardCheck, category: "Navigation", action: () => navigate("/attendance"), keywords: ["checkin", "presence"] },
      { id: "nav-reports", label: "Reports", description: "Analytics & exports", icon: BarChart3, category: "Navigation", action: () => navigate("/reports"), keywords: ["analytics", "export"] },
    );
    // Quick actions — verbs first
    items.push(
      { id: "qa-new-client", label: "New Client", description: "Create a client record", icon: Plus, category: "Actions", action: () => navigate("/clients"), keywords: ["add", "create", "client"] },
      { id: "qa-new-task", label: "New Task", description: "Create a task", icon: Plus, category: "Actions", action: () => navigate("/tasks"), keywords: ["add", "create", "task"] },
      { id: "qa-new-invoice", label: "New Invoice", description: "Draft an invoice", icon: Plus, category: "Actions", action: () => navigate("/invoices"), keywords: ["add", "create", "invoice", "billing"] },
      { id: "qa-new-lead", label: "New Lead", description: "Add a pipeline lead", icon: Plus, category: "Actions", action: () => navigate("/pipeline"), keywords: ["add", "create", "lead", "pipeline"] },
      { id: "qa-new-ticket", label: "New Ticket", description: "Open a support ticket", icon: Plus, category: "Actions", action: () => navigate("/tickets"), keywords: ["add", "create", "ticket", "support"] },
      { id: "qa-meeting-notes", label: "Process Meeting Notes", description: "AI extracts action items", icon: Sparkles, category: "Actions", action: () => navigate("/ai/meeting-notes"), keywords: ["ai", "meeting", "notes", "extract"] },
    );
    employees.forEach((emp) => {
      items.push({
        id: `emp-${emp.id}`, label: emp.name, description: `${emp.title} · ${emp.brand}`,
        icon: Users, category: "Employees", action: () => navigate("/employees"),
        keywords: [emp.email, emp.department, emp.brand],
      });
    });
    clients.forEach((c) => {
      items.push({
        id: `client-${c.id}`, label: c.companyName, description: `${c.contactName} · ${c.brand} · $${(c.mrr || 0).toLocaleString()}/mo`,
        icon: Building2, category: "Clients", action: () => navigate("/clients"),
        keywords: [c.contactName, c.email, c.brand],
      });
    });
    tasks.forEach((t) => {
      items.push({
        id: `task-${t.id}`, label: t.title, description: `${t.assignee} · ${t.status} · ${t.brand}`,
        icon: CheckSquare, category: "Tasks", action: () => navigate("/tasks"),
        keywords: [t.assignee, t.client, t.status],
      });
    });
    leads.forEach((l) => {
      items.push({
        id: `lead-${l.id}`, label: l.companyName, description: `${l.contactName} · $${(l.value || 0).toLocaleString()} · ${l.status}`,
        icon: Briefcase, category: "Leads", action: () => navigate("/pipeline"),
        keywords: [l.contactName, l.salesRep, l.status],
      });
    });
    invoices.forEach((inv) => {
      items.push({
        id: `invoice-${inv.id}`, label: `#${inv.number}`, description: `${inv.client} · $${inv.total.toLocaleString()} · ${inv.status}`,
        icon: FileText, category: "Invoices", action: () => navigate("/invoices"),
        keywords: [inv.client, inv.status, inv.brand],
      });
    });
    tickets.forEach((tkt) => {
      items.push({
        id: `ticket-${tkt.id}`, label: tkt.subject, description: `#${tkt.number} · ${tkt.priority} · ${tkt.status}`,
        icon: LifeBuoy, category: "Tickets", action: () => navigate("/tickets"),
        keywords: [tkt.number, tkt.client, tkt.priority, tkt.status],
      });
    });
    deals.forEach((d) => {
      items.push({
        id: `deal-${d.id}`, label: d.title, description: `${d.client} · $${d.value.toLocaleString()} · ${d.stage}`,
        icon: DollarSign, category: "Deals", action: () => navigate("/deals"),
        keywords: [d.client, d.stage, d.brand],
      });
    });
    return items;
  }, [navigate, employees, clients, tasks, leads, invoices, tickets, deals]);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show recent + quick actions + navigation when the user hasn't typed yet.
      const nav = commands.filter((c) => c.category === "Navigation");
      const actions = commands.filter((c) => c.category === "Actions");
      const recents: CommandItem[] = [];
      for (const rid of recentIds) {
        const match = commands.find((c) => c.id === rid);
        if (match) recents.push({ ...match, category: "Recent" });
        if (recents.length >= 5) break;
      }
      return [...recents, ...actions, ...nav];
    }
    const q = query.toLowerCase();
    return commands.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.keywords?.some((k) => k.toLowerCase().includes(q))
    ).slice(0, 16);
  }, [query, commands, recentIds]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filtered.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filtered]);

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === "ai") {
      if (e.key === "Enter" && !e.shiftKey && query.trim() && !isStreaming) {
        e.preventDefault();
        handleAISubmit();
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setMode("search");
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (!item.id.startsWith("nav-") && !item.id.startsWith("qa-")) {
        pushRecent(item.id);
      }
      item.action();
    } else if (e.key === "Tab") {
      e.preventDefault();
      setMode("ai");
    }
  };

  const handleAISubmit = () => {
    if (!query.trim() || isStreaming) return;
    sendMessage({ text: query.trim() });
    setQuery("");
  };

  const handleChipClick = (prompt: string) => {
    setMode("ai");
    sendMessage({ text: prompt });
  };

  const getMessageText = (message: typeof messages[0]): string => {
    return (message.parts || [])
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  };

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Command bar"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-[620px] modal-content overflow-hidden" style={{ marginTop: "-10vh" }}>
        {/* Mode tabs + Search Input */}
        <div className="border-b border-[var(--border)]">
          <div className="flex items-center gap-1 px-4 pt-3 pb-0">
            <button
              onClick={() => setMode("search")}
              className={clsx(
                "px-3 py-1.5 text-[11px] font-medium rounded-t-lg transition-colors",
                mode === "search" ? "text-[var(--foreground)] bg-[var(--surface-hover)]" : "text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)]"
              )}
            >
              <Search className="w-3 h-3 inline mr-1.5" />Search
            </button>
            <button
              onClick={() => setMode("ai")}
              className={clsx(
                "px-3 py-1.5 text-[11px] font-medium rounded-t-lg transition-colors",
                mode === "ai" ? "text-[var(--primary)] bg-[var(--primary-subtle)]" : "text-[var(--foreground-dim)] hover:text-[var(--foreground-muted)]"
              )}
            >
              <Sparkles className="w-3 h-3 inline mr-1.5" />AI
            </button>
          </div>
          <div className="flex items-center gap-3 px-5 py-3">
            {mode === "search" ? (
              <Search className="w-5 h-5 text-[var(--foreground-dim)] shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-[var(--primary)] shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "search" ? "Search commands, employees, clients, tasks..." : "Ask FU AI anything..."}
              className="input-field border-0 shadow-none bg-transparent p-0 text-sm focus:ring-0"
              aria-label={mode === "search" ? "Search" : "Ask AI"}
            />
            {mode === "ai" && query.trim() && (
              <button
                onClick={handleAISubmit}
                disabled={isStreaming}
                className="p-1.5 rounded-lg bg-[var(--primary)] text-black hover:opacity-90 transition-all disabled:opacity-50 shrink-0"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-[10px] text-[var(--foreground-dim)] font-mono shrink-0">
              ESC
            </kbd>
          </div>
        </div>

        {/* Content area */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2 scrollbar-thin">
          {mode === "search" ? (
            <>
              {Object.entries(grouped).length === 0 ? (
                <div className="py-10 text-center">
                  <Search className="w-8 h-8 text-[var(--foreground-dim)]/20 mx-auto mb-2" />
                  <p className="text-sm text-[var(--foreground-dim)]">No results found</p>
                  <p className="text-xs text-[var(--foreground-dim)] mt-1">Try a different search term</p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => {
                  let globalOffset = 0;
                  for (const [cat, itms] of Object.entries(grouped)) {
                    if (cat === category) break;
                    globalOffset += itms.length;
                  }
                  return (
                    <div key={category}>
                      <p className="px-5 py-1.5 text-[10px] font-semibold text-[var(--foreground-dim)] uppercase tracking-widest">
                        {category}
                      </p>
                      {items.map((item, i) => {
                        const idx = globalOffset + i;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            data-index={idx}
                            onClick={() => {
                              if (!item.id.startsWith("nav-") && !item.id.startsWith("qa-")) {
                                pushRecent(item.id);
                              }
                              item.action();
                            }}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={clsx(
                              "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                              idx === selectedIndex ? "bg-[var(--surface-elevated)]" : "hover:bg-[var(--surface)]"
                            )}
                          >
                            <div className={clsx(
                              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                              idx === selectedIndex ? "bg-[var(--primary-subtle)]" : "bg-[var(--surface)]"
                            )}>
                              <Icon className={clsx("w-4 h-4", idx === selectedIndex ? "text-[var(--primary)]" : "text-[var(--foreground-dim)]")} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={clsx("text-sm truncate", idx === selectedIndex ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]")}>{item.label}</p>
                              {item.description && (
                                <p className="text-xs text-[var(--foreground-dim)] truncate">{item.description}</p>
                              )}
                            </div>
                            {idx === selectedIndex && <ArrowRight className="w-4 h-4 text-[var(--primary)] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </>
          ) : (
            /* AI Mode */
            <div className="px-5 py-3 space-y-4">
              {messages.length === 0 && !isStreaming ? (
                /* Empty state with suggested prompts */
                <div className="text-center py-6">
                  <Sparkles className="w-8 h-8 text-[var(--primary)]/30 mx-auto mb-3" />
                  <p className="text-sm text-[var(--foreground-muted)] mb-4">Ask FU AI about your business data</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {suggestedPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleChipClick(prompt)}
                        className="px-3 py-1.5 rounded-full text-[12px] text-[var(--foreground-muted)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary)]/30 hover:text-[var(--primary)] transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* AI messages */
                messages.map((msg) => {
                  const text = getMessageText(msg);
                  if (msg.role === "user") {
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-[var(--primary)] text-black text-sm">
                          {text}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[90%] rounded-2xl rounded-bl-sm px-4 py-3 bg-[var(--surface)] border border-[var(--border)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                          <span className="text-[10px] text-[var(--primary)] font-medium">FU AI</span>
                        </div>
                        <div className="text-sm text-[var(--foreground-muted)] prose-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-[var(--surface)] border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-[var(--primary)]" />
                      <span className="text-[10px] text-[var(--primary)]">Thinking...</span>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-[var(--primary)]/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-[var(--primary)]/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-[var(--primary)]/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-4 text-[10px] text-[var(--foreground-dim)]">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] font-mono">Tab</kbd> switch mode
            </span>
            {mode === "search" ? (
              <>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] font-mono">&uarr;&darr;</kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] font-mono">&crarr;</kbd> select
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] font-mono">&crarr;</kbd> send
              </span>
            )}
          </div>
          <span className="text-[10px] text-[var(--foreground-dim)]">Alpha Command Center</span>
        </div>
      </div>
    </div>
  );
}
