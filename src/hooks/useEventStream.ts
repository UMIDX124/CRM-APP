"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Subscribe to the multiplexed `/api/events` SSE stream.
 *
 * Surfaces FOUR things to consumers:
 *  - `state`: connection status (`connecting` | `open` | `reconnecting` | `closed`)
 *  - `onNotification` callback for new notification rows
 *  - `onMessage` callback for new chat messages in the user's channels
 *  - `onPresence` callback for presence deltas across peers
 *
 * Auto-reconnects with exponential backoff (1s → 30s) on network failures.
 * Server-initiated `reconnect` events trigger an immediate reopen.
 *
 * Falls back to a polling refresh every 30s if EventSource is unavailable
 * (older browsers, locked-down corporate proxies).
 */
export type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";

export interface StreamNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface StreamMessage {
  id: string;
  channelId: string;
  content: string;
  type: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
    role: string;
  };
}

export interface StreamPresence {
  userId: string;
  status: "online" | "away" | "offline";
  lastSeenAt: string | null;
}

export interface StreamTyping {
  channelId: string;
  users: Array<{ id: string; name: string }>;
}

interface UseEventStreamOptions {
  onNotification?: (n: StreamNotification | null) => void;
  onMessage?: (m: StreamMessage) => void;
  onPresence?: (p: StreamPresence) => void;
  onTyping?: (t: StreamTyping) => void;
  enabled?: boolean;
}

export function useEventStream({
  onNotification,
  onMessage,
  onPresence,
  onTyping,
  enabled = true,
}: UseEventStreamOptions) {
  const [state, setState] = useState<ConnectionState>("connecting");
  const onNotifRef = useRef(onNotification);
  const onMsgRef = useRef(onMessage);
  const onPresRef = useRef(onPresence);
  const onTypingRef = useRef(onTyping);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef(1000);
  const connectRef = useRef<() => void>(() => {});

  // Always call latest callbacks without resubscribing
  useEffect(() => {
    onNotifRef.current = onNotification;
  }, [onNotification]);
  useEffect(() => {
    onMsgRef.current = onMessage;
  }, [onMessage]);
  useEffect(() => {
    onPresRef.current = onPresence;
  }, [onPresence]);
  useEffect(() => {
    onTypingRef.current = onTyping;
  }, [onTyping]);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    if (typeof EventSource === "undefined") {
      // Polling fallback for ancient browsers
      setState("open");
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = setInterval(() => {
        onNotifRef.current?.(null);
      }, 30000);
      return;
    }

    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }

    setState((prev) => (prev === "open" ? "reconnecting" : "connecting"));

    const es = new EventSource("/api/events");
    sourceRef.current = es;

    es.addEventListener("connected", () => {
      backoffRef.current = 1000;
      setState("open");
    });

    es.addEventListener("notification", (e: MessageEvent) => {
      try {
        onNotifRef.current?.(JSON.parse(e.data) as StreamNotification);
      } catch {
        /* ignore malformed */
      }
    });

    es.addEventListener("message", (e: MessageEvent) => {
      try {
        onMsgRef.current?.(JSON.parse(e.data) as StreamMessage);
      } catch {
        /* ignore malformed */
      }
    });

    es.addEventListener("presence", (e: MessageEvent) => {
      try {
        onPresRef.current?.(JSON.parse(e.data) as StreamPresence);
      } catch {
        /* ignore malformed */
      }
    });

    es.addEventListener("typing", (e: MessageEvent) => {
      try {
        onTypingRef.current?.(JSON.parse(e.data) as StreamTyping);
      } catch {
        /* ignore malformed */
      }
    });

    es.addEventListener("reconnect", () => {
      // Server gracefully closing — reopen immediately
      es.close();
      sourceRef.current = null;
      setState("reconnecting");
      connectRef.current();
    });

    es.onerror = () => {
      es.close();
      sourceRef.current = null;
      setState("reconnecting");
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * 2, 30000);
      reconnectTimerRef.current = setTimeout(() => connectRef.current(), delay);
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    if (!enabled) {
      setState("closed");
      return;
    }
    connect();
    return () => {
      setState("closed");
      if (sourceRef.current) sourceRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current);
      sourceRef.current = null;
      reconnectTimerRef.current = null;
      fallbackTimerRef.current = null;
    };
  }, [enabled, connect]);

  return { state };
}
