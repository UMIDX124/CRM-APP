import { redirect } from "next/navigation";

// /lead-funnel → canonical path is /funnel
export default function LeadFunnelRedirect() {
  redirect("/funnel");
}
