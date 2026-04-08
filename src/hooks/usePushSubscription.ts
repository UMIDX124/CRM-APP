"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * Manages the browser PushSubscription lifecycle:
 *  1. Wait for the service worker registration
 *  2. Fetch the VAPID public key from /api/push/public-key
 *  3. Check existing subscription; surface permission state
 *  4. Expose `subscribe()` / `unsubscribe()` callbacks
 *
 * The subscription object is sent to /api/push/subscribe so the server can
 * send pushes to this device.
 *
 * Designed to be silent on browsers that don't support push (Safari < 16.4,
 * private mode, etc.) — `supported` will be false and the UI can hide the
 * relevant button.
 */
type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function usePushSubscription() {
  const [permission, setPermission] = useState<PushPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);

  // Detect support + initial state
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setSupported(false);
      setPermission("unsupported");
      return;
    }
    setSupported(true);
    setPermission(Notification.permission as PushPermission);

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        setSubscribed(!!existing);
      } catch {
        // ignore
      }
    })();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    try {
      // Ask permission first if needed
      if (Notification.permission === "default") {
        const res = await Notification.requestPermission();
        setPermission(res as PushPermission);
        if (res !== "granted") return false;
      } else if (Notification.permission !== "granted") {
        setPermission("denied");
        return false;
      }

      // Fetch VAPID public key
      const keyRes = await fetch("/api/push/public-key");
      if (!keyRes.ok) return false;
      const { publicKey } = (await keyRes.json()) as { publicKey: string };
      if (!publicKey) return false;

      // Subscribe
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      // applicationServerKey wants ArrayBuffer-backed Uint8Array; we copy
      // into a fresh ArrayBuffer to satisfy strict TypeScript (avoids
      // SharedArrayBuffer-typed underlying buffer).
      const keyBytes = urlBase64ToUint8Array(publicKey);
      const keyBuffer = new ArrayBuffer(keyBytes.byteLength);
      new Uint8Array(keyBuffer).set(keyBytes);
      const subscription =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBuffer,
        }));

      // POST to server
      const subRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!subRes.ok) return false;

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error("[push] subscribe failed:", err);
      return false;
    }
  }, [supported]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!supported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        }).catch(() => {});
        await existing.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error("[push] unsubscribe failed:", err);
    }
  }, [supported]);

  return { supported, permission, subscribed, subscribe, unsubscribe };
}

// Helper: VAPID keys are base64url; PushManager wants a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}
