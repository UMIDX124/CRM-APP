"use client";

export default function Logo({ size = 48, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {glow && (
        <div
          className="absolute inset-0 rounded-xl blur-xl opacity-40"
          style={{ background: "radial-gradient(circle, #D4AF37, #0EA5E9)" }}
        />
      )}
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className="relative"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37" />
            <stop offset="50%" stopColor="#F5D76E" />
            <stop offset="100%" stopColor="#B8860B" />
          </linearGradient>
          <linearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="innerGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shield outline */}
        <path
          d="M100 10 L180 50 L180 120 Q180 160 100 190 Q20 160 20 120 L20 50 Z"
          fill="none"
          stroke="url(#shieldGrad)"
          strokeWidth="4"
          filter="url(#glow)"
          opacity="0.9"
        />

        {/* Inner shield */}
        <path
          d="M100 25 L168 58 L168 118 Q168 152 100 178 Q32 152 32 118 L32 58 Z"
          fill="#0a0a0f"
          stroke="url(#shieldGrad)"
          strokeWidth="1.5"
          opacity="0.6"
        />

        {/* Compass circle */}
        <circle
          cx="100"
          cy="105"
          r="45"
          fill="none"
          stroke="url(#innerGrad)"
          strokeWidth="1.5"
          opacity="0.5"
          strokeDasharray="8 4"
        />

        {/* Inner compass ring */}
        <circle
          cx="100"
          cy="105"
          r="32"
          fill="none"
          stroke="url(#innerGrad)"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Compass arrows */}
        {/* Top arrow */}
        <path d="M100 58 L105 68 L100 65 L95 68 Z" fill="#0EA5E9" opacity="0.7" />
        {/* Bottom arrow */}
        <path d="M100 152 L105 142 L100 145 L95 142 Z" fill="#0EA5E9" opacity="0.7" />
        {/* Left arrow */}
        <path d="M53 105 L63 100 L60 105 L63 110 Z" fill="#0EA5E9" opacity="0.7" />
        {/* Right arrow */}
        <path d="M147 105 L137 100 L140 105 L137 110 Z" fill="#0EA5E9" opacity="0.7" />

        {/* Circuit nodes */}
        <circle cx="72" cy="78" r="3" fill="#0EA5E9" opacity="0.6" />
        <circle cx="128" cy="78" r="3" fill="#0EA5E9" opacity="0.6" />
        <circle cx="72" cy="132" r="3" fill="#D4AF37" opacity="0.6" />
        <circle cx="128" cy="132" r="3" fill="#D4AF37" opacity="0.6" />

        {/* Circuit lines */}
        <line x1="72" y1="78" x2="85" y2="90" stroke="#0EA5E9" strokeWidth="1" opacity="0.3" />
        <line x1="128" y1="78" x2="115" y2="90" stroke="#0EA5E9" strokeWidth="1" opacity="0.3" />
        <line x1="72" y1="132" x2="85" y2="120" stroke="#D4AF37" strokeWidth="1" opacity="0.3" />
        <line x1="128" y1="132" x2="115" y2="120" stroke="#D4AF37" strokeWidth="1" opacity="0.3" />

        {/* Center dot */}
        <circle cx="100" cy="105" r="4" fill="#D4AF37" filter="url(#innerGlow)" />
        <circle cx="100" cy="105" r="2" fill="#FFFFFF" />

        {/* FU Text */}
        <text
          x="100"
          y="112"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize="42"
          fill="url(#textGrad)"
          filter="url(#glow)"
          letterSpacing="-2"
        >
          FU
        </text>

        {/* Decorative top element */}
        <path
          d="M90 40 L100 32 L110 40"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

export function LogoMini({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="miniShield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>
      <path
        d="M100 15 L175 52 L175 120 Q175 158 100 188 Q25 158 25 120 L25 52 Z"
        fill="#0a0a0f"
        stroke="url(#miniShield)"
        strokeWidth="6"
      />
      <text
        x="100"
        y="118"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
        fontWeight="900"
        fontSize="56"
        fill="#D4AF37"
      >
        FU
      </text>
    </svg>
  );
}
