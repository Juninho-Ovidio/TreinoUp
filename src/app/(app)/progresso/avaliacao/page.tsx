"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { headerBtn } from "@/components/ui/HeaderBar";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, SectionTitle, Skeleton } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { LineChart } from "@/components/charts/LineChart";
import { AssessmentView } from "@/components/app/Assessment";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { deleteAssessment, listAssessments } from "@/data/body";
import { errorMessage } from "@/data/base";
import { computeAssessment } from "@/lib/assessment";
import { numericDate } from "@/lib/dates";
import { fmt, fmt1 } from "@/lib/format";
import type { BodyAssessment } from "@/lib/types";
import { cn } from "@/lib/cn";

type Metric = "weight" | "fat" | "lean";

const fatOf = (a: BodyAssessment) => computeAssessment({ sex: a.sex, age: a.age, weightKg: a.weight_kg, heightCm: a.height_cm, skinfolds: a.skinfolds_mm });

export default function AssessmentPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = useQuery(keys.assessments, listAssessments);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>("weight");

  const rows = list.data ?? [];
  const index = Math.max(0, rows.findIndex((r) => r.id === selectedId));
  const current = rows[index] ?? null;
  const previous = rows[index + 1] ?? null;

  const chrono = [...rows].reverse();
  const series = chrono
    .map((a) => {
      const r = fatOf(a);
      const value = metric === "weight" ? a.weight_kg : metric === "fat" ? r.fatPct : r.leanMassKg;
      return value != null ? { date: a.assessed_on, value: Math.round(value * 10) / 10 } : null;
    })
    .filter((p): p is { date: string; value: number } => p != null);

  async function remove(a: BodyAssessment) {
    if (!(await confirm({ title: "Excluir avaliação?", text: `Avaliação de ${numericDate(a.assessed_on)}.`, confirmLabel: "Excluir", danger: true }))) return;
    try {
      await deleteAssessment(a.id);
      setSelectedId(null);
      invalidate(keys.assessments);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <PageHeader
        title={index === 0 ? "Última avaliação" : "Avaliação"}
        subtitle={current ? numericDate(current.assessed_on) : undefined}
        back
        action={
          <Link href="/progresso/avaliacao/nova" className={headerBtn} aria-label="Nova avaliação">
            <Plus className="h-5 w-5" strokeWidth={2.4} />
          </Link>
        }
      />

      {list.loading ? (
        <Skeleton className="h-96 rounded-[var(--radius-card)]" />
      ) : !current ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="Nenhuma avaliação ainda"
            text="Registre peso, altura, dobras cutâneas e perímetros para ver sua composição corporal."
            action={<ButtonLink href="/progresso/avaliacao/nova">Fazer avaliação</ButtonLink>}
          />
        </Card>
      ) : (
        <>
          <AssessmentView key={current.id} a={current} previous={previous} />

          <div className="grid grid-cols-2 gap-3">
            <ButtonLink href={`/progresso/avaliacao/nova?id=${current.id}`} variant="secondary">
              <Pencil className="h-4 w-4" /> Editar
            </ButtonLink>
            <button
              type="button"
              onClick={() => remove(current)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface text-[15px] font-semibold text-danger"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </div>

          {rows.length >= 2 && (
            <>
              <SectionTitle className="mt-2">Evolução</SectionTitle>
              <Card className="flex flex-col gap-3">
                <Segmented
                  label="Medida"
                  value={metric}
                  onChange={setMetric}
                  options={[
                    { value: "weight", label: "Peso" },
                    { value: "fat", label: "Gordura" },
                    { value: "lean", label: "Massa magra" },
                  ]}
                />
                {series.length >= 2 ? (
                  <LineChart data={series} unit={metric === "fat" ? "%" : "kg"} color="var(--protein)" label="Evolução das avaliações" />
                ) : (
                  <p className="py-6 text-center text-sm text-muted">Faltam avaliações com as 7 dobras para este gráfico.</p>
                )}
              </Card>
            </>
          )}

          <SectionTitle className="mt-2">Histórico</SectionTitle>
          <Card className="p-2">
            <ul className="divide-y divide-line">
              {rows.map((a) => {
                const r = fatOf(a);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(a.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left", a.id === current.id && "bg-surface-2")}
                    >
                      <span className="w-24 shrink-0 font-bold">{numericDate(a.assessed_on)}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                        {fmt1(a.weight_kg)} kg{r.fatPct != null && ` · ${fmt(r.fatPct, 1)}% gordura`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </main>
  );
}
