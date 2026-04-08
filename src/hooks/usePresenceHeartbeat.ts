"use client";

import { useEffect } from "react";

/**
 * Sends `POST /api/presence/heartbeat` every 30s while the document is
 * visible. Stops while hidden (Page Visibility API) and resumes on focus
 * so we don't keep stale tabs marked as online.
 *
 * Server marks users offline when `lastSeenAt` is older than 90s, so the
 * 30s interval gives us 3 successful heartbeats inside the offline window.
 */
const HEARTBEAT_INTERVAL_MS = 30_000;

export function usePresenceHeartbeat(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let aborted = false;

    const beat = async () => {
      if (aborted) return;
      try {
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          credentials: "include",
        });
      } catch {
        // Best-effort — next tick will retry
      }
    };

    const start = () => {
      if (timer) return;
      void beat(); // immediate
      timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      aborted = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
}
