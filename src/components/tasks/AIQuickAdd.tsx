"use client";

import { useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { useToast } from "@/components/ui/toast";

type ParsedPreview = {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string | null;
  assigneeHint?: string | null;
  tags?: string[];
};

export default function AIQuickAdd({
  brandId,
  onCreated,
}: {
  brandId?: string | null;
  onCreated?: () => void;
}) {
  const { success, error: showError } = useToast();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ParsedPreview | null>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/tasks/ai/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), brandId, create: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      setPreview(data.parsed);
      setText("");
      success(`Task created: ${data.parsed.title}`);
      onCreated?.();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[var(--primary)] shrink-0">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs font-semibold hidden sm:inline">AI Quick Add</span>
        </div>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe a task — e.g. 'Schedule John to fix the login bug by Friday, high priority'"
          disabled={loading}
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--primary)] text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">{loading ? "Parsing..." : "Add"}</span>
        </button>
      </form>

      {preview && (
        <div className="mt-3 rounded-lg bg-[var(--background)] border border-[var(--border)] p-3 text-sm space-y-1">
          <div className="flex items-center gap-2 text-[var(--foreground)]">
            <span className="font-semibold">{preview.title}</span>
            {preview.priority && (
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-elevated)] text-[var(--foreground-dim)]">
                {preview.priority}
              </span>
            )}
          </div>
          {preview.description && (
            <p className="text-xs text-[var(--foreground-dim)]">{preview.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-[var(--foreground-dim)]">
            {preview.dueDate && <span>Due: {preview.dueDate}</span>}
            {preview.assigneeHint && <span>Assignee hint: {preview.assigneeHint}</span>}
            {preview.tags && preview.tags.length > 0 && (
              <span>Tags: {preview.tags.join(", ")}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
