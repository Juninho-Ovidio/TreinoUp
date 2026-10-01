import { cn } from "@/lib/cn";

export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="tu-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22222B" />
          <stop offset="1" stopColor="#0D0D11" />
        </linearGradient>
        <linearGradient id="tu-gd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE29A" />
          <stop offset="1" stopColor="#E8A33D" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="27" fill="url(#tu-bg)" />
      <path
        d="M32 54V68C32 84 44 96 60 96C76 96 88 84 88 68V54"
        fill="none"
        stroke="#FFF1CC"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 38L60 22L76 38M60 24V72"
        fill="none"
        stroke="url(#tu-gd)"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Logo horizontal: símbolo + "TreinoUp" + "TREINO E DIETA". `size` é a altura do símbolo. */
export function Logo({ size = 56, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: size * 0.26 }}>
      <LogoMark size={size} />
      <span className="flex flex-col" style={{ fontFamily: "var(--font-jakarta), var(--font-manrope), sans-serif" }}>
        <span className="font-extrabold text-fg" style={{ fontSize: size * 0.62, lineHeight: 1, letterSpacing: "-0.03em" }}>
          Treino<span style={{ color: "var(--logo-up)" }}>Up</span>
        </span>
        <span className="font-semibold uppercase" style={{ fontSize: size * 0.17, letterSpacing: "0.13em", marginTop: size * 0.1, color: "var(--logo-tag)" }}>
          Treino e dieta
        </span>
      </span>
    </span>
  );
}
