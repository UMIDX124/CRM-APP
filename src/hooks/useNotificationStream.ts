"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Subscribe to live notifications via SSE.
 *
 * Wraps an EventSource pointed at /api/events. Auto-reconnects on close
 * (the server side terminates connections after 4 minutes by design),
 * with exponential backoff capped at 30s for true network failures.
 *
 * Falls back to a polling refresh every 30s if EventSource is unavailable
 * (e.g. ancient browsers, locked-down corporate proxies). The fallback
 * just calls onMessage(null) so the consumer can re-fetch its list.
 */
type StreamNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
};

interface UseNotificationStreamOptions {
  onMessage: (n: StreamNotification | null) => void;
  enabled?: boolean;
}

export function useNotificationStream({
  onMessage,
  enabled = true,
}: UseNotificationStreamOptions) {
  const onMessageRef = useRef(onMessage);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef(1000);
  const connectRef = useRef<() => void>(() => {});

  // Always call the latest callback without resubscribing
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Stable connect function — handlers reach back via connectRef so the
  // recursive reconnect call works without violating no-use-before-define.
  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (typeof EventSource === "undefined") {
      // Polling fallback
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = setInterval(
        () => onMessageRef.current(null),
        30000
      );
      return;
    }

    // Tear down any previous connection
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }

    const es = new EventSource("/api/events");
    sourceRef.current = es;

    es.addEventListener("notification", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as StreamNotification;
        onMessageRef.current(data);
      } catch {
        // ignore malformed
      }
    });

    es.addEventListener("connected", () => {
      backoffRef.current = 1000;
    });

    es.addEventListener("reconnect", () => {
      // Server gracefully asked us to reconnect — close and re-open immediately
      es.close();
      sourceRef.current = null;
      connectRef.current();
    });

    es.onerror = () => {
      es.close();
      sourceRef.current = null;
      // Exponential backoff with 30s cap
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, 30000);
      reconnectTimerRef.current = setTimeout(
        () => connectRef.current(),
        delay
      );
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      if (sourceRef.current) sourceRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      sourceRef.current = null;
      reconnectTimerRef.current = null;
      fallbackTimerRef.current = null;
    };
  }, [enabled, connect]);
}
