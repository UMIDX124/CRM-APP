"use client";

import { useEffect, useState } from "react";

type Emotion = "idle" | "thinking" | "happy" | "excited" | "sleeping";

export default function FUMascot({
  emotion = "idle",
  size = 80,
}: {
  emotion?: Emotion;
  size?: number;
}) {
  const [blinking, setBlinking] = useState(false);
  const [bobY, setBobY] = useState(0);

  // Blink every 3-5 seconds
  useEffect(() => {
    if (emotion === "sleeping") return;
    const id = setInterval(() => {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 180);
    }, 2500 + Math.random() * 2000);
    return () => clearInterval(id);
  }, [emotion]);

  // Idle bobbing animation
  useEffect(() => {
    if (emotion === "sleeping" || emotion === "excited") return;
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.04;
      setBobY(Math.sin(t) * 3);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [emotion]);

  const ey = blinking ? 1.5 : emotion === "thinking" ? 5 : 8;

  return (
    <div
      className="relative"
      style={{
        width: size,
        height: size,
        transform: `translateY(${bobY}px) ${emotion === "thinking" ? "rotate(-8deg)" : emotion === "happy" ? "rotate(3deg)" : ""}`,
        transition: "transform 0.3s ease",
      }}
    >
      {/* Neon glow ring */}
      <div
        className="absolute inset-[-8px] rounded-full animate-pulse"
        style={{
          background: "radial-gradient(circle, rgba(255,107,0,0.25) 0%, transparent 70%)",
          filter: "blur(8px)",
        }}
      />

      {/* Extra pop glow on excited/happy */}
      {(emotion === "excited" || emotion === "happy") && (
        <div
          className="absolute inset-[-14px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(255,107,0,0.35) 0%, transparent 60%)",
            filter: "blur(16px)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      )}

      <svg
        viewBox="0 0 200 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className="relative drop-shadow-[0_0_15px_rgba(255,107,0,0.3)]"
      >
        <defs>
          <linearGradient id="bodyG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7A1A" />
            <stop offset="100%" stopColor="#E05500" />
          </linearGradient>
          <linearGradient id="faceG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1C1C24" />
            <stop offset="100%" stopColor="#131318" />
          </linearGradient>
          <filter id="neonGl">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softGl">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* === EARS === */}
        <path d="M56 70 L36 22 L80 58 Z" fill="url(#bodyG)" />
        <path d="M144 70 L164 22 L120 58 Z" fill="url(#bodyG)" />
        {/* Inner ears */}
        <path d="M60 64 L46 34 L76 56 Z" fill="#FF9A40" opacity="0.3" />
        <path d="M140 64 L154 34 L124 56 Z" fill="#FF9A40" opacity="0.3" />

        {/* === HEAD === */}
        <ellipse cx="100" cy="118" rx="58" ry="56" fill="url(#bodyG)" />

        {/* Face plate */}
        <ellipse cx="100" cy="116" rx="45" ry="42" fill="url(#faceG)" />

        {/* Circuit decoration */}
        <line x1="60" y1="106" x2="46" y2="99" stroke="#FF6B00" strokeWidth="1.2" opacity="0.3" />
        <line x1="46" y1="99" x2="40" y2="104" stroke="#FF6B00" strokeWidth="1.2" opacity="0.2" />
        <circle cx="40" cy="104" r="2.5" fill="#FF6B00" opacity="0.4" filter="url(#softGl)" />
        <line x1="140" y1="106" x2="154" y2="99" stroke="#FF6B00" strokeWidth="1.2" opacity="0.3" />
        <line x1="154" y1="99" x2="160" y2="104" stroke="#FF6B00" strokeWidth="1.2" opacity="0.2" />
        <circle cx="160" cy="104" r="2.5" fill="#FF6B00" opacity="0.4" filter="url(#softGl)" />

        {/* === EYES === */}
        {emotion === "sleeping" ? (
          <>
            <line x1="76" y1="105" x2="94" y2="105" stroke="#FF6B00" strokeWidth="3" strokeLinecap="round" />
            <line x1="106" y1="105" x2="124" y2="105" stroke="#FF6B00" strokeWidth="3" strokeLinecap="round" />
            <text x="140" y="78" fill="#FF6B00" fontSize="20" fontWeight="900" opacity="0.5">
              <animate attributeName="opacity" values="0.5;0.15;0.5" dur="2s" repeatCount="indefinite" />
              z
            </text>
            <text x="154" y="60" fill="#FF6B00" fontSize="14" fontWeight="900" opacity="0.35">
              <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite" begin="0.4s" />
              z
            </text>
            <text x="162" y="46" fill="#FF6B00" fontSize="10" fontWeight="900" opacity="0.2">
              <animate attributeName="opacity" values="0.2;0.05;0.2" dur="2s" repeatCount="indefinite" begin="0.8s" />
              z
            </text>
          </>
        ) : emotion === "happy" || emotion === "excited" ? (
          <>
            <path d="M76 108 Q85 94 94 108" stroke="#FF6B00" strokeWidth="3.5" fill="none" strokeLinecap="round" filter="url(#softGl)" />
            <path d="M106 108 Q115 94 124 108" stroke="#FF6B00" strokeWidth="3.5" fill="none" strokeLinecap="round" filter="url(#softGl)" />
            {/* Sparkles */}
            {emotion === "excited" && (
              <>
                <circle cx="65" cy="86" r="3" fill="#FF9A40" opacity="0.8">
                  <animate attributeName="r" values="2;4;2" dur="0.7s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.7s" repeatCount="indefinite" />
                </circle>
                <circle cx="136" cy="84" r="2.5" fill="#FF9A40" opacity="0.6">
                  <animate attributeName="r" values="1.5;3.5;1.5" dur="0.9s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0.1;0.6" dur="0.9s" repeatCount="indefinite" />
                </circle>
                <circle cx="100" cy="64" r="2" fill="#FFF" opacity="0.5">
                  <animate attributeName="r" values="1;3;1" dur="0.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="0.6s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </>
        ) : (
          <>
            {/* Normal eyes */}
            <ellipse cx="85" cy="104" rx="8" ry={ey} fill="#FF6B00" filter="url(#neonGl)" />
            <ellipse cx="115" cy="104" rx="8" ry={ey} fill="#FF6B00" filter="url(#neonGl)" />
            {/* Shine */}
            {!blinking && ey > 3 && (
              <>
                <circle cx="81" cy="100" r="3" fill="#FFF" opacity="0.9" />
                <circle cx="111" cy="100" r="3" fill="#FFF" opacity="0.9" />
                <circle cx="88" cy="106" r="1.2" fill="#FFF" opacity="0.4" />
                <circle cx="118" cy="106" r="1.2" fill="#FFF" opacity="0.4" />
              </>
            )}
            {/* Thinking squint */}
            {emotion === "thinking" && (
              <>
                <animate attributeName="opacity" values="1;1" dur="2s" />
              </>
            )}
          </>
        )}

        {/* Nose */}
        <ellipse cx="100" cy="116" rx="4.5" ry="3.5" fill="#FF9A40" opacity="0.5" />

        {/* Mouth */}
        {emotion === "happy" || emotion === "excited" ? (
          <path d="M84 128 Q100 144 116 128" stroke="#FF6B00" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : emotion === "thinking" ? (
          <ellipse cx="107" cy="130" rx="6" ry="4" fill="#FF6B00" opacity="0.2" />
        ) : emotion === "sleeping" ? (
          <path d="M92 128 Q100 132 108 128" stroke="#FF6B00" strokeWidth="1.5" fill="none" opacity="0.25" strokeLinecap="round" />
        ) : (
          <path d="M88 128 Q100 136 112 128" stroke="#FF6B00" strokeWidth="2" fill="none" strokeLinecap="round" />
        )}

        {/* === ANTENNA === */}
        <line x1="100" y1="62" x2="100" y2="42" stroke="#FF6B00" strokeWidth="3" />
        <circle cx="100" cy="38" r="7" fill="#FF6B00" filter="url(#neonGl)">
          <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="38" r="3" fill="#FFF" />

        {/* Crown on top */}
        <path d="M86 36 L93 26 L100 32 L107 26 L114 36" fill="none" stroke="#FF9A40" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

        {/* Thinking bubbles */}
        {emotion === "thinking" && (
          <>
            <circle cx="154" cy="68" r="5" fill="#FF6B00" opacity="0.2">
              <animate attributeName="opacity" values="0.2;0.05;0.2" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="164" cy="52" r="7" fill="#FF6B00" opacity="0.15">
              <animate attributeName="opacity" values="0.15;0.03;0.15" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
            </circle>
            <circle cx="176" cy="34" r="10" fill="#FF6B00" opacity="0.1">
              <animate attributeName="opacity" values="0.1;0.02;0.1" dur="1.5s" repeatCount="indefinite" begin="0.6s" />
            </circle>
          </>
        )}

        {/* Blush spots */}
        {(emotion === "happy" || emotion === "excited") && (
          <>
            <ellipse cx="66" cy="118" rx="10" ry="5" fill="#FF6B00" opacity="0.12" />
            <ellipse cx="134" cy="118" rx="10" ry="5" fill="#FF6B00" opacity="0.12" />
          </>
        )}
      </svg>
    </div>
  );
}
