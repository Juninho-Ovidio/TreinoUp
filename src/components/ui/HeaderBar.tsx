import { cn } from "@/lib/cn";

/** Botão redondo-quadrado para dentro do cabeçalho escuro (voltar, perfil, ações). */
export const headerBtn =
  "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10 text-white transition-transform hover:bg-white/15 active:scale-95";

/** Botão de contorno dourado (ações do cabeçalho do Início). */
export const headerOutlineBtn =
  "grid h-10 w-10 shrink-0 place-items-center rounded-xl border-[1.5px] border-[#ffd27a]/70 text-[#ffd27a] transition-all hover:bg-[#ffd27a]/10 active:scale-95";

/**
 * Cabeçalho flutuante no mesmo estilo do dock inferior: pílula grafite com vidro,
 * borda sutil e fio dourado no topo. O texto interno é sempre claro (o fundo é escuro nos dois temas).
 */
export function HeaderBar({ children, className, sticky = true }: { children: React.ReactNode; className?: string; sticky?: boolean }) {
  return (
    <header
      className={cn(
        "relative z-30 mb-3 mt-[max(0.5rem,env(safe-area-inset-top))] flex items-center gap-2.5 rounded-[26px] border border-white/10 bg-[#14141a]/90 bg-[radial-gradient(80%_160%_at_0%_100%,rgba(232,163,61,0.16),transparent_62%),radial-gradient(80%_160%_at_100%_100%,rgba(232,163,61,0.16),transparent_62%)] px-3 py-2.5 text-white",
        "shadow-[0_14px_32px_-14px_rgba(0,0,0,0.55)] backdrop-blur-xl dark:border-white/[0.14] dark:bg-[#1d1d26]/90",
        sticky && "sticky top-[max(0.5rem,env(safe-area-inset-top))]",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#ffd27a]/50 to-transparent" aria-hidden />
      {children}
    </header>
  );
}
