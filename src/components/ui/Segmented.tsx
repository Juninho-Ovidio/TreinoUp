"use client";

import { cn } from "@/lib/cn";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: { value: T; label: string; locked?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex gap-1 overflow-x-auto rounded-full bg-surface-2 p-1 [scrollbar-width:none]", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 flex-1 shrink-0 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-colors",
            o.value === value ? "bg-surface text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
          {o.locked && <span className="ml-1 text-[10px] font-bold uppercase text-brand">Pro</span>}
        </button>
      ))}
    </div>
  );
}

/** Lista de opções grandes (onboarding, preferências). */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; title: string; hint?: string; icon?: React.ReactNode }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl border-2 bg-surface px-4 py-3.5 text-left transition-[border-color,background,transform] active:scale-[0.99]",
              on ? "border-brand bg-brand-soft" : "border-transparent shadow-card hover:border-line",
            )}
          >
            {o.icon && <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", on ? "bg-brand text-on-brand" : "bg-surface-2 text-muted")}>{o.icon}</span>}
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-fg">{o.title}</span>
              {o.hint && <span className="block text-sm text-muted">{o.hint}</span>}
            </span>
            <span className={cn("h-5 w-5 shrink-0 rounded-full border-2", on ? "border-brand bg-brand shadow-[inset_0_0_0_3px_var(--surface)]" : "border-line")} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
