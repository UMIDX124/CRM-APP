"use client";

import dynamic from "next/dynamic";

// Code-split the heavy kanban + drag-and-drop bundle. ssr:false because
// the module is fully interactive (no SEO benefit) and skipping SSR
// keeps it out of the initial JS payload.
const DealsModule = dynamic(() => import("@/components/DealsModule"), {
  ssr: false,
  loading: () => <div className="p-6 animate-pulse h-screen bg-[var(--surface)]/30" />,
});

export default function DealsPage() {
  return <DealsModule />;
}
