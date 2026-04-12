"use client";

import { useEffect, useState } from "react";
import {
  Sparkles, Loader2, AlertCircle, Check, Calendar, User, Flag, ListChecks, NotebookPen, ChevronDown,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface ActionItem {
  title: string;
  assignee?: string | null;
  dueDate?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH";
}

interface MeetingOutput {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  followUps: string[];
  createdTasks: Array<{ id: string; title: string }>;
}

interface ClientOption {
  id: string;
  companyName: string;
}

export default function MeetingNotesPage() {
  const { success, error: showError } = useToast();

  const [notes, setNotes] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [createTasks, setCreateTasks] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [output, setOutput] = useState<MeetingOutput | null>(null);

  useEffect(() => {
    fetch("/api/clients", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setClients(
            data.map((c: Record<string, unknown>) => ({
              id: String(c.id),
              companyName: String(c.companyName || ""),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleProcess = async () => {
    if (notes.trim().length < 10) {
      showError("Paste at least 10 characters of notes");
      return;
    }
    setProcessing(true);
    setOutput(null);
    try {
      const res = await fetch("/api/ai/meeting-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          clientId: clientId || null,
          createTasks,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process notes");
      }
      setOutput(data);
      success(
        `Extracted ${data.actionItems.length} action item(s)${
          createTasks && data.createdTasks?.length > 0
            ? ` — created ${data.createdTasks.length} task(s)`
            : ""
        }`
      );
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to process notes");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--foreground)] tracking-tight">
          AI Meeting Notes
        </h1>
        <p className="text-[13px] text-[var(--foreground-dim)] mt-0.5">
          Paste raw meeting notes. Groq will extract the summary, decisions,
          action items, and follow-ups — and optionally create tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="card p-5 space-y-3">
          <div>
            <label className="block text-[11px] text-[var(--foreground-dim)] mb-1 uppercase tracking-wider">
              Raw Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={14}
              placeholder={"Paste your meeting notes here. The more detail, the better the extraction.\n\nExample:\n- Called Alex at Acme. They're worried about onboarding timeline.\n- Agreed to ship the data migration doc by Friday.\n- Alex wants weekly status calls on Thursdays.\n- Discovered they'd prefer Slack over email for updates."}
              className="input-field resize-y min-h-[280px] font-mono text-[12px]"
            />
            <p className="text-[11px] text-[var(--foreground-dim)] mt-1">
              {notes.length} characters
            </p>
          </div>
          <div>
            <label className="block text-[11px] text-[var(--foreground-dim)] mb-1 uppercase tracking-wider">
              Link to Client <span className="normal-case">(optional)</span>
            </label>
            <div className="relative">
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="input-field appearance-none pr-8"
              >
                <option value="">No client link</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--foreground-dim)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-[var(--foreground-dim)] mt-1">
              When set, the summary is saved as a client note.
            </p>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[var(--foreground-muted)] cursor-pointer">
            <input
              type="checkbox"
              checked={createTasks}
              onChange={(e) => setCreateTasks(e.target.checked)}
              className="accent-[var(--primary)]"
            />
            Automatically create tasks from action items
          </label>
          <button
            onClick={handleProcess}
            disabled={processing || notes.trim().length < 10}
            className="btn-primary w-full disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {processing ? "Processing…" : "Extract with AI"}
          </button>
        </div>

        {/* Output */}
        <div className="card p-5 space-y-4 min-h-[360px]">
          {!output && !processing && (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center text-[var(--foreground-dim)]">
              <Sparkles className="w-10 h-10 opacity-30 mb-2" />
              <p className="text-[13px]">Your extracted output will appear here</p>
            </div>
          )}
          {processing && (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)] mb-2" />
              <p className="text-[12px] text-[var(--foreground-dim)]">Processing…</p>
            </div>
          )}
          {output && (
            <>
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <NotebookPen className="w-4 h-4 text-[var(--primary)]" />
                  <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Summary</h3>
                </div>
                <p className="text-[12px] text-[var(--foreground-muted)] leading-relaxed">
                  {output.summary || "—"}
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                    Decisions ({output.decisions.length})
                  </h3>
                </div>
                {output.decisions.length === 0 ? (
                  <p className="text-[12px] text-[var(--foreground-dim)]">No decisions captured</p>
                ) : (
                  <ul className="space-y-1">
                    {output.decisions.map((d, i) => (
                      <li key={i} className="text-[12px] text-[var(--foreground-muted)] flex items-start gap-2">
                        <span className="text-[var(--primary)] mt-0.5">•</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <ListChecks className="w-4 h-4 text-blue-400" />
                  <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                    Action Items ({output.actionItems.length})
                  </h3>
                  {output.createdTasks.length > 0 && (
                    <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                      {output.createdTasks.length} task{output.createdTasks.length !== 1 ? "s" : ""} created
                    </span>
                  )}
                </div>
                {output.actionItems.length === 0 ? (
                  <p className="text-[12px] text-[var(--foreground-dim)]">No action items</p>
                ) : (
                  <ul className="space-y-2">
                    {output.actionItems.map((a, i) => (
                      <li key={i} className="p-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)]">
                        <p className="text-[12px] text-[var(--foreground)] font-medium">{a.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--foreground-dim)]">
                          {a.assignee && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {a.assignee}
                            </span>
                          )}
                          {a.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {a.dueDate}
                            </span>
                          )}
                          {a.priority && (
                            <span className="flex items-center gap-1">
                              <Flag className="w-3 h-3" /> {a.priority}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
                    Follow-ups ({output.followUps.length})
                  </h3>
                </div>
                {output.followUps.length === 0 ? (
                  <p className="text-[12px] text-[var(--foreground-dim)]">No follow-ups</p>
                ) : (
                  <ul className="space-y-1">
                    {output.followUps.map((f, i) => (
                      <li key={i} className="text-[12px] text-[var(--foreground-muted)] flex items-start gap-2">
                        <span className="text-[var(--primary)] mt-0.5">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
