"use client";

import { useEffect, useState, useCallback } from "react";
import { Globe, Plus, Copy, Trash2, Check, Code, ExternalLink } from "lucide-react";

interface Site {
  id: string;
  name: string;
  domain: string;
  apiKey: string;
  createdAt: string;
  _count: { pageViews: number; webLeads: number };
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSnippet, setShowSnippet] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/sites");
      if (res.ok) setSites(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });
      if (res.ok) {
        setName("");
        setDomain("");
        setShowAdd(false);
        fetchSites();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this site and all its data?")) return;
    await fetch(`/api/sites/${id}`, { method: "DELETE" });
    fetchSites();
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function getSnippet(apiKey: string) {
    return `<script src="https://alpha-command-center.vercel.app/tracker.js" data-key="${apiKey}" defer></script>`;
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-[var(--surface)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Tracked Sites</h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">
            Manage websites connected to Alpha Command Center
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[#0A0A0F] font-semibold text-sm hover:bg-[var(--primary-light)] transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Site
        </button>
      </div>

      {/* Add Site Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
            className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Add New Site</h2>
            <div>
              <label className="text-sm text-[var(--foreground-muted)] mb-1 block">Site Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digital Point LLC"
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-[var(--foreground-muted)] mb-1 block">Domain</label>
              <input
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="digitalpointllc.com"
                required
                className="w-full px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--foreground-dim)] focus:border-[var(--primary)] focus:outline-none"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                Cancel
              </button>
              <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[#0A0A0F] font-semibold text-sm disabled:opacity-50">
                {creating ? "Creating..." : "Create Site"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Snippet Modal */}
      {showSnippet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSnippet(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-2xl space-y-4 shadow-xl">
            <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
              <Code className="w-5 h-5 text-[var(--primary)]" /> Tracking Snippet
            </h2>
            <p className="text-sm text-[var(--foreground-muted)]">
              Add this script tag to your website&apos;s &lt;head&gt; or before &lt;/body&gt;:
            </p>
            <pre className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-4 text-sm text-[var(--foreground)] overflow-x-auto font-mono">
              {getSnippet(showSnippet)}
            </pre>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => copyText(getSnippet(showSnippet), "snippet")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[#0A0A0F] font-semibold text-sm"
              >
                {copied === "snippet" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied === "snippet" ? "Copied!" : "Copy Snippet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Site Cards */}
      {sites.length === 0 ? (
        <div className="text-center py-16 text-[var(--foreground-muted)]">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No sites tracked yet. Add your first site to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <div key={site.id} className="card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">{site.name}</h3>
                  <a
                    href={`https://${site.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    {site.domain} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <button onClick={() => handleDelete(site.id)} className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-dim)] hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-[var(--foreground)] tabular-nums">{site._count.pageViews.toLocaleString()}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">Page Views</p>
                </div>
                <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-[var(--primary)] tabular-nums">{site._count.webLeads.toLocaleString()}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">Leads</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => copyText(site.apiKey, site.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-hover)] transition-colors"
                >
                  {copied === site.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === site.id ? "Copied" : "API Key"}
                </button>
                <button
                  onClick={() => setShowSnippet(site.apiKey)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--primary-subtle)] border border-[var(--border-primary)] text-sm text-[var(--primary)] hover:bg-[var(--primary-dim)] transition-colors"
                >
                  <Code className="w-3.5 h-3.5" /> Snippet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
