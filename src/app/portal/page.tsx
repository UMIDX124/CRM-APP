import { redirect } from "next/navigation";

// /portal → redirect to /portal/dashboard (or /portal/login if not authenticated)
// The layout handles auth — this just ensures /portal doesn't 404.
export default function PortalRootPage() {
  redirect("/portal/dashboard");
}
