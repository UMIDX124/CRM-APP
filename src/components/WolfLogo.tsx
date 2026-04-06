"use client";

import { clsx } from "clsx";

interface WolfLogoProps {
  size?: "icon" | "mark" | "full";
  className?: string;
  animated?: boolean;
}

/*
 * ALPHA WOLF — Front-facing geometric wolf head
 *
 * Anatomy (top to bottom):
 *   - Two tall pointed ears (35% of height), angled slightly outward
 *   - Wide forehead tapering to cheekbones
 *   - Angular almond eyes, angled upward at outer corners
 *   - Snout narrowing to nose triangle
 *   - Strong jawline from ear to chin
 *   - Optional fur ruff at cheeks
 *
 * 3 tonal layers:
 *   - #4338CA (deep indigo) — head silhouette base
 *   - #6366F1 (primary indigo) — face/forehead overlay
 *   - #818CF8 (light indigo) — inner ears, eye highlights
 *   - #A5B4FC — eye glow on hover
 */

// ─── Full Wolf Mark (48-128px) ──────────────────────────

export default function WolfLogo({
  size = "mark",
  className,
  animated = false,
}: WolfLogoProps) {
  const sizeMap = { icon: 32, mark: 80, full: 128 };
  const px = sizeMap[size];

  // Icon variant: simplified for small sizes
  if (size === "icon") {
    return (
      <svg
        viewBox="0 0 32 32"
        width={px}
        height={px}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx(animated && "group", className)}
        aria-label="Alpha"
      >
        {/* Head silhouette — shield shape with ears */}
        <path
          d="M7 12 L4.5 3 L10 8 L16 2 L22 8 L27.5 3 L25 12 Q25 22 16 28 Q7 22 7 12Z"
          fill="#6366F1"
        />
        {/* Inner ears */}
        <path d="M7 6.5 L10.5 9.5 L13 4.5Z" fill="#818CF8" opacity={0.5} />
        <path d="M25 6.5 L21.5 9.5 L19 4.5Z" fill="#818CF8" opacity={0.5} />
        {/* Forehead blaze — lighter central area */}
        <path
          d="M12 10 L16 8 L20 10 L20 15 Q16 17 12 15Z"
          fill="#818CF8"
          opacity={0.25}
        />
        {/* Left eye — almond */}
        <path
          d="M10 14.5 Q12 12.5 14 14.5 Q12 16 10 14.5Z"
          fill="#C7D2FE"
          className={clsx(animated && "transition-all duration-300 group-hover:[filter:drop-shadow(0_0_4px_rgba(165,180,252,0.7))]")}
        />
        {/* Right eye — almond */}
        <path
          d="M18 14.5 Q20 12.5 22 14.5 Q20 16 18 14.5Z"
          fill="#C7D2FE"
          className={clsx(animated && "transition-all duration-300 group-hover:[filter:drop-shadow(0_0_4px_rgba(165,180,252,0.7))]")}
        />
        {/* Pupils */}
        <circle cx={12} cy={14.5} r={0.9} fill="#312E81" />
        <circle cx={20} cy={14.5} r={0.9} fill="#312E81" />
        {/* Nose */}
        <path d="M14.5 19 L16 21 L17.5 19Z" fill="#4338CA" />
        {/* Snout line */}
        <path d="M16 21 L16 23" stroke="#4338CA" strokeWidth={0.8} strokeLinecap="round" opacity={0.5} />
      </svg>
    );
  }

  // Mark / Full variant — detailed wolf head
  return (
    <svg
      viewBox="0 0 64 64"
      width={px}
      height={px}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(animated && "group", className)}
      aria-label="Alpha wolf"
    >
      {/* ── Layer 1: Head silhouette — wide at cheeks, tapering to chin ── */}
      <path
        d="
          M 14 24
          L 8.5 5
          L 19 16
          L 32 3
          L 45 16
          L 55.5 5
          L 50 24
          Q 52 30 50 36
          Q 48 44 40 50
          Q 36 54 32 56
          Q 28 54 24 50
          Q 16 44 14 36
          Q 12 30 14 24
          Z
        "
        fill="#4338CA"
      />

      {/* ── Layer 2: Face overlay — lighter forehead/cheek area ── */}
      <path
        d="
          M 17 24
          L 20 18
          L 32 10
          L 44 18
          L 47 24
          Q 48 30 46 35
          Q 42 44 32 50
          Q 22 44 18 35
          Q 16 30 17 24
          Z
        "
        fill="#6366F1"
      />

      {/* ── Inner ear (left) ── */}
      <path
        d="M 11 10 L 19.5 17.5 L 26 8Z"
        fill="#818CF8"
        opacity={0.5}
      />

      {/* ── Inner ear (right) ── */}
      <path
        d="M 53 10 L 44.5 17.5 L 38 8Z"
        fill="#818CF8"
        opacity={0.5}
      />

      {/* ── Forehead blaze — central lighter patch ── */}
      <path
        d="M 25 18 L 32 13 L 39 18 L 39 26 Q 32 30 25 26Z"
        fill="#818CF8"
        opacity={0.2}
      />

      {/* ── Left eye — angular almond, tilted upward at outer corner ── */}
      <path
        d="M 19 29 Q 23 25 27.5 29 Q 23 32.5 19 29Z"
        fill="#C7D2FE"
        className={clsx(animated && "transition-all duration-300 group-hover:[filter:drop-shadow(0_0_6px_rgba(165,180,252,0.7))]")}
      />

      {/* ── Right eye — angular almond ── */}
      <path
        d="M 36.5 29 Q 41 25 45 29 Q 41 32.5 36.5 29Z"
        fill="#C7D2FE"
        className={clsx(animated && "transition-all duration-300 group-hover:[filter:drop-shadow(0_0_6px_rgba(165,180,252,0.7))]")}
      />

      {/* ── Left pupil ── */}
      <circle cx={23.5} cy={29} r={1.8} fill="#312E81" />
      <circle cx={24} cy={28.5} r={0.5} fill="#C7D2FE" opacity={0.6} />

      {/* ── Right pupil ── */}
      <circle cx={40.5} cy={29} r={1.8} fill="#312E81" />
      <circle cx={41} cy={28.5} r={0.5} fill="#C7D2FE" opacity={0.6} />

      {/* ── Snout bridge ── */}
      <path
        d="M 28 32 L 32 28 L 36 32"
        stroke="#818CF8"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.3}
        fill="none"
      />

      {/* ── Nose — downward triangle ── */}
      <path
        d="M 29 39 L 32 43 L 35 39 Q 32 37.5 29 39Z"
        fill="#312E81"
      />

      {/* ── Mouth line ── */}
      <path
        d="M 32 43 L 32 46"
        stroke="#312E81"
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.5}
      />

      {/* ── Mouth curves ── */}
      <path
        d="M 27 45 Q 32 48 37 45"
        stroke="#312E81"
        strokeWidth={0.8}
        strokeLinecap="round"
        fill="none"
        opacity={0.3}
      />

      {/* ── Left cheek fur ruff ── */}
      <path d="M 14 30 L 11 34 L 15 33Z" fill="#4338CA" opacity={0.6} />
      <path d="M 13 34 L 10 39 L 15 37Z" fill="#4338CA" opacity={0.4} />

      {/* ── Right cheek fur ruff ── */}
      <path d="M 50 30 L 53 34 L 49 33Z" fill="#4338CA" opacity={0.6} />
      <path d="M 51 34 L 54 39 L 49 37Z" fill="#4338CA" opacity={0.4} />

      {/* ── Jaw highlight lines ── */}
      <path
        d="M 18 36 Q 16 42 24 50"
        stroke="#818CF8"
        strokeWidth={0.6}
        strokeLinecap="round"
        fill="none"
        opacity={0.15}
      />
      <path
        d="M 46 36 Q 48 42 40 50"
        stroke="#818CF8"
        strokeWidth={0.6}
        strokeLinecap="round"
        fill="none"
        opacity={0.15}
      />
    </svg>
  );
}

