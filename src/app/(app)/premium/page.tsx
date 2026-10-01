"use client";

import { Check, Crown } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/components/app/AppProvider";
import { PLAN_FEATURES } from "@/lib/plans";

export default function PremiumPage() {
  const toast = useToast();
  const { isPremium } = useApp();

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="Planos" back />

      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-fg text-carbs">
          <Crown className="h-8 w-8" />
        </span>
        <h2 className="text-2xl font-extrabold tracking-tight">TreinoUp Premium</h2>
        <p className="max-w-[32ch] text-sm text-muted">Mais análises, histórico completo e o Assistente Nutri.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Gratuito</p>
            <p className="text-2xl font-extrabold">R$ 0</p>
          </div>
          <FeatureList items={PLAN_FEATURES.free} />
          {!isPremium && <p className="rounded-full bg-surface-2 py-2 text-center text-sm font-semibold text-muted">Seu plano atual</p>}
        </Card>
        <Card className="flex flex-col gap-3 ring-2 ring-brand">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-strong">Premium</p>
            <p className="text-2xl font-extrabold">Em breve</p>
          </div>
          <p className="text-sm text-muted">Tudo do gratuito, mais:</p>
          <FeatureList items={PLAN_FEATURES.premium} />
          {isPremium ? (
            <p className="rounded-full bg-brand-soft py-2 text-center text-sm font-semibold text-brand-strong">Seu plano atual</p>
          ) : (
            <Button onClick={() => toast.info("A assinatura Premium ainda não está disponível. Avisaremos quando abrir.")}>Quero ser avisado</Button>
          )}
        </Card>
      </div>
    </main>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((f) => (
        <li key={f} className="flex items-start gap-2 text-sm">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
          {f}
        </li>
      ))}
    </ul>
  );
}
