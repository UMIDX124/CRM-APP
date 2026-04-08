"use client";

import dynamic from "next/dynamic";

const TicketsModule = dynamic(() => import("@/components/TicketsModule"), {
  ssr: false,
  loading: () => <div className="p-6 animate-pulse h-screen bg-[var(--surface)]/30" />,
});

export default function TicketsPage() {
  return <TicketsModule />;
}
