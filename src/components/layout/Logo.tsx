"use client";

export default function Logo({ size = 48 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-xl blur-lg opacity-30" style={{ background: "radial-gradient(circle, #FF6B00, #FF8A33)" }} />
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size} className="relative">
        <defs>
          <linearGradient id="shieldG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B00" />
            <stop offset="50%" stopColor="#FF8A33" />
            <stop offset="100%" stopColor="#E05500" />
          </linearGradient>
          <linearGradient id="innerG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E4E4E7" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {/* Shield */}
        <path d="M100 10 L180 50 L180 120 Q180 160 100 190 Q20 160 20 120 L20 50 Z" fill="none" stroke="url(#shieldG)" strokeWidth="4" filter="url(#glow)" opacity="0.9" />
        <path d="M100 25 L168 58 L168 118 Q168 152 100 178 Q32 152 32 118 L32 58 Z" fill="#111114" stroke="url(#shieldG)" strokeWidth="1.5" opacity="0.5" />
        {/* Compass */}
        <circle cx="100" cy="105" r="45" fill="none" stroke="#FF6B00" strokeWidth="1" opacity="0.3" strokeDasharray="6 4" />
        <circle cx="100" cy="105" r="30" fill="none" stroke="#FF8A33" strokeWidth="0.5" opacity="0.2" />
        {/* Arrows */}
        <path d="M100 58 L105 68 L100 65 L95 68 Z" fill="#FF6B00" opacity="0.6" />
        <path d="M100 152 L105 142 L100 145 L95 142 Z" fill="#FF6B00" opacity="0.6" />
        <path d="M53 105 L63 100 L60 105 L63 110 Z" fill="#FF6B00" opacity="0.6" />
        <path d="M147 105 L137 100 L140 105 L137 110 Z" fill="#FF6B00" opacity="0.6" />
        {/* Nodes */}
        <circle cx="72" cy="78" r="2.5" fill="#FF8A33" opacity="0.5" />
        <circle cx="128" cy="78" r="2.5" fill="#FF8A33" opacity="0.5" />
        <circle cx="72" cy="132" r="2.5" fill="#FFFFFF" opacity="0.3" />
        <circle cx="128" cy="132" r="2.5" fill="#FFFFFF" opacity="0.3" />
        {/* Lines */}
        <line x1="72" y1="78" x2="85" y2="90" stroke="#FF6B00" strokeWidth="0.8" opacity="0.25" />
        <line x1="128" y1="78" x2="115" y2="90" stroke="#FF6B00" strokeWidth="0.8" opacity="0.25" />
        <line x1="72" y1="132" x2="85" y2="120" stroke="#FFF" strokeWidth="0.8" opacity="0.15" />
        <line x1="128" y1="132" x2="115" y2="120" stroke="#FFF" strokeWidth="0.8" opacity="0.15" />
        {/* Center */}
        <circle cx="100" cy="105" r="3.5" fill="#FF6B00" filter="url(#glow)" />
        <circle cx="100" cy="105" r="1.5" fill="#FFF" />
        {/* FU Text */}
        <text x="100" y="112" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="42" fill="url(#innerG)" filter="url(#glow)" letterSpacing="-2">FU</text>
        {/* Crown */}
        <path d="M88 38 L94 30 L100 35 L106 30 L112 38" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      </svg>
    </div>
  );
}

export function LogoMini({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
      <defs>
        <linearGradient id="ms" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="100%" stopColor="#E05500" />
        </linearGradient>
      </defs>
      <path d="M100 15 L175 52 L175 120 Q175 158 100 188 Q25 158 25 120 L25 52 Z" fill="#111114" stroke="url(#ms)" strokeWidth="5" />
      <text x="100" y="118" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="56" fill="#FF6B00">FU</text>
    </svg>
  );
}
