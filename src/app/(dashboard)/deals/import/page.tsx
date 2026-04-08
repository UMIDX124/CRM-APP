"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

/**
 * /deals/import — CSV import for deals.
 *
 * 1. User picks a CSV file
 * 2. We parse it client-side (tiny, no dep) into rows
 * 3. Preview first N rows + detected columns
 * 4. POST to /api/deals/import, render per-row result
 *
 * Expected columns (header names are case-insensitive, extras ignored):
 *   title, description, value, currency, stage, probability,
 *   expectedClose, source, clientName, tags
 */

const EXPECTED_COLUMNS = [
  "title",
  "description",
  "value",
  "currency",
  "stage",
  "probability",
  "expectedClose",
  "source",
  "clientName",
  "tags",
];

type ParsedRow = Record<string, string>;
type ImportResult = {
  imported: number;
  failed: number;
  failures: { row: number; reason: string }[];
};

function parseCsv(text: string): { headers: string[]; rows: ParsedRow[] } {
  // Minimal CSV parser: handles quoted fields and escaped quotes. Not a
  // full RFC 4180 implementation but sufficient for well-formed exports.
  const lines: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || ch === "\r") {
        if (field.length > 0 || row.length > 0) {
          row.push(field);
          lines.push(row);
          row = [];
          field = "";
        }
        if (ch === "\r" && text[i + 1] === "\n") i++;
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    lines.push(row);
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].map((h) => h.trim());
  const rows = lines.slice(1).map((cols) => {
    const obj: ParsedRow = {};
    headers.forEach((h, idx) => {
      obj[h] = (cols[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows };
}

export default function DealsImportPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function reset() {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const text = await file.text();
      const { headers: hs, rows: rs } = parseCsv(text);
      if (hs.length === 0 || rs.length === 0) {
        setError("File is empty or unreadable.");
        return;
      }
      if (!hs.some((h) => h.toLowerCase() === "title")) {
        setError("CSV must include a 'title' column.");
        return;
      }
      setFileName(file.name);
      setHeaders(hs);
      setRows(rs);
    } catch {
      setError("Failed to read file.");
    }
  }

  async function runImport() {
    if (rows.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      // Normalize column names to expected camelCase before sending
      const lowerMap: Record<string, string> = {};
      headers.forEach((h) => {
        const lower = h.toLowerCase();
        const match = EXPECTED_COLUMNS.find((c) => c.toLowerCase() === lower);
        if (match) lowerMap[h] = match;
      });
      const payload = rows.map((r) => {
        const out: Record<string, string> = {};
        for (const [k, v] of Object.entries(r)) {
          if (lowerMap[k]) out[lowerMap[k]] = v;
        }
        return out;
      });

      const res = await fetch("/api/deals/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setResult(data as ImportResult);
      }
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const previewRows = rows.slice(0, 10);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link
        href="/deals"
        className="inline-flex items-center gap-1.5 text-[12px] text-[var(--foreground-dim)] hover:text-[var(--foreground)] mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Deals
      </Link>

      <h1 className="text-[22px] font-semibold text-[var(--foreground)] mb-1">
        Import Deals
      </h1>
      <p className="text-[13px] text-[var(--foreground-dim)] mb-6">
        Upload a CSV with columns:{" "}
        <code className="text-[11px] bg-[var(--surface)] px-1.5 py-0.5 rounded">
          {EXPECTED_COLUMNS.join(", ")}
        </code>
        . Only <code>title</code> is required. Max 500 rows per import.
      </p>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onFile}
          className="hidden"
          id="csv-file"
        />

        {!fileName ? (
          <label
            htmlFor="csv-file"
            className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-[var(--primary)]/50 hover:bg-[var(--surface-hover)] transition-colors"
          >
            <Upload className="w-8 h-8 text-[var(--foreground-dim)] mb-3" />
            <p className="text-[13px] font-medium text-[var(--foreground)] mb-1">
              Click to select a CSV file
            </p>
            <p className="text-[11px] text-[var(--foreground-dim)]">
              or drag and drop
            </p>
          </label>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-[var(--foreground)]">{fileName}</p>
                <p className="text-[11px] text-[var(--foreground-dim)]">
                  {rows.length} rows · {headers.length} columns
                </p>
              </div>
              <button
                onClick={reset}
                className="text-[12px] text-[var(--foreground-dim)] hover:text-[var(--foreground)]"
              >
                Choose different file
              </button>
            </div>

            {previewRows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-[11px]">
                  <thead className="bg-[var(--surface-hover)]">
                    <tr>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left font-medium text-[var(--foreground-muted)] whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-t border-[var(--border-subtle,var(--border))]">
                        {headers.map((h) => (
                          <td
                            key={h}
                            className="px-3 py-2 text-[var(--foreground-dim)] whitespace-nowrap max-w-[200px] overflow-hidden text-ellipsis"
                          >
                            {r[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > previewRows.length && (
                  <p className="text-[11px] text-[var(--foreground-dim)] px-3 py-2 border-t border-[var(--border-subtle,var(--border))]">
                    Showing first {previewRows.length} of {rows.length} rows
                  </p>
                )}
              </div>
            )}

            <button
              onClick={runImport}
              disabled={busy || !!result}
              className="w-full py-3 rounded-xl bg-[var(--primary)] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Importing..." : `Import ${rows.length} deals`}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-[12px] text-emerald-400">
                Imported {result.imported} deals
                {result.failed > 0 && `, ${result.failed} failed`}
              </p>
            </div>

            {result.failures.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="px-3 py-2 bg-[var(--surface-hover)] text-[11px] font-medium text-[var(--foreground-muted)]">
                  Failed rows
                </div>
                <div className="max-h-48 overflow-auto">
                  {result.failures.map((f) => (
                    <div
                      key={f.row}
                      className="px-3 py-2 text-[11px] border-t border-[var(--border-subtle,var(--border))] flex gap-3"
                    >
                      <span className="text-[var(--foreground-dim)] font-mono">
                        row {f.row}
                      </span>
                      <span className="text-red-400">{f.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link
              href="/deals"
              className="block w-full py-3 rounded-xl border border-[var(--border)] text-[13px] font-medium text-center hover:bg-[var(--surface-hover)]"
            >
              Done — view pipeline
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
