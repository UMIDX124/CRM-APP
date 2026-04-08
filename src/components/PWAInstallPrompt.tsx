"use client";

import { useEffect, useState } from "react";
import { Download, X, WifiOff, Share, PlusSquare } from "lucide-react";

/**
 * Install + offline + iOS-instructions component bundled together so the
 * dashboard layout only mounts one client component for PWA UX.
 *
 * 1. Chrome/Edge/Android: catches `beforeinstallprompt`, shows a small
 *    bottom card after 30s, calls prompt() on click. Sticky dismissal in
 *    localStorage.
 *
 * 2. iOS Safari (which never fires `beforeinstallprompt`): detects iOS UA
 *    + non-standalone mode and shows a manual instructions modal with the
 *    Share → Add to Home Screen flow. Sticky dismissal under a separate key.
 *
 * 3. Live offline banner — top-of-screen amber bar whenever
 *    `navigator.onLine` flips false.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const IOS_DISMISS_KEY = "pwa-ios-dismissed";

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPhone, iPad, iPod, plus iPadOS 13+ which reports as Mac with touch
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" &&
      (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints != null &&
      ((navigator as Navigator & { maxTouchPoints: number }).maxTouchPoints) > 1)
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export default function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  // Default to ONLINE. `navigator.onLine` lies — it returns false during
  // dev-server hiccups, corporate proxies, stale WebViews, and after Chrome
  // DevTools offline simulation even when real connectivity is fine. We
  // only flip to offline after a real probe of `/api/health` fails.
  const [offline, setOffline] = useState(false);

  // Offline detection via HEAD probe against /api/health.
  // - Default: online (no banner flash on mount)
  // - On `offline` event: probe; only show banner if probe fails
  // - On `online` event: hide banner immediately + stop retry
  // - While offline: re-probe every 10s so we self-recover even if the
  //   browser's `online` event never fires
  useEffect(() => {
    if (typeof window === "undefined") return;

    let retryTimer: ReturnType<typeof setInterval> | null = null;
    let probeAbort: AbortController | null = null;
    let cancelled = false;

    async function probeReachable(): Promise<boolean> {
      probeAbort?.abort();
      const ctrl = new AbortController();
      probeAbort = ctrl;
      const timeoutId = setTimeout(() => ctrl.abort(), 3000);
      try {
        const res = await fetch("/api/health", {
          method: "HEAD",
          cache: "no-store",
          signal: ctrl.signal,
        });
        // Any response (including 405 for HEAD-not-allowed) means the
        // server is reachable and the browser has connectivity.
        return res.status > 0;
      } catch {
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    const stopRetry = () => {
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
    };

    const startRetry = () => {
      if (retryTimer) return;
      retryTimer = setInterval(async () => {
        if (cancelled) return;
        const reachable = await probeReachable();
        if (cancelled) return;
        if (reachable) {
          setOffline(false);
          stopRetry();
        }
      }, 10000);
    };

    const handleOffline = async () => {
      const reachable = await probeReachable();
      if (cancelled) return;
      if (!reachable) {
        setOffline(true);
        startRetry();
      }
    };

    const handleOnline = () => {
      probeAbort?.abort();
      setOffline(false);
      stopRetry();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      probeAbort?.abort();
      stopRetry();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // iOS detection — show after 30s if not installed and not previously dismissed
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (
      detectIOS() &&
      !isStandalone() &&
      !localStorage.getItem(IOS_DISMISS_KEY)
    ) {
      iosTimer = setTimeout(() => setShowIOS(true), 30000);
    }

    // beforeinstallprompt — Chrome/Edge/Android only
    if (!localStorage.getItem(DISMISS_KEY)) {
      const handler = (e: Event) => {
        e.preventDefault();
        setInstallEvent(e as BeforeInstallPromptEvent);
        setTimeout(() => setShowInstall(true), 30000);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        if (iosTimer) clearTimeout(iosTimer);
      };
    }

    return () => {
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const result = await installEvent.userChoice;
      if (result.outcome === "accepted") {
        setShowInstall(false);
        setInstallEvent(null);
      }
    } catch {
      // ignore
    }
  };

  const handleDismiss = () => {
    setShowInstall(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  const handleIOSDismiss = () => {
    setShowIOS(false);
    try {
      localStorage.setItem(IOS_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <>
      {offline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-black text-[11px] font-semibold py-1.5 text-center"
          style={{ paddingTop: "calc(0.375rem + env(safe-area-inset-top))" }}
        >
          <WifiOff className="w-3 h-3 inline mr-1.5 -mt-0.5" />
          You&apos;re offline — cached pages still work
        </div>
      )}

      {/* Chrome/Android install prompt */}
      {showInstall && installEvent && (
        <div
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[55] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-4"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="absolute top-2 right-2 text-[var(--foreground-dim)] hover:text-[var(--foreground)] p-1"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--foreground)]">
                Install Alpha Command Center
              </p>
              <p className="text-[11px] text-[var(--foreground-dim)] mt-0.5">
                Get faster access from your home screen — works offline.
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="btn-primary text-[11px]"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-[11px] text-[var(--foreground-dim)] hover:text-[var(--foreground)]"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari instructions modal */}
      {showIOS && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={handleIOSDismiss}
        >
          <div
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
                    Install on iPhone
                  </h3>
                  <p className="text-[11px] text-[var(--foreground-dim)] mt-0.5">
                    Add Alpha to your home screen for full-screen access.
                  </p>
                </div>
              </div>
              <button
                onClick={handleIOSDismiss}
                aria-label="Dismiss"
                className="text-[var(--foreground-dim)] hover:text-[var(--foreground)] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Step
                num={1}
                icon={<Share className="w-4 h-4 text-[var(--primary)]" />}
                title="Tap the Share button"
                description="Bottom of the Safari window — square with an upward arrow."
              />
              <Step
                num={2}
                icon={<PlusSquare className="w-4 h-4 text-[var(--primary)]" />}
                title="Choose &quot;Add to Home Screen&quot;"
                description="Scroll down in the share sheet if you don&apos;t see it."
              />
              <Step
                num={3}
                icon={<Download className="w-4 h-4 text-[var(--primary)]" />}
                title="Tap &quot;Add&quot;"
                description="The app icon appears on your home screen — open it from there for the full experience."
              />
              <p className="text-[10px] text-[var(--foreground-dim)] pt-2 border-t border-[var(--border)]">
                Push notifications require iOS 16.4+ and the app to be added
                to the home screen first.
              </p>
            </div>

            <div className="p-4 border-t border-[var(--border)] flex justify-end">
              <button
                onClick={handleIOSDismiss}
                className="btn-secondary text-[12px]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Step({
  num,
  icon,
  title,
  description,
}: {
  num: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center shrink-0">
        <span className="text-[11px] font-semibold text-[var(--foreground)] tabular-nums">
          {num}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {icon}
          <p className="text-[12px] font-medium text-[var(--foreground)]">
            {title}
          </p>
        </div>
        <p className="text-[11px] text-[var(--foreground-dim)] mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}
