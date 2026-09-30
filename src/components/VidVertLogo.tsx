import React from 'react';

interface VidVertLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
}

/**
 * Standalone VidVert Crop Icon (for favicon, avatars, small buttons)
 * Features the green camera crop frame, the sharp V, and the red REC dot
 */
export const VidVertIcon: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 32
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* Top Overlapping Crop Line */}
      <line x1="16" y1="28" x2="80" y2="28" stroke="#22c55e" strokeWidth="8" strokeLinecap="square" />
      
      {/* Left Overlapping Crop Line */}
      <line x1="28" y1="16" x2="28" y2="88" stroke="#22c55e" strokeWidth="8" strokeLinecap="square" />
      
      {/* Bottom Overlapping Crop Line */}
      <line x1="20" y1="84" x2="88" y2="84" stroke="#22c55e" strokeWidth="8" strokeLinecap="square" />
      
      {/* Right Overlapping Crop Line */}
      <line x1="78" y1="22" x2="78" y2="94" stroke="#22c55e" strokeWidth="8" strokeLinecap="square" />

      {/* Stylized Red 'V' checkmark */}
      <path
        d="M 28 32 L 53 84 L 75 8"
        stroke="#ef4444"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Red Recording Dot inside V */}
      <circle cx="53" cy="42" r="8" fill="#ef4444" />
    </svg>
  );
};

/**
 * Full VidVert Brand Logo for Header
 * Displays "VID" + [Stylized Crop V with REC Dot] + "ERT"
 */
export const VidVertLogo: React.FC<VidVertLogoProps> = ({
  size = 'md',
  showBadge = true,
  className = ''
}) => {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const iconSizes = {
    sm: 26,
    md: 36,
    lg: 44
  };

  return (
    <div className={`flex items-center gap-2 select-none group ${className}`}>
      <div className="flex items-center tracking-tight font-black font-sans leading-none">
        {/* "VID" in crisp bright text */}
        <span className={`${textSizes[size]} text-white tracking-wide transition-colors group-hover:text-slate-100`}>
          VID
        </span>

        {/* Center Stylized 'V' Icon Mark that integrates into the word */}
        <div className="mx-0.5 -mt-0.5 relative transition-transform duration-200 group-hover:scale-105">
          <VidVertIcon size={iconSizes[size]} />
          {/* Subtle red glow effect */}
          <div className="absolute inset-0 bg-red-500/20 blur-sm rounded-full pointer-events-none -z-10" />
        </div>

        {/* "ERT" completing VIDVERT */}
        <span className={`${textSizes[size]} text-white tracking-wide transition-colors group-hover:text-slate-100`}>
          ERT
        </span>
      </div>

      {/* Optional Pro / 9:16 Tagline Badge */}
      {showBadge && (
        <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          9:16 Reframe
        </span>
      )}
    </div>
  );
};

export default VidVertLogo;
