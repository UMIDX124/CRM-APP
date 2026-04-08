"use client";

import dynamic from "next/dynamic";

const ReportsModule = dynamic(() => import("@/components/ReportsModule"), {
  ssr: false,
  loading: () => <div className="p-6 animate-pulse h-screen bg-[var(--surface)]/30" />,
});

export default function ReportsPage() {
  return <ReportsModule />;
}
