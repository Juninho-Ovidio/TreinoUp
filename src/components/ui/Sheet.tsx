"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** "sheet" sobe do rodapé no celular; "dialog" fica centralizado. */
  variant?: "sheet" | "dialog";
}

/** Painel modal acessível: fecha com Esc, clique fora ou botão; devolve o foco ao fechar. */
export function Sheet({ open, onClose, title, children, className, variant = "sheet" }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => {
      const target = panel.current?.querySelector<HTMLElement>("[autofocus],input,button:not([data-close])") ?? panel.current;
      target?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      lastFocus.current?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-[70] flex justify-center", variant === "sheet" ? "items-end sm:items-center" : "items-center p-4")}>
      <div className="absolute inset-0 bg-black/40 animate-fade" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md bg-surface text-fg shadow-card focus:outline-none",
          variant === "sheet"
            ? "max-h-[92dvh] overflow-y-auto rounded-t-[28px] px-5 pt-3 pb-safe animate-sheet sm:rounded-[28px] sm:pb-6"
            : "rounded-[28px] p-6 animate-enter",
          className,
        )}
      >
        {variant === "sheet" && <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden />}
        {title && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">{title}</h2>
            <button data-close onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
