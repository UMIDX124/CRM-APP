"use client";

import Image from "next/image";
import { clsx } from "clsx";

interface WolfLogoProps {
  size?: "icon" | "mark" | "full";
  className?: string;
  animated?: boolean;
}

/**
 * Alpha Mascot — uses user-supplied mascott.png rendered to optimized PNGs.
 * - icon (32px): mascot-32.png for FAB, sidebar, favicon
 * - mark (48px): mascot-48.png for headers
 * - full (96px): mascot-96.png for login, 404
 */
export default function WolfLogo({
  size = "mark",
  className,
  animated = false,
}: WolfLogoProps) {
  const config = {
    icon: { px: 32, src: "/mascot-48.png" },
    mark: { px: 48, src: "/mascot-96.png" },
    full: { px: 96, src: "/mascot-192.png" },
  }[size];

  return (
    <div
      className={clsx(
        "relative shrink-0 rounded-xl overflow-hidden",
        animated && "transition-all duration-300 hover:[filter:drop-shadow(0_0_14px_rgba(245,158,11,0.4))]",
        className
      )}
      style={{ width: config.px, height: config.px }}
    >
      <Image
        src={config.src}
        alt="Alpha mascot"
        width={config.px}
        height={config.px}
        className="w-full h-full object-cover"
        priority={size === "full"}
      />
    </div>
  );
}

/**
 * WolfIcon — Compact mascot icon for FABs, sidebar, small placements.
 * Renders the actual mascot image scaled to the requested size.
 * Wraps in rounded container for clean edges.
 */
export function WolfIcon({
  size = 20,
  className,
  color: _color, // accepted but ignored — we use the real mascot image
}: { size?: number; className?: string; color?: string }) {
  // Pick the best source file for the requested size
  const src = size <= 32 ? "/mascot-48.png" : size <= 64 ? "/mascot-96.png" : "/mascot-192.png";

  return (
    <div
      className={clsx("relative shrink-0 rounded-md overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt="Alpha"
        width={size}
        height={size}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
