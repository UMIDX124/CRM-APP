"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  lineItems: LineItem[];
}

const STATUS_STYLES: Record<
  string,
  { color: string; bg: string }
> = {
  PAID: {
    color: "var(--emerald)",
    bg: "rgba(16, 185, 129, 0.12)",
  },
  PENDING: {
    color: "var(--primary)",
    bg: "rgba(245, 158, 11, 0.12)",
  },
  OVERDUE: {
    color: "var(--danger)",
    bg: "rgba(239, 68, 68, 0.12)",
  },
  DRAFT: {
    color: "var(--foreground-dim)",
    bg: "rgba(99, 99, 110, 0.12)",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} style={{ padding: "12px 16px" }}>
              <div
                style={{
                  width: `${50 + ((j * 17 + i * 11) % 40)}%`,
                  height: 12,
                  borderRadius: 4,
                  background: "var(--surface-hover)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function PortalInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/invoices", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to load invoices (${res.status})`);
      }
      const json = await res.json();
      setInvoices(json.invoices || json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <AlertCircle
          size={40}
          style={{ color: "var(--danger)", marginBottom: 16 }}
        />
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            margin: "0 0 8px 0",
            color: "var(--foreground)",
          }}
        >
          Failed to load invoices
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--foreground-muted)",
            margin: "0 0 20px 0",
          }}
        >
          {error}
        </p>
        <button
          onClick={fetchInvoices}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 20px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--foreground)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: "10px 16px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--foreground-dim)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid var(--border)",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: 13,
    borderBottom: "1px solid var(--border-subtle)",
    whiteSpace: "nowrap",
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            Invoices
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--foreground-muted)",
              marginTop: 4,
            }}
          >
            View and track all your invoices.
          </p>
        </div>
        <button
          onClick={fetchInvoices}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--foreground-muted)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <RefreshCw
            size={14}
            style={loading ? { animation: "spin 0.8s linear infinite" } : {}}
          />
          Refresh
        </button>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 28, padding: "10px 8px 10px 16px" }} />
                <th style={thStyle}>Invoice #</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Due Date</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows count={6} />
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 48,
                      textAlign: "center",
                      color: "var(--foreground-dim)",
                      fontSize: 14,
                    }}
                  >
                    <FileText
                      size={32}
                      style={{
                        marginBottom: 12,
                        opacity: 0.4,
                        display: "inline-block",
                      }}
                    />
                    <br />
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isExpanded = expandedId === inv.id;
                  const statusStyle = STATUS_STYLES[inv.status] || STATUS_STYLES.DRAFT;
                  return (
                    <tr key={inv.id} style={{ cursor: "default" }}>
                      <td colSpan={6} style={{ padding: 0 }}>
                        {/* Main row */}
                        <div
                          onClick={() =>
                            setExpandedId(isExpanded ? null : inv.id)
                          }
                          style={{
                            display: "grid",
                            gridTemplateColumns: "28px 1fr 1fr 1fr 1fr 100px",
                            alignItems: "center",
                            padding: "0",
                            cursor: "pointer",
                            borderBottom: isExpanded
                              ? "none"
                              : "1px solid var(--border-subtle)",
                            transition: "background 0.1s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background =
                              "var(--surface-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ padding: "12px 8px 12px 16px", color: "var(--foreground-dim)" }}>
                            {isExpanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                          </div>
                          <div style={tdStyle}>
                            <span style={{ fontWeight: 500 }}>
                              #{inv.invoiceNumber}
                            </span>
                          </div>
                          <div style={tdStyle}>
                            {formatDate(inv.createdAt)}
                          </div>
                          <div style={tdStyle}>
                            {formatDate(inv.dueDate)}
                          </div>
                          <div
                            style={{
                              ...tdStyle,
                              textAlign: "right",
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {formatCurrency(inv.amount)}
                          </div>
                          <div style={tdStyle}>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: "3px 8px",
                                borderRadius: 999,
                                background: statusStyle.bg,
                                color: statusStyle.color,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {inv.status}
                            </span>
                          </div>
                        </div>

                        {/* Expanded line items */}
                        {isExpanded && (
                          <div
                            style={{
                              background: "var(--background)",
                              borderTop: "1px solid var(--border)",
                              borderBottom: "1px solid var(--border-subtle)",
                              padding: "12px 20px 16px 52px",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--foreground-dim)",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                marginBottom: 8,
                              }}
                            >
                              Line Items
                            </div>
                            {!inv.lineItems || inv.lineItems.length === 0 ? (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "var(--foreground-dim)",
                                  padding: "8px 0",
                                }}
                              >
                                No line items
                              </div>
                            ) : (
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                }}
                              >
                                <thead>
                                  <tr>
                                    <th
                                      style={{
                                        ...thStyle,
                                        padding: "6px 12px 6px 0",
                                        fontSize: 11,
                                      }}
                                    >
                                      Description
                                    </th>
                                    <th
                                      style={{
                                        ...thStyle,
                                        padding: "6px 12px",
                                        fontSize: 11,
                                        textAlign: "right",
                                      }}
                                    >
                                      Qty
                                    </th>
                                    <th
                                      style={{
                                        ...thStyle,
                                        padding: "6px 12px",
                                        fontSize: 11,
                                        textAlign: "right",
                                      }}
                                    >
                                      Unit Price
                                    </th>
                                    <th
                                      style={{
                                        ...thStyle,
                                        padding: "6px 0 6px 12px",
                                        fontSize: 11,
                                        textAlign: "right",
                                      }}
                                    >
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.lineItems.map((item) => (
                                    <tr key={item.id}>
                                      <td
                                        style={{
                                          padding: "6px 12px 6px 0",
                                          fontSize: 13,
                                          color: "var(--foreground-muted)",
                                          borderBottom:
                                            "1px solid var(--border-subtle)",
                                        }}
                                      >
                                        {item.description}
                                      </td>
                                      <td
                                        style={{
                                          padding: "6px 12px",
                                          fontSize: 13,
                                          textAlign: "right",
                                          fontVariantNumeric: "tabular-nums",
                                          borderBottom:
                                            "1px solid var(--border-subtle)",
                                        }}
                                      >
                                        {item.quantity}
                                      </td>
                                      <td
                                        style={{
                                          padding: "6px 12px",
                                          fontSize: 13,
                                          textAlign: "right",
                                          fontVariantNumeric: "tabular-nums",
                                          borderBottom:
                                            "1px solid var(--border-subtle)",
                                        }}
                                      >
                                        {formatCurrency(item.unitPrice)}
                                      </td>
                                      <td
                                        style={{
                                          padding: "6px 0 6px 12px",
                                          fontSize: 13,
                                          textAlign: "right",
                                          fontWeight: 600,
                                          fontVariantNumeric: "tabular-nums",
                                          borderBottom:
                                            "1px solid var(--border-subtle)",
                                        }}
                                      >
                                        {formatCurrency(item.total)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
