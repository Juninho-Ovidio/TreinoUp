import { useId } from "react";

/** Símbolo do TreinoUp Run: a seta dourada do TreinoUp saindo de uma trilha (mobile/assets/brand/run-mark.svg). */
export function RunMark({ size = 40, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22222B" />
          <stop offset="1" stopColor="#0D0D11" />
        </linearGradient>
        <linearGradient id={`${id}-gd`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE29A" />
          <stop offset="1" stopColor="#E8A33D" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="27" fill={`url(#${id}-bg)`} />
      <path d="M30 92C46 92 44 70 60 70C74 70 76 56 76 44" fill="none" stroke="#FFF1CC" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="92" r="9" fill={`url(#${id}-gd)`} />
      <path d="M60 42L76 26L92 42M76 28V52" fill="none" stroke={`url(#${id}-gd)`} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
