"use client";

import Image from "next/image";
import { clsx } from "clsx";

interface WolfLogoProps {
  size?: "icon" | "mark" | "full";
  className?: string;
  animated?: boolean;
}

/**
 * Alpha Wolf Mascot — Dark charcoal wolf with amber gold eyes.
 *
 * - icon (28px): Geometric SVG silhouette for sidebar/favicon/FAB
 * - mark (56px): Rendered PNG wolf from wolf-512.png
 * - full (96px): Large rendered PNG wolf
 *
 * Hover animation: subtle gold glow around the image
 */
export default function WolfLogo({
  size = "mark",
  className,
  animated = false,
}: WolfLogoProps) {
  const sizeMap = { icon: 28, mark: 56, full: 96 };
  const px = sizeMap[size];

  if (size === "icon") {
    return <WolfIcon size={px} className={className} />;
  }

  return (
    <div
      className={clsx(
        "relative shrink-0 rounded-xl overflow-hidden",
        animated && "transition-all duration-300 hover:[filter:drop-shadow(0_0_12px_rgba(245,158,11,0.35))]",
        className
      )}
      style={{ width: px, height: px }}
    >
      <Image
        src="/wolf-512.png"
        alt="Alpha wolf"
        width={px}
        height={px}
        className="w-full h-full object-contain"
        priority={size === "full"}
      />
    </div>
  );
}

/**
 * WolfIcon — Compact geometric wolf for FABs, sidebar, and small placements.
 * SVG-based, works at 16-32px. Dark wolf silhouette with amber eye accents.
 */
export function WolfIcon({
  size = 20,
  className,
  color,
}: { size?: number; className?: string; color?: string }) {
  // Monochrome mode (e.g., white wolf on colored background)
  if (color) {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className={className} aria-label="Alpha">
        <path
          d="M5.5 9.5 L3.5 2 L8 6.5 L12 1.5 L16 6.5 L20.5 2 L18.5 9.5 Q19 14 18 17 Q16 21 12 23 Q8 21 6 17 Q5 14 5.5 9.5Z"
          fill={color}
        />
        <path d="M7.5 11.5 Q9 10 10.5 11.5 Q9 12.8 7.5 11.5Z" fill="var(--background, #0A0A0F)" opacity={0.85} />
        <path d="M13.5 11.5 Q15 10 16.5 11.5 Q15 12.8 13.5 11.5Z" fill="var(--background, #0A0A0F)" opacity={0.85} />
        <circle cx={9} cy={11.4} r={0.5} fill="#F59E0B" />
        <circle cx={15} cy={11.4} r={0.5} fill="#F59E0B" />
        <path d="M11 15.5 L12 17 L13 15.5Z" fill="var(--background, #0A0A0F)" opacity={0.5} />
      </svg>
    );
  }

  // Multi-color default: dark wolf with amber eyes
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" className={clsx("group", className)} aria-label="Alpha">
      {/* Head silhouette */}
      <path
        d="M5.5 9.5 L3.5 2 L8 6.5 L12 1.5 L16 6.5 L20.5 2 L18.5 9.5 Q19 14 18 17 Q16 21 12 23 Q8 21 6 17 Q5 14 5.5 9.5Z"
        fill="#1E1E2A"
      />
      {/* Face lighter layer */}
      <path
        d="M7 9.5 L8.5 7.5 L12 5 L15.5 7.5 L17 9.5 Q17.5 13 16.5 15.5 Q15 19 12 20.5 Q9 19 7.5 15.5 Q6.5 13 7 9.5Z"
        fill="#2A2A3A"
      />
      {/* Inner ears */}
      <path d="M5 4.5 L8.5 7.5 L10 5Z" fill="#3A3A4A" opacity={0.6} />
      <path d="M19 4.5 L15.5 7.5 L14 5Z" fill="#3A3A4A" opacity={0.6} />
      {/* Eyes — amber/gold */}
      <path
        d="M7.5 11.5 Q9 10 10.5 11.5 Q9 12.8 7.5 11.5Z"
        fill="#F59E0B"
        className="transition-all duration-300 group-hover:[filter:drop-shadow(0_0_4px_rgba(245,158,11,0.6))]"
      />
      <path
        d="M13.5 11.5 Q15 10 16.5 11.5 Q15 12.8 13.5 11.5Z"
        fill="#F59E0B"
        className="transition-all duration-300 group-hover:[filter:drop-shadow(0_0_4px_rgba(245,158,11,0.6))]"
      />
      {/* Pupils */}
      <circle cx={9} cy={11.5} r={0.6} fill="#1E1E2A" />
      <circle cx={15} cy={11.5} r={0.6} fill="#1E1E2A" />
      {/* Eye highlights */}
      <circle cx={9.3} cy={11.2} r={0.25} fill="#FCD34D" opacity={0.7} />
      <circle cx={15.3} cy={11.2} r={0.25} fill="#FCD34D" opacity={0.7} />
      {/* Nose */}
      <path d="M11 15.5 L12 17 L13 15.5Z" fill="#1A1A26" />
      {/* Mouth hint */}
      <path d="M12 17 L12 17.8" stroke="#1A1A26" strokeWidth={0.5} strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}
