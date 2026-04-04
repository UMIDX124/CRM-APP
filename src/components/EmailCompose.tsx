"use client";

import { useState } from "react";
import { Send, X, Paperclip, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { clients } from "@/data/mock-data";
import { useToast } from "@/components/ui/toast";

export default function EmailCompose({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const { success, error } = useToast();

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!to || !subject || !body) { error("Fill all fields"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      if (res.ok) {
        success("Email sent successfully!");
        setTo(""); setSubject(""); setBody("");
        onClose();
      } else {
        error("Failed to send email");
      }
    } catch {
      // Mock success when API not connected
      success("Email logged (demo mode)");
      onClose();
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[#FF6B00]/5 to-transparent">
          <h3 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
            <Send className="w-5 h-5 text-[#FF6B00]" />
            Compose Email
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)]"><X className="w-5 h-5" /></button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* To */}
          <div>
            <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">To</label>
            <div className="relative">
              <input type="email" value={to} onChange={(e) => setTo(e.target.value)} list="client-emails"
                placeholder="recipient@email.com" className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
              <datalist id="client-emails">
                {clients.map((c) => <option key={c.id} value={c.email}>{c.companyName} — {c.contactName}</option>)}
              </datalist>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject..." className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs text-[var(--foreground-dim)] mb-1.5 uppercase tracking-wider">Message</label>
            <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here..." className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 resize-none leading-relaxed" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface)] text-[var(--foreground-dim)] text-xs hover:text-[var(--foreground-muted)] transition-all">
            <Paperclip className="w-4 h-4" /> Attach File
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] text-sm">Discard</button>
            <button onClick={handleSend} disabled={sending || !to || !subject || !body}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#E05500] text-black font-semibold text-sm disabled:opacity-30">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
