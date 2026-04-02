import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatPercent(num: number): string {
  return `${num.toFixed(1)}%`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getHealthColor(score: number): string {
  if (score >= 80) return "text-emerald";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-emerald/20 text-emerald border-emerald/30",
    at_risk: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    churning: "bg-red-500/20 text-red-500 border-red-500/30",
    new: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    completed: "bg-emerald/20 text-emerald border-emerald/30",
    in_progress: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    pending: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    overdue: "bg-red-500/20 text-red-500 border-red-500/30",
  };
  return colors[status.toLowerCase()] || colors.pending;
}
