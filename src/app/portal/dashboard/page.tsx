"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DollarSign,
  CheckCircle2,
  ListTodo,
  RefreshCw,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface DashboardData {
  client: {
    companyName: string;
    contactName: string;
  };
  stats: {
    totalInvoiced: number;
    amountPaid: number;
    activeTasks: number;
  };
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    status: string;
    dueDate: string;
    createdAt: string;
  }>;
  activeTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string | null;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "var(--emerald)",
  PENDING: "var(--primary)",
  OVERDUE: "var(--danger)",
  DRAFT: "var(--foreground-dim)",
  TODO: "var(--foreground-dim)",
  IN_PROGRESS: "var(--blue)",
  REVIEW: "var(--primary)",
  COMPLETED: "var(--emerald)",
  BLOCKED: "var(--danger)",
};

function SkeletonCard() {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 80,
          height: 12,
          borderRadius: 4,
          background: "var(--surface-hover)",
          marginBottom: 12,
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div
        style={{
          width: 120,
          height: 28,
          borderRadius: 6,
          background: "var(--surface-hover)",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 44,
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 16,
          }}
        >
          <div
            style={{
              width: `${60 + (i % 3) * 20}%`,
              height: 12,
              borderRadius: 4,
              background: "var(--surface-hover)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
      ))}
    </>
  );
}

export default function PortalDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/dashboard", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to load dashboard (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          Something went wrong
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
          onClick={fetchData}
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

  const stats = data
    ? [
        {
          label: "Total Invoiced",
          value: formatCurrency(data.stats.totalInvoiced),
          icon: DollarSign,
          color: "var(--primary)",
        },
        {
          label: "Amount Paid",
          value: formatCurrency(data.stats.amountPaid),
          icon: CheckCircle2,
          color: "var(--emerald)",
        },
        {
          label: "Active Tasks",
          value: String(data.stats.activeTasks),
          icon: ListTodo,
          color: "var(--blue)",
        },
      ]
    : [];

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        {loading ? (
          <div
            style={{
              width: 240,
              height: 28,
              borderRadius: 6,
              background: "var(--surface-hover)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ) : (
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              margin: 0,
              letterSpacing: "-0.03em",
            }}
          >
            Welcome back, {data?.client.contactName || "there"}
          </h1>
        )}
        <p
          style={{
            fontSize: 14,
            color: "var(--foreground-muted)",
            marginTop: 4,
          }}
        >
          Here&apos;s an overview of your account.
        </p>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-xl)",
                    padding: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--foreground-muted)",
                      }}
                    >
                      {stat.label}
                    </span>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "var(--radius)",
                        background: `color-mix(in srgb, ${stat.color} 12%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={16} style={{ color: stat.color }} />
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {stat.value}
                  </div>
                </div>
              );
            })}
      </div>

      {/* Two column layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Recent Invoices */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                margin: 0,
              }}
            >
              Recent Invoices
            </h2>
            <a
              href="/portal/invoices"
              style={{
                fontSize: 12,
                color: "var(--primary)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              View All <ArrowRight size={12} />
            </a>
          </div>
          {loading ? (
            <SkeletonRows count={5} />
          ) : data?.recentInvoices.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--foreground-dim)",
                fontSize: 13,
              }}
            >
              No invoices yet
            </div>
          ) : (
            data?.recentInvoices.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: 13,
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>
                    #{inv.invoiceNumber}
                  </span>
                  <span
                    style={{
                      color: "var(--foreground-dim)",
                      marginLeft: 8,
                    }}
                  >
                    {formatDate(inv.createdAt)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrency(inv.amount)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: `color-mix(in srgb, ${STATUS_COLORS[inv.status] || "var(--foreground-dim)"} 14%, transparent)`,
                      color:
                        STATUS_COLORS[inv.status] || "var(--foreground-dim)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Active Tasks */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                margin: 0,
              }}
            >
              Active Tasks
            </h2>
            <a
              href="/portal/tasks"
              style={{
                fontSize: 12,
                color: "var(--primary)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              View All <ArrowRight size={12} />
            </a>
          </div>
          {loading ? (
            <SkeletonRows count={5} />
          ) : data?.activeTasks.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--foreground-dim)",
                fontSize: 13,
              }}
            >
              No active tasks
            </div>
          ) : (
            data?.activeTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        STATUS_COLORS[task.status] || "var(--foreground-dim)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.title}
                  </span>
                </div>
                {task.dueDate && (
                  <span
                    style={{
                      color: "var(--foreground-dim)",
                      fontSize: 12,
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    {formatDate(task.dueDate)}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              margin: 0,
            }}
          >
            Recent Activity
          </h2>
        </div>
        {loading ? (
          <SkeletonRows count={4} />
        ) : data?.recentActivity.length === 0 ? (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--foreground-dim)",
              fontSize: 13,
            }}
          >
            No recent activity
          </div>
        ) : (
          data?.recentActivity.map((activity) => (
            <div
              key={activity.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--foreground-muted)" }}>
                {activity.description}
              </span>
              <span
                style={{
                  color: "var(--foreground-dim)",
                  fontSize: 12,
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                {timeAgo(activity.createdAt)}
              </span>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
