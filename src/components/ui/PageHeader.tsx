"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { HeaderBar, headerBtn } from "./HeaderBar";

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: boolean | string; action?: React.ReactNode }) {
  const router = useRouter();
  return (
    <HeaderBar>
      {back && (
        <button onClick={() => (typeof back === "string" ? router.push(back) : router.back())} className={headerBtn} aria-label="Voltar">
          <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
        </button>
      )}
      <div className="min-w-0 flex-1 pl-1">
        <h1 className="truncate text-[19px] font-extrabold leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-[13px] text-white/60">{subtitle}</p>}
      </div>
      {action}
    </HeaderBar>
  );
}
