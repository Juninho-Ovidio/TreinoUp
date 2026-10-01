"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Dumbbell, House, Plus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "./AppProvider";

/** Cinco colunas iguais; a do meio (índice 2) é o botão de registrar. */
const SLOTS = [
  { href: "/inicio", label: "Início", icon: House },
  { href: "/diario", label: "Diário", icon: BookOpen },
  null,
  { href: "/treinos", label: "Treinos", icon: Dumbbell },
  { href: "/progresso", label: "Progresso", icon: TrendingUp },
] as const;

const tap = () => {
  try {
    navigator.vibrate?.(8);
  } catch {
    // sem vibração no aparelho: segue normalmente
  }
};

/**
 * Dock flutuante em grafite (identidade TreinoUp): vidro escuro, indicador dourado que desliza
 * entre as abas e um botão central em destaque para registrar (a ação principal do app).
 */
export function BottomNav() {
  const pathname = usePathname();
  const { openSheet, sheet } = useApp();
  const adding = sheet === "add";

  const activeIndex = SLOTS.findIndex((s) => s && (pathname === s.href || pathname.startsWith(s.href + "/")));

  return (
    <nav aria-label="Navegação principal" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto relative mx-auto max-w-md rounded-[28px] border border-white/10 bg-[#14141a]/90 bg-[radial-gradient(80%_160%_at_0%_100%,rgba(232,163,61,0.16),transparent_62%),radial-gradient(80%_160%_at_100%_100%,rgba(232,163,61,0.16),transparent_62%)] dark:border-white/[0.14] dark:bg-[#1d1d26]/90 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {/* brilho dourado sutil na borda de cima */}
        <span className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#ffd27a]/50 to-transparent" aria-hidden />

        {/* Indicador que desliza até a aba ativa */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-1.5 left-0 w-1/5 px-1 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]",
            activeIndex < 0 && "opacity-0",
          )}
          style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
        >
          <span className="block h-full w-full rounded-[20px] bg-white/[0.08] ring-1 ring-inset ring-white/[0.06]" />
        </span>

        <ul className="relative grid grid-cols-5 items-center">
          {SLOTS.map((item, i) => {
            if (!item) {
              return (
                <li key="add" className="flex justify-center">
                  <button
                    onClick={() => {
                      tap();
                      openSheet(adding ? null : "add");
                    }}
                    aria-label={adding ? "Fechar menu de registro" : "Registrar"}
                    aria-expanded={adding}
                    className="grid h-[52px] w-[52px] place-items-center rounded-[18px] bg-gradient-to-b from-[#f7c870] to-[#e8a33d] text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform duration-200 active:scale-90"
                  >
                    <Plus className={cn("h-7 w-7 transition-transform duration-300", adding && "rotate-[135deg]")} strokeWidth={2.8} aria-hidden style={{ filter: "drop-shadow(0 1px 1px rgba(120,70,0,0.35))" }} />
                  </button>
                </li>
              );
            }
            const active = i === activeIndex;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={tap}
                  aria-current={active ? "page" : undefined}
                  className="flex h-[60px] flex-col items-center justify-center gap-1 rounded-[20px] transition-transform active:scale-90"
                >
                  <Icon
                    className={cn("h-[22px] w-[22px] transition-all duration-300", active ? "-translate-y-px text-[#ffd27a]" : "text-white/55")}
                    strokeWidth={active ? 2.4 : 1.9}
                    aria-hidden
                  />
                  <span className={cn("text-[10.5px] font-semibold leading-none tracking-wide transition-colors duration-300", active ? "text-[#ffe29a]" : "text-white/55")}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
