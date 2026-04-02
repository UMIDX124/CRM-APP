"use client";

// FU Bot Mascot — A cute robot fox with neon orange theme
// Shows emotions: idle, thinking, happy, excited, sleeping
// Inspired by Duolingo but unique — a tech fox with circuit patterns

type Emotion = "idle" | "thinking" | "happy" | "excited" | "sleeping";

export default function FUMascot({
  emotion = "idle",
  size = 80,
}: {
  emotion?: Emotion;
  size?: number;
}) {
  const s = size;
  const eyeAnim = emotion === "thinking" ? "animate-pulse" : "";
  const bodyBounce = emotion === "excited" ? "animate-bounce" : "";
  const tiltClass = emotion === "thinking" ? "rotate-[-8deg]" : emotion === "happy" ? "rotate-[3deg]" : "";

  return (
    <div className={`relative transition-transform duration-300 ${bodyBounce} ${tiltClass}`} style={{ width: s, height: s }}>
      {/* Glow */}
      {emotion === "excited" && (
        <div className="absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse" style={{ background: "radial-gradient(circle, #FF6B00, transparent)" }} />
      )}

      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width={s} height={s}>
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#E05500" />
          </linearGradient>
          <linearGradient id="faceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1A1A1F" />
            <stop offset="100%" stopColor="#111114" />
          </linearGradient>
          <filter id="mascotGlow">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Ears */}
        <path d="M55 65 L40 25 L75 55 Z" fill="url(#bodyGrad)" opacity="0.9" />
        <path d="M145 65 L160 25 L125 55 Z" fill="url(#bodyGrad)" opacity="0.9" />
        <path d="M58 60 L48 32 L72 55 Z" fill="#FF8A33" opacity="0.4" />
        <path d="M142 60 L152 32 L128 55 Z" fill="#FF8A33" opacity="0.4" />

        {/* Head / Body */}
        <ellipse cx="100" cy="110" rx="55" ry="52" fill="url(#bodyGrad)" />

        {/* Face plate */}
        <ellipse cx="100" cy="108" rx="42" ry="38" fill="url(#faceGrad)" />

        {/* Circuit lines on cheeks */}
        <line x1="60" y1="100" x2="50" y2="95" stroke="#FF6B00" strokeWidth="1" opacity="0.3" />
        <line x1="50" y1="95" x2="45" y2="100" stroke="#FF6B00" strokeWidth="1" opacity="0.3" />
        <circle cx="45" cy="100" r="2" fill="#FF6B00" opacity="0.4" />
        <line x1="140" y1="100" x2="150" y2="95" stroke="#FF6B00" strokeWidth="1" opacity="0.3" />
        <line x1="150" y1="95" x2="155" y2="100" stroke="#FF6B00" strokeWidth="1" opacity="0.3" />
        <circle cx="155" cy="100" r="2" fill="#FF6B00" opacity="0.4" />

        {/* Eyes */}
        {emotion === "sleeping" ? (
          <>
            {/* Closed eyes — ZzZ */}
            <line x1="78" y1="98" x2="92" y2="98" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="108" y1="98" x2="122" y2="98" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round" />
            <text x="135" y="75" fill="#FF6B00" fontSize="16" fontWeight="bold" opacity="0.6">z</text>
            <text x="148" y="62" fill="#FF6B00" fontSize="12" fontWeight="bold" opacity="0.4">z</text>
          </>
        ) : emotion === "happy" || emotion === "excited" ? (
          <>
            {/* Happy eyes — upward curves */}
            <path d="M78 100 Q85 90 92 100" stroke="#FF6B00" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M108 100 Q115 90 122 100" stroke="#FF6B00" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            {emotion === "excited" && (
              <>
                {/* Sparkles */}
                <circle cx="70" cy="85" r="2" fill="#FF8A33" opacity="0.8">
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="132" cy="82" r="1.5" fill="#FF8A33" opacity="0.6">
                  <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </>
        ) : (
          <>
            {/* Normal eyes */}
            <ellipse cx="85" cy="97" rx="7" ry={emotion === "thinking" ? 6 : 8} fill="#FF6B00" filter="url(#mascotGlow)">
              {emotion === "thinking" && <animate attributeName="ry" values="8;4;8" dur="2s" repeatCount="indefinite" />}
            </ellipse>
            <ellipse cx="115" cy="97" rx="7" ry={emotion === "thinking" ? 6 : 8} fill="#FF6B00" filter="url(#mascotGlow)">
              {emotion === "thinking" && <animate attributeName="ry" values="8;4;8" dur="2s" repeatCount="indefinite" />}
            </ellipse>
            {/* Eye shine */}
            <circle cx="82" cy="94" r="2.5" fill="#FFF" opacity="0.8" />
            <circle cx="112" cy="94" r="2.5" fill="#FFF" opacity="0.8" />
          </>
        )}

        {/* Nose */}
        <ellipse cx="100" cy="108" rx="4" ry="3" fill="#FF8A33" opacity="0.7" />

        {/* Mouth */}
        {emotion === "happy" || emotion === "excited" ? (
          <path d="M88 118 Q100 130 112 118" stroke="#FF6B00" strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : emotion === "thinking" ? (
          <ellipse cx="105" cy="120" rx="5" ry="4" fill="#FF6B00" opacity="0.3" />
        ) : emotion === "sleeping" ? (
          <path d="M92 118 Q100 122 108 118" stroke="#FF6B00" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
        ) : (
          <path d="M90 118 Q100 124 110 118" stroke="#FF6B00" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        )}

        {/* Antenna */}
        <line x1="100" y1="58" x2="100" y2="42" stroke="#FF6B00" strokeWidth="2" />
        <circle cx="100" cy="38" r="5" fill="#FF6B00" filter="url(#mascotGlow)">
          <animate attributeName="r" values="5;6;5" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx="100" cy="38" r="2" fill="#FFF" />

        {/* Thinking bubble */}
        {emotion === "thinking" && (
          <>
            <circle cx="155" cy="60" r="4" fill="#FF6B00" opacity="0.3" />
            <circle cx="162" cy="48" r="6" fill="#FF6B00" opacity="0.2" />
            <circle cx="172" cy="35" r="9" fill="#FF6B00" opacity="0.15" />
          </>
        )}

        {/* Blush spots */}
        {(emotion === "happy" || emotion === "excited") && (
          <>
            <ellipse cx="70" cy="108" rx="8" ry="4" fill="#FF6B00" opacity="0.15" />
            <ellipse cx="130" cy="108" rx="8" ry="4" fill="#FF6B00" opacity="0.15" />
          </>
        )}
      </svg>
    </div>
  );
}
