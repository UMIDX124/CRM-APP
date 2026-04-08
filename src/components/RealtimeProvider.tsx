"use client";

import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import {
  useEventStream,
  type StreamMessage,
  type StreamPresence,
  type StreamTyping,
  type ConnectionState,
} from "@/hooks/useEventStream";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { usePushSubscription } from "@/hooks/usePushSubscription";

/**
 * Single mount point for everything realtime.
 *
 *  - Opens the SSE stream once for the whole dashboard
 *  - Pumps a presence heartbeat every 30s while visible
 *  - Caches presence-by-user-id and exposes it via context
 *  - Buffers the last few message events so consumers (chat, tab counter)
 *    can subscribe without each opening their own EventSource
 *
 * Children read connection state + presence + recent messages via the
 * `useRealtime()` hook. The hook is intentionally tiny — heavyweight
 * consumers should subscribe via `subscribeMessage` to avoid re-renders.
 */
type Subscriber<T> = (value: T) => void;

interface RealtimeContextValue {
  state: ConnectionState;
  presence: Map<string, "online" | "away" | "offline">;
  subscribeMessage: (cb: Subscriber<StreamMessage>) => () => void;
  subscribePresence: (cb: Subscriber<StreamPresence>) => () => void;
  subscribeTyping: (cb: Subscriber<StreamTyping>) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  // Plain Map kept in state via ref-like updater (we recreate the Map on
  // every change so React notices, but only when a peer's status flips).
  const [presence, setPresence] = useState<
    Map<string, "online" | "away" | "offline">
  >(() => new Map());

  // Subscriber sets — module-scope to avoid re-creating on every render
  const messageSubsRef = useMemo(() => new Set<Subscriber<StreamMessage>>(), []);
  const presenceSubsRef = useMemo(() => new Set<Subscriber<StreamPresence>>(), []);
  const typingSubsRef = useMemo(() => new Set<Subscriber<StreamTyping>>(), []);

  const handleMessage = useCallback(
    (m: StreamMessage) => {
      messageSubsRef.forEach((cb) => {
        try {
          cb(m);
        } catch (err) {
          console.error("[realtime] message subscriber threw:", err);
        }
      });
    },
    [messageSubsRef]
  );

  const handlePresence = useCallback(
    (p: StreamPresence) => {
      setPresence((prev) => {
        if (prev.get(p.userId) === p.status) return prev; // no change
        const next = new Map(prev);
        next.set(p.userId, p.status);
        return next;
      });
      presenceSubsRef.forEach((cb) => {
        try {
          cb(p);
        } catch (err) {
          console.error("[realtime] presence subscriber threw:", err);
        }
      });
    },
    [presenceSubsRef]
  );

  const handleTyping = useCallback(
    (t: StreamTyping) => {
      typingSubsRef.forEach((cb) => {
        try {
          cb(t);
        } catch (err) {
          console.error("[realtime] typing subscriber threw:", err);
        }
      });
    },
    [typingSubsRef]
  );

  const { state } = useEventStream({
    onMessage: handleMessage,
    onPresence: handlePresence,
    onTyping: handleTyping,
  });

  usePresenceHeartbeat();

  // Re-register push subscription if browser already granted permission.
  // (We don't request permission here — that's user-initiated via the
  // notification settings page or the install prompt to avoid spammy popups.)
  const push = usePushSubscription();
  useEffect(() => {
    if (push.supported && push.permission === "granted" && !push.subscribed) {
      void push.subscribe();
    }
  }, [push]);

  const subscribeMessage = useCallback(
    (cb: Subscriber<StreamMessage>) => {
      messageSubsRef.add(cb);
      return () => {
        messageSubsRef.delete(cb);
      };
    },
    [messageSubsRef]
  );

  const subscribePresence = useCallback(
    (cb: Subscriber<StreamPresence>) => {
      presenceSubsRef.add(cb);
      return () => {
        presenceSubsRef.delete(cb);
      };
    },
    [presenceSubsRef]
  );

  const subscribeTyping = useCallback(
    (cb: Subscriber<StreamTyping>) => {
      typingSubsRef.add(cb);
      return () => {
        typingSubsRef.delete(cb);
      };
    },
    [typingSubsRef]
  );

  // Cleanup on unmount: drop all subscribers so detached components don't leak
  useEffect(() => {
    return () => {
      messageSubsRef.clear();
      presenceSubsRef.clear();
      typingSubsRef.clear();
    };
  }, [messageSubsRef, presenceSubsRef, typingSubsRef]);

  const value = useMemo<RealtimeContextValue>(
    () => ({ state, presence, subscribeMessage, subscribePresence, subscribeTyping }),
    [state, presence, subscribeMessage, subscribePresence, subscribeTyping]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    // Safe default for components rendered outside the provider (e.g. login)
    return {
      state: "closed" as ConnectionState,
      presence: new Map<string, "online" | "away" | "offline">(),
      subscribeMessage: () => () => {},
      subscribePresence: () => () => {},
      subscribeTyping: () => () => {},
    };
  }
  return ctx;
}

/**
 * Tiny connection-state dot — green when open, amber while reconnecting,
 * red on closed/error. Drop into a header.
 */
export function ConnectionIndicator() {
  const { state } = useRealtime();
  const color =
    state === "open"
      ? "#10B981"
      : state === "reconnecting" || state === "connecting"
        ? "#F59E0B"
        : "#EF4444";
  const label =
    state === "open"
      ? "Live"
      : state === "reconnecting"
        ? "Reconnecting"
        : state === "connecting"
          ? "Connecting"
          : "Offline";
  return (
    <div
      className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--foreground-dim)]"
      title={`SSE: ${state}`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: state === "open" ? `0 0 6px ${color}` : "none",
        }}
      />
      <span>{label}</span>
    </div>
  );
}
