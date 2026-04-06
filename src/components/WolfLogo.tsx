"use client";

import { clsx } from "clsx";

interface WolfLogoProps {
  size?: "icon" | "mark" | "full";
  className?: string;
  animated?: boolean;
  color?: string;
}

/**
 * Alpha Wolf — Geometric minimalist wolf head.
 * Constructed from clean SVG paths: angular ears, defined snout,
 * single diamond eye. Works at 16px to 512px.
 * Facing right (forward/future direction).
 */
export default function WolfLogo({
  size = "mark",
  className,
  animated = false,
  color = "currentColor",
}: WolfLogoProps) {
  const sizeMap = { icon: 24, mark: 64, full: 128 };
  const px = sizeMap[size];

  return (
    <svg
      viewBox="0 0 64 64"
      width={px}
      height={px}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(animated && "group", className)}
      aria-label="Alpha wolf logo"
    >
      {/* ── Head silhouette ── */}
      <path
        d="
          M 14 48
          L 8 14
          L 18 24
          L 24 8
          L 28 22
          L 36 22
          L 40 8
          L 46 24
          L 56 14
          L 50 48
          Z
        "
        fill={color}
        opacity={0.9}
      />

      {/* ── Inner ear detail (left) ── */}
      <path
        d="M 12 20 L 18 26 L 24 12 Z"
        fill={color}
        opacity={0.15}
      />

      {/* ── Inner ear detail (right) ── */}
      <path
        d="M 52 20 L 46 26 L 40 12 Z"
        fill={color}
        opacity={0.15}
      />

      {/* ── Snout ridge ── */}
      <path
        d="M 24 36 L 32 46 L 40 36"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.2}
      />

      {/* ── Forehead line ── */}
      <path
        d="M 28 24 L 32 30 L 36 24"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.15}
      />

      {/* ── Eye (left) — diamond shape ── */}
      <path
        d="M 24 32 L 26.5 30 L 29 32 L 26.5 34 Z"
        fill={color}
        className={clsx(
          animated && "transition-all duration-300 group-hover:drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]"
        )}
      />

      {/* ── Eye (right) — diamond shape ── */}
      <path
        d="M 35 32 L 37.5 30 L 40 32 L 37.5 34 Z"
        fill={color}
        className={clsx(
          animated && "transition-all duration-300 group-hover:drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]"
        )}
      />

      {/* ── Nose ── */}
      <ellipse cx={32} cy={40} rx={2.5} ry={1.8} fill={color} opacity={0.7} />

      {/* ── Jaw line ── */}
      <path
        d="M 20 44 Q 32 54 44 44"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.12}
        fill="none"
      />
    </svg>
  );
}

/**
 * WolfIcon — Ultra-minimal version for FAB buttons and favicons.
 * Just the silhouette, no inner details.
 */
export function WolfIcon({
  size = 20,
  className,
  color = "currentColor",
}: { size?: number; className?: string; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Alpha"
    >
      <path
        d="
          M 5 18
          L 3 5
          L 7 9
          L 9 3
          L 10.5 8.5
          L 13.5 8.5
          L 15 3
          L 17 9
          L 21 5
          L 19 18
          Z
        "
        fill={color}
      />
      <circle cx={9.5} cy={12.5} r={1} fill="var(--background, #0A0A0F)" />
      <circle cx={14.5} cy={12.5} r={1} fill="var(--background, #0A0A0F)" />
      <ellipse cx={12} cy={15.5} rx={1} ry={0.7} fill="var(--background, #0A0A0F)" opacity={0.7} />
    </svg>
  );
}
