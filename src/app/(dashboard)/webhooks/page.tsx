"use client";

import dynamic from "next/dynamic";

const WebhooksModule = dynamic(() => import("@/components/WebhooksModule"), {
  ssr: false,
  loading: () => <div className="p-6 animate-pulse h-screen bg-[var(--surface)]/30" />,
});

export default function WebhooksPage() {
  return <WebhooksModule />;
}