// ─── WolfIcon — Compact icon for FABs, sidebar, favicon (20-24px) ────

export function WolfIcon({
  size = 20,
  className,
  color,
}: { size?: number; className?: string; color?: string }) {
  // When a custom color is passed (e.g., "#fff"), render monochrome
  if (color) {
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
        {/* Monochrome wolf silhouette with ears */}
        <path
          d="M5.5 9.5 L3.5 2 L8 6.5 L12 1.5 L16 6.5 L20.5 2 L18.5 9.5 Q19 14 18 17 Q16 21 12 23 Q8 21 6 17 Q5 14 5.5 9.5Z"
          fill={color}
        />
        {/* Eyes — cutout */}
        <path d="M7.5 11.5 Q9 10 10.5 11.5 Q9 12.8 7.5 11.5Z" fill="var(--background, #0A0A0F)" opacity={0.9} />
        <path d="M13.5 11.5 Q15 10 16.5 11.5 Q15 12.8 13.5 11.5Z" fill="var(--background, #0A0A0F)" opacity={0.9} />
        {/* Nose */}
        <path d="M11 15.5 L12 17 L13 15.5Z" fill="var(--background, #0A0A0F)" opacity={0.6} />
      </svg>
    );
  }

  // Multi-color version (default)
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
      {/* Head silhouette */}
      <path
        d="M5.5 9.5 L3.5 2 L8 6.5 L12 1.5 L16 6.5 L20.5 2 L18.5 9.5 Q19 14 18 17 Q16 21 12 23 Q8 21 6 17 Q5 14 5.5 9.5Z"
        fill="#4338CA"
      />
      {/* Face overlay */}
      <path
        d="M7 9.5 L8.5 7.5 L12 5 L15.5 7.5 L17 9.5 Q17.5 13 16.5 15.5 Q15 19 12 20.5 Q9 19 7.5 15.5 Q6.5 13 7 9.5Z"
        fill="#6366F1"
      />
      {/* Inner ears */}
      <path d="M5 4.5 L8.5 7.5 L10 5Z" fill="#818CF8" opacity={0.5} />
      <path d="M19 4.5 L15.5 7.5 L14 5Z" fill="#818CF8" opacity={0.5} />
      {/* Eyes */}
      <path d="M7.5 11.5 Q9 10 10.5 11.5 Q9 12.8 7.5 11.5Z" fill="#C7D2FE" />
      <path d="M13.5 11.5 Q15 10 16.5 11.5 Q15 12.8 13.5 11.5Z" fill="#C7D2FE" />
      {/* Pupils */}
      <circle cx={9} cy={11.5} r={0.7} fill="#312E81" />
      <circle cx={15} cy={11.5} r={0.7} fill="#312E81" />
      {/* Nose */}
      <path d="M11 15.5 L12 17 L13 15.5Z" fill="#312E81" />
    </svg>
  );
}
