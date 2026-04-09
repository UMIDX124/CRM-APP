"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Webhook as WebhookIcon,
  X,
  Zap,
  Copy,
  Check,
  Trash2,
  Power,
  Activity,
  CheckCircle2,
  XCircle,
  PlayCircle,
} from "lucide-react";

const ALL_EVENTS = [
  { id: "LEAD_CREATED", label: "Lead Created", group: "Leads" },
  { id: "CLIENT_CREATED", label: "Client Created", group: "Clients" },
  { id: "DEAL_CREATED", label: "Deal Created", group: "Deals" },
  { id: "DEAL_STAGE_CHANGED", label: "Deal Stage Changed", group: "Deals" },
  { id: "DEAL_WON", label: "Deal Won", group: "Deals" },
  { id: "DEAL_LOST", label: "Deal Lost", group: "Deals" },
  { id: "TICKET_CREATED", label: "Ticket Created", group: "Tickets" },
  { id: "TICKET_STATUS_CHANGED", label: "Ticket Status Changed", group: "Tickets" },
  { id: "TICKET_RESOLVED", label: "Ticket Resolved", group: "Tickets" },
  { id: "INVOICE_CREATED", label: "Invoice Created", group: "Invoices" },
  { id: "INVOICE_PAID", label: "Invoice Paid", group: "Invoices" },
] as const;

interface Webhook {
  id: string;
  name: string;
  url: string;
  description: string | null;
  events: string[];
  isActive: boolean;
  secret: string | null;
  brand: { code: string; color: string } | null;
  totalDeliveries: number;
  successCount: number;
  failureCount: number;
  lastTriggeredAt: string | null;
  lastError: string | null;
  createdAt: string;
}

interface Delivery {
  id: string;
  event: string;
  status: string;
  responseStatus: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
}

export default function WebhooksModule() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [openWebhook, setOpenWebhook] = useState<Webhook | null>(null);

  const fetchHooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) setWebhooks(await res.json());
    } catch (err) {
      console.error("Failed to load webhooks", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHooks();
  }, [fetchHooks]);

  const totalDeliveries = webhooks.reduce((s, w) => s + w.totalDeliveries, 0);
  const successCount = webhooks.reduce((s, w) => s + w.successCount, 0);
  const failureCount = webhooks.reduce((s, w) => s + w.failureCount, 0);
  const successRate =
    totalDeliveries > 0 ? Math.round((successCount / totalDeliveries) * 100) : 0;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title">Webhooks</h2>
          <p className="page-subtitle">
            Outbound integrations · fire on domain events
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="btn-primary text-[12px] gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> New Webhook
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Active Webhooks",
            value: String(webhooks.filter((w) => w.isActive).length),
            icon: WebhookIcon,
            color: "#F59E0B",
          },
          {
            label: "Total Deliveries",
            value: totalDeliveries.toLocaleString(),
            icon: Activity,
            color: "#3B82F6",
          },
          {
            label: "Success Rate",
            value: `${successRate}%`,
            icon: CheckCircle2,
            color: "#10B981",
          },
          {
            label: "Failures",
            value: failureCount.toLocaleString(),
            icon: XCircle,
            color: "#EF4444",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="kpi-card animate-fade-in-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${kpi.color}12` }}
              >
                <kpi.icon className="w-[18px] h-[18px]" style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="text-[10px] font-medium text-[var(--foreground-dim)] uppercase tracking-wider">
              {kpi.label}
            </p>
            <p className="text-[22px] font-semibold text-[var(--foreground)] tabular-nums tracking-tight">
              {loading ? <span className="skeleton inline-block h-7 w-12" /> : kpi.value}
            </p>
          </div>
        ))}
      </div>

      <div className="card-glow overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-lg" />
            ))}
          </div>
        ) : webhooks.length === 0 ? (
          <div className="empty-state py-16">
            <WebhookIcon className="w-10 h-10 text-[var(--foreground-dim)] mb-3" />
            <p className="text-[13px] text-[var(--foreground-dim)]">
              No webhooks configured
            </p>
            <p className="text-[11px] text-[var(--foreground-dim)] mt-1">
              Add a webhook to forward CRM events to external systems
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {webhooks.map((w) => {
              const rate =
                w.totalDeliveries > 0
                  ? Math.round((w.successCount / w.totalDeliveries) * 100)
                  : 0;
              return (
                <button
                  key={w.id}
                  onClick={() => setOpenWebhook(w)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[var(--surface-hover)] transition-colors text-left"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      w.isActive ? "bg-green-500" : "bg-[var(--foreground-dim)]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[var(--foreground)]">
                        {w.name}
                      </p>
                      {w.brand && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: `${w.brand.color}15`,
                            color: w.brand.color,
                          }}
                        >
                          {w.brand.code}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--foreground-dim)] font-mono truncate mt-0.5">
                      {w.url}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-[var(--foreground-dim)]">
                        {w.events.length} event
                        {w.events.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[10px] text-[var(--foreground-dim)]">
                        · {w.totalDeliveries.toLocaleString()} deliveries
                      </span>
                      {w.totalDeliveries > 0 && (
                        <span
                          className="text-[10px] tabular-nums"
                          style={{
                            color: rate >= 95 ? "#10B981" : rate >= 80 ? "#F59E0B" : "#EF4444",
                          }}
                        >
                          · {rate}% success
                        </span>
                      )}
                    </div>
                  </div>
                  <Activity className="w-4 h-4 text-[var(--foreground-dim)] shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {createOpen && (
        <CreateWebhookModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void fetchHooks();
          }}
        />
      )}

      {openWebhook && (
        <WebhookDetailModal
          webhook={openWebhook}
          onClose={() => setOpenWebhook(null)}
          onUpdated={() => {
            setOpenWebhook(null);
            void fetchHooks();
          }}
        />
      )}
    </div>
  );
}

function CreateWebhookModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) =>
    setEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setError("Name and URL are required");
      return;
    }
    if (events.length === 0) {
      setError("Select at least one event");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          description: description.trim() || null,
          events,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to create webhook");
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const groups = Array.from(new Set(ALL_EVENTS.map((e) => e.group)));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 modal-mobile-drawer">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h3 className="text-[16px] font-semibold text-[var(--foreground)]">
            New Webhook
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
              Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full text-[12px]"
              placeholder="e.g. Slack notifications"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
              Endpoint URL *
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-field w-full text-[12px] font-mono"
              placeholder="https://example.com/webhook"
            />
          </div>
          <div>
            <label className="text-[11px] text-[var(--foreground-dim)] mb-1 block">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full text-[12px]"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="text-[11px] text-[var(--foreground-dim)] mb-2 block">
              Events to subscribe to *
            </label>
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g}>
                  <p className="text-[10px] uppercase text-[var(--foreground-dim)] tracking-wider mb-1">
                    {g}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_EVENTS.filter((e) => e.group === g).map((e) => {
                      const checked = events.includes(e.id);
                      return (
                        <label
                          key={e.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer text-[11px] transition-colors ${
                            checked
                              ? "bg-[var(--primary)]/10 border-[var(--primary)]/40 text-[var(--foreground)]"
                              : "border-[var(--border)] text-[var(--foreground-muted)] hover:border-[var(--border-hover)]"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="w-3 h-3"
                            checked={checked}
                            onChange={() => toggle(e.id)}
                          />
                          {e.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {error && (
            <div className="text-[11px] text-[var(--danger)] bg-red-500/10 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </form>
        <div className="p-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-[12px]"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="btn-primary text-[12px]"
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create Webhook"}
          </button>
        </div>
      </div>
    </div>
  );
}

function WebhookDetailModal({
  webhook,
  onClose,
  onUpdated,
}: {
  webhook: Webhook;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(webhook.isActive);

  useEffect(() => {
    fetch(`/api/webhooks/${webhook.id}/deliveries?limit=20`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDeliveries(d))
      .catch(() => {});
  }, [webhook.id]);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult(
        data.success
          ? `✓ ${data.responseStatus} (${data.durationMs}ms)`
          : `✗ ${data.errorMessage || data.responseStatus} (${data.durationMs}ms)`
      );
      // Refresh deliveries
      const dRes = await fetch(`/api/webhooks/${webhook.id}/deliveries?limit=20`);
      if (dRes.ok) setDeliveries(await dRes.json());
    } catch (err) {
      setTestResult(`✗ ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setTesting(false);
    }
  };

  const toggleActive = async () => {
    const next = !active;
    setActive(next);
    try {
      await fetch(`/api/webhooks/${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
    } catch {
      setActive(!next);
    }
  };

  const copySecret = () => {
    if (!webhook.secret) return;
    navigator.clipboard.writeText(webhook.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete webhook "${webhook.name}"? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}`, { method: "DELETE" });
      if (res.ok) onUpdated();
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 modal-mobile-drawer">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  active ? "bg-green-500" : "bg-[var(--foreground-dim)]"
                }`}
              />
              <h3 className="text-[16px] font-semibold text-[var(--foreground)]">
                {webhook.name}
              </h3>
            </div>
            <p className="text-[11px] text-[var(--foreground-dim)] font-mono">
              {webhook.url}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[var(--border)] flex flex-wrap items-center gap-2 bg-[var(--background)]">
          <button
            onClick={runTest}
            disabled={testing}
            className="btn-primary text-[11px] gap-1.5"
          >
            <PlayCircle className="w-3 h-3" />
            {testing ? "Testing…" : "Send Test"}
          </button>
          <button
            onClick={toggleActive}
            className="btn-secondary text-[11px] gap-1.5"
          >
            <Power className="w-3 h-3" />
            {active ? "Disable" : "Enable"}
          </button>
          {testResult && (
            <span className="text-[11px] text-[var(--foreground-muted)]">
              {testResult}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <p className="text-[10px] text-[var(--foreground-dim)] uppercase tracking-wider mb-2">
              Subscribed Events ({webhook.events.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {webhook.events.map((ev) => (
                <span
                  key={ev}
                  className="text-[10px] px-2 py-0.5 rounded font-mono bg-[var(--background)] border border-[var(--border)] text-[var(--foreground-muted)]"
                >
                  {ev}
                </span>
              ))}
            </div>
          </div>

          {webhook.secret && (
            <div>
              <p className="text-[10px] text-[var(--foreground-dim)] uppercase tracking-wider mb-2">
                Signing Secret
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] font-mono px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground-muted)] truncate">
                  {webhook.secret}
                </code>
                <button
                  onClick={copySecret}
                  className="btn-secondary text-[11px] gap-1"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] text-[var(--foreground-dim)] mt-1">
                Use this with HMAC-SHA256 to verify the{" "}
                <code>X-Webhook-Signature</code> header on incoming requests.
              </p>
            </div>
          )}

          <div>
            <p className="text-[10px] text-[var(--foreground-dim)] uppercase tracking-wider mb-2">
              Recent Deliveries
            </p>
            {deliveries.length === 0 ? (
              <p className="text-[11px] text-[var(--foreground-dim)] italic">
                No deliveries yet
              </p>
            ) : (
              <div className="space-y-1.5">
                {deliveries.map((d) => {
                  const ok = d.status === "SUCCESS";
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 text-[11px] p-2 rounded-lg bg-[var(--background)] border border-[var(--border)]"
                    >
                      {ok ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                      )}
                      <span className="font-mono text-[10px] text-[var(--foreground-muted)] truncate flex-1">
                        {d.event}
                      </span>
                      {d.responseStatus && (
                        <span
                          className="text-[10px] tabular-nums"
                          style={{ color: ok ? "#10B981" : "#EF4444" }}
                        >
                          {d.responseStatus}
                        </span>
                      )}
                      {d.durationMs !== null && (
                        <span className="text-[10px] text-[var(--foreground-dim)] tabular-nums">
                          {d.durationMs}ms
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--foreground-dim)]">
                        {new Date(d.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] flex justify-between items-center">
          <button
            onClick={handleDelete}
            className="text-[12px] text-[var(--danger)] hover:underline gap-1 flex items-center"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          <div className="text-[10px] text-[var(--foreground-dim)] flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" /> {webhook.totalDeliveries.toLocaleString()} total
            </span>
            <span>· {webhook.successCount} ok</span>
            <span>· {webhook.failureCount} failed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
