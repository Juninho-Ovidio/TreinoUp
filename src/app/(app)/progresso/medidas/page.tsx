"use client";

import { useMemo, useState } from "react";
import { Ruler, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, SectionTitle, Skeleton } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { LineChart } from "@/components/charts/LineChart";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { deleteMeasurement, listMeasurements, saveMeasurement } from "@/data/body";
import { errorMessage } from "@/data/base";
import { addDays, numericDate, today } from "@/lib/dates";
import { fmt1, parseNum, signed } from "@/lib/format";
import { MEASUREMENT_FIELDS, type BodyMeasurement, type MeasurementField } from "@/lib/types";
import { cn } from "@/lib/cn";

const LABELS: Record<MeasurementField, { label: string; unit: string }> = {
  weight_kg: { label: "Peso", unit: "kg" },
  waist_cm: { label: "Cintura", unit: "cm" },
  abdomen_cm: { label: "Abdômen", unit: "cm" },
  chest_cm: { label: "Peito", unit: "cm" },
  arm_cm: { label: "Braço", unit: "cm" },
  hip_cm: { label: "Quadril", unit: "cm" },
  thigh_cm: { label: "Coxa", unit: "cm" },
};

const empty = () => Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f, ""])) as Record<MeasurementField, string>;

export default function MeasurementsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = useQuery(keys.measurements, listMeasurements);
  const [date, setDate] = useState(today());
  const [vals, setVals] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [field, setField] = useState<MeasurementField>("waist_cm");

  const rows = list.data ?? [];

  /** Hoje (último registro) vs o registro mais próximo de 30 dias antes dele. */
  const comparison = useMemo(() => {
    if (!rows.length) return null;
    const latest = rows.at(-1)!;
    const ref = addDays(latest.entry_date, -30);
    const older = [...rows].reverse().find((r) => r.entry_date <= ref) ?? null;
    return { latest, older };
  }, [rows]);

  const series = rows.filter((r) => r[field] != null).map((r) => ({ date: r.entry_date, value: r[field] as number }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const values: Partial<Record<MeasurementField, number | null>> = {};
    let any = false;
    for (const f of MEASUREMENT_FIELDS) {
      const v = parseNum(vals[f]);
      if (vals[f].trim() && v == null) return toast.error(`${LABELS[f].label}: número inválido.`);
      if (v != null) {
        values[f] = v;
        any = true;
      }
    }
    if (!any) return toast.error("Preencha pelo menos uma medida.");
    setBusy(true);
    try {
      await saveMeasurement(date, values);
      invalidate(keys.measurements, keys.weights, keys.latestWeight, keys.charts);
      setVals(empty());
      toast.success("Medidas salvas.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: BodyMeasurement) {
    if (!(await confirm({ title: "Excluir medidas?", text: `Registro de ${numericDate(r.entry_date)}.`, confirmLabel: "Excluir", danger: true }))) return;
    try {
      await deleteMeasurement(r.id);
      invalidate(keys.measurements);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="Medidas corporais" back />

      {/* Comparação */}
      {list.loading ? (
        <Skeleton className="h-40 rounded-[var(--radius-card)]" />
      ) : comparison ? (
        <Card className="p-0">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 px-5 pt-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            <span />
            <span className="text-right">Hoje</span>
            <span className="text-right">30 dias atrás</span>
            <span className="w-14 text-right">Dif.</span>
          </div>
          <ul className="divide-y divide-line px-5 pb-2">
            {MEASUREMENT_FIELDS.map((f) => {
              const now = comparison.latest[f];
              const before = comparison.older?.[f] ?? null;
              if (now == null && before == null) return null;
              const d = now != null && before != null ? now - before : null;
              return (
                <li key={f} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 py-2.5 text-sm">
                  <span className="font-semibold">{LABELS[f].label}</span>
                  <span className="text-right font-bold">{now != null ? `${fmt1(now)} ${LABELS[f].unit}` : "–"}</span>
                  <span className="text-right text-muted">{before != null ? `${fmt1(before)}` : "–"}</span>
                  <span className={cn("w-14 text-right font-bold", d != null && d < 0 && "text-brand-strong")}>{d != null ? signed(d) : "–"}</span>
                </li>
              );
            })}
          </ul>
          <p className="border-t border-line px-5 py-2.5 text-xs text-muted">
            Último registro em {numericDate(comparison.latest.entry_date)}
            {comparison.older ? `, comparado a ${numericDate(comparison.older.entry_date)}.` : ". Ainda não há registro de 30 dias antes."}
          </p>
        </Card>
      ) : (
        <Card>
          <EmptyState icon={<Ruler className="h-6 w-6" />} title="Nenhuma medida ainda" text="Meça sempre no mesmo horário, com a fita firme mas sem apertar." />
        </Card>
      )}

      {/* Gráfico */}
      {series.length >= 2 && (
        <Card className="flex flex-col gap-3">
          <Segmented label="Medida" value={field} onChange={setField} options={MEASUREMENT_FIELDS.map((f) => ({ value: f, label: LABELS[f].label }))} />
          <LineChart data={series} unit={LABELS[field].unit} color="var(--protein)" label={`Evolução de ${LABELS[field].label}`} />
        </Card>
      )}
      {rows.length > 0 && series.length < 2 && (
        <Card className="flex flex-col gap-3">
          <Segmented label="Medida" value={field} onChange={setField} options={MEASUREMENT_FIELDS.map((f) => ({ value: f, label: LABELS[f].label }))} />
          <p className="py-6 text-center text-sm text-muted">Registre {LABELS[field].label.toLowerCase()} pelo menos duas vezes para ver o gráfico.</p>
        </Card>
      )}

      {/* Formulário */}
      <SectionTitle className="mt-2">Novo registro</SectionTitle>
      <Card>
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="Data">{(id) => <Input id={id} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />}</Field>
          <div className="grid grid-cols-2 gap-3">
            {MEASUREMENT_FIELDS.map((f) => (
              <Field key={f} label={LABELS[f].label}>
                {(id) => <Input id={id} value={vals[f]} onChange={(e) => setVals((v) => ({ ...v, [f]: e.target.value }))} inputMode="decimal" suffix={LABELS[f].unit} />}
              </Field>
            ))}
          </div>
          <Button type="submit" size="lg" block loading={busy}>
            Salvar medidas
          </Button>
        </form>
      </Card>

      {rows.length > 0 && (
        <>
          <SectionTitle className="mt-2">Histórico</SectionTitle>
          <Card className="p-2">
            <ul className="divide-y divide-line">
              {[...rows].reverse().map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="w-20 shrink-0 text-sm font-bold">{numericDate(r.entry_date)}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                    {MEASUREMENT_FIELDS.filter((f) => r[f] != null)
                      .map((f) => `${LABELS[f].label} ${fmt1(r[f])}`)
                      .join(" · ")}
                  </span>
                  <button onClick={() => remove(r)} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-danger" aria-label={`Excluir registro de ${numericDate(r.entry_date)}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </main>
  );
}
