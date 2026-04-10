"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ListTodo,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string | null;
  dueDate: string | null;
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  TODO: {
    color: "var(--foreground-dim)",
    bg: "rgba(99, 99, 110, 0.12)",
    label: "To Do",
  },
  IN_PROGRESS: {
    color: "var(--blue)",
    bg: "rgba(59, 130, 246, 0.12)",
    label: "In Progress",
  },
  REVIEW: {
    color: "var(--primary)",
    bg: "rgba(245, 158, 11, 0.12)",
    label: "Review",
  },
  COMPLETED: {
    color: "var(--emerald)",
    bg: "rgba(16, 185, 129, 0.12)",
    label: "Completed",
  },
  BLOCKED: {
    color: "var(--danger)",
    bg: "rgba(239, 68, 68, 0.12)",
    label: "Blocked",
  },
};

const PRIORITY_STYLES: Record<string, { color: string; bg: string }> = {
  LOW: {
    color: "var(--foreground-dim)",
    bg: "rgba(99, 99, 110, 0.12)",
  },
  MEDIUM: {
    color: "var(--blue)",
    bg: "rgba(59, 130, 246, 0.12)",
  },
  HIGH: {
    color: "var(--primary)",
    bg: "rgba(245, 158, 11, 0.12)",
  },
  URGENT: {
    color: "var(--danger)",
    bg: "rgba(239, 68, 68, 0.12)",
  },
};

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
                  width: `${45 + ((j * 13 + i * 7) % 50)}%`,
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

export default function PortalTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/tasks", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to load tasks (${res.status})`);
      }
      const json = await res.json();
      setTasks(json.tasks || json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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
          Failed to load tasks
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
          onClick={fetchTasks}
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
            Tasks
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "var(--foreground-muted)",
              marginTop: 4,
            }}
          >
            Track your project tasks and their progress.
          </p>
        </div>
        <button
          onClick={fetchTasks}
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
                <th style={thStyle}>Task</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Priority</th>
                <th style={thStyle}>Assignee</th>
                <th style={thStyle}>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows count={8} />
              ) : tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 48,
                      textAlign: "center",
                      color: "var(--foreground-dim)",
                      fontSize: 14,
                    }}
                  >
                    <ListTodo
                      size={32}
                      style={{
                        marginBottom: 12,
                        opacity: 0.4,
                        display: "inline-block",
                      }}
                    />
                    <br />
                    No tasks found
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const statusStyle =
                    STATUS_STYLES[task.status] || STATUS_STYLES.TODO;
                  const priorityStyle =
                    PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.MEDIUM;

                  return (
                    <tr
                      key={task.id}
                      style={{ transition: "background 0.1s ease" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--surface-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 500,
                          maxWidth: 320,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {task.title}
                      </td>
                      <td style={tdStyle}>
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
                            whiteSpace: "nowrap",
                          }}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 999,
                            background: priorityStyle.bg,
                            color: priorityStyle.color,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: task.assignee
                            ? "var(--foreground-muted)"
                            : "var(--foreground-dim)",
                        }}
                      >
                        {task.assignee || "Unassigned"}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          color: task.dueDate
                            ? "var(--foreground-muted)"
                            : "var(--foreground-dim)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {task.dueDate ? formatDate(task.dueDate) : "No date"}
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
