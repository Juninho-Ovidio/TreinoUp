"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle, Skeleton } from "@/components/ui/Card";
import { Field, Input, inputClass } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/components/app/AppProvider";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { latestWeight, listAssessments, saveAssessment } from "@/data/body";
import { errorMessage } from "@/data/base";
import { ANAMNESIS, PERIMETERS, SKINFOLDS, computeAssessment, fatBand, type AnamnesisKey, type PerimeterKey, type SkinfoldKey } from "@/lib/assessment";
import { today } from "@/lib/dates";
import { fmt, fmt1, parseNum } from "@/lib/format";
import type { BodyAssessment, Sex } from "@/lib/types";
import { cn } from "@/lib/cn";

type Nums<K extends string> = Record<K, string>;
const blank = <K extends string>(list: readonly { key: K }[]) => Object.fromEntries(list.map((x) => [x.key, ""])) as Nums<K>;
const fromValues = <K extends string>(list: readonly { key: K }[], v: Partial<Record<K, number | string>>) =>
  Object.fromEntries(list.map((x) => [x.key, v[x.key] != null ? String(v[x.key]).replace(".", ",") : ""])) as Nums<K>;

export function AssessmentForm() {
  const router = useRouter();
  const toast = useToast();
  const { profile } = useApp();
  const editId = useSearchParams().get("id");
  const list = useQuery(keys.assessments, listAssessments);
  const weight = useQuery(keys.latestWeight, latestWeight);

  const [date, setDate] = useState(today());
  const [sex, setSex] = useState<Sex>(profile.sex ?? "male");
  const [age, setAge] = useState(profile.age ? String(profile.age) : "");
  const [height, setHeight] = useState(profile.height_cm ? String(profile.height_cm).replace(".", ",") : "");
  const [kg, setKg] = useState("");
  const [folds, setFolds] = useState(() => blank(SKINFOLDS));
  const [perims, setPerims] = useState(() => blank(PERIMETERS));
  const [answers, setAnswers] = useState<Record<AnamnesisKey, string>>(() => Object.fromEntries(ANAMNESIS.map((q) => [q.key, ""])) as Record<AnamnesisKey, string>);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preenche uma vez: a avaliação em edição, ou dados do perfil + anamnese da última avaliação.
  useEffect(() => {
    if (ready || list.loading || weight.loading) return;
    const rows = list.data ?? [];
    const editing: BodyAssessment | undefined = editId ? rows.find((r) => r.id === editId) : undefined;
    const base = editing ?? rows[0];
    if (editing) {
      setDate(editing.assessed_on);
      setSex(editing.sex);
      setAge(String(editing.age));
      setHeight(String(editing.height_cm).replace(".", ","));
      setKg(String(editing.weight_kg).replace(".", ","));
      setFolds(fromValues(SKINFOLDS, editing.skinfolds_mm));
      setPerims(fromValues(PERIMETERS, editing.perimeters_cm));
    } else if (weight.data) {
      setKg(String(weight.data.weight_kg).replace(".", ","));
    }
    if (base) setAnswers((a) => ({ ...a, ...base.anamnesis }));
    setReady(true);
  }, [ready, list.loading, weight.loading, list.data, weight.data, editId]);

  const toNums = <K extends string>(v: Nums<K>) =>
    Object.fromEntries(Object.entries(v).flatMap(([k, s]) => (parseNum(s as string) != null ? [[k, parseNum(s as string)]] : []))) as Partial<Record<K, number>>;

  const preview = useMemo(() => {
    const w = parseNum(kg);
    const h = parseNum(height);
    const a = parseNum(age);
    if (!w || !h || !a) return null;
    return computeAssessment({ sex, age: a, weightKg: w, heightCm: h, skinfolds: toNums<SkinfoldKey>(folds) });
  }, [sex, age, height, kg, folds]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    const w = parseNum(kg);
    const h = parseNum(height);
    const a = parseNum(age);
    if (w == null || w < 25 || w > 400) err.kg = "Informe um peso entre 25 e 400 kg.";
    if (h == null || h < 100 || h > 250) err.height = "Informe a altura em cm (100 a 250).";
    if (a == null || a < 10 || a > 120 || !Number.isInteger(a)) err.age = "Informe a idade em anos.";
    for (const s of SKINFOLDS) {
      const v = parseNum(folds[s.key]);
      if (folds[s.key].trim() && (v == null || v <= 0 || v > 80)) err[`f_${s.key}`] = "Valor entre 1 e 80 mm.";
    }
    for (const p of PERIMETERS) {
      const v = parseNum(perims[p.key]);
      if (perims[p.key].trim() && (v == null || v <= 0 || v > 250)) err[`p_${p.key}`] = "Valor entre 1 e 250 cm.";
    }
    setErrors(err);
    if (Object.keys(err).length) return toast.error("Confira os campos destacados.");

    setBusy(true);
    try {
      await saveAssessment({
        assessed_on: date,
        sex,
        age: a!,
        weight_kg: w!,
        height_cm: h!,
        skinfolds_mm: toNums<SkinfoldKey>(folds),
        perimeters_cm: toNums<PerimeterKey>(perims),
        anamnesis: Object.fromEntries(Object.entries(answers).filter(([, v]) => v.trim())) as Partial<Record<AnamnesisKey, string>>,
      });
      invalidate(keys.assessments, keys.weights, keys.latestWeight, keys.charts);
      toast.success("Avaliação salva.");
      router.push("/progresso/avaliacao");
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex flex-col gap-4">
        <PageHeader title={editId ? "Editar avaliação" : "Nova avaliação"} back />
        <Skeleton className="h-96 rounded-[var(--radius-card)]" />
      </main>
    );
  }

  const band = preview?.fatPct != null ? fatBand(sex, preview.fatPct) : null;

  return (
    <main className="flex flex-col gap-4 pb-6">
      <PageHeader title={editId ? "Editar avaliação" : "Nova avaliação"} back />

      <form onSubmit={save} className="flex flex-col gap-4" noValidate>
        <SectionTitle>Dados</SectionTitle>
        <Card className="flex flex-col gap-4">
          <Field label="Data">{(id) => <Input id={id} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Segmented
            label="Sexo"
            value={sex}
            onChange={setSex}
            options={[
              { value: "male", label: "Masculino" },
              { value: "female", label: "Feminino" },
            ]}
          />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Peso" error={errors.kg}>
              {(id) => <Input id={id} value={kg} onChange={(e) => setKg(e.target.value)} inputMode="decimal" suffix="kg" invalid={!!errors.kg} />}
            </Field>
            <Field label="Altura" error={errors.height}>
              {(id) => <Input id={id} value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" suffix="cm" invalid={!!errors.height} />}
            </Field>
            <Field label="Idade" error={errors.age}>
              {(id) => <Input id={id} value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" suffix="anos" invalid={!!errors.age} />}
            </Field>
          </div>
        </Card>

        <SectionTitle>Dobras cutâneas (mm)</SectionTitle>
        <Card className="flex flex-col gap-4">
          <p className="text-[13px] text-muted">Protocolo de Jackson e Pollock: preencha as 7 dobras para calcular o percentual de gordura.</p>
          <div className="grid grid-cols-2 gap-3">
            {SKINFOLDS.map((s) => (
              <Field key={s.key} label={s.label} error={errors[`f_${s.key}`]}>
                {(id) => (
                  <Input
                    id={id}
                    value={folds[s.key]}
                    onChange={(e) => setFolds((v) => ({ ...v, [s.key]: e.target.value }))}
                    inputMode="decimal"
                    suffix="mm"
                    invalid={!!errors[`f_${s.key}`]}
                  />
                )}
              </Field>
            ))}
          </div>
        </Card>

        <SectionTitle>Perímetros (cm)</SectionTitle>
        <Card>
          <div className="grid grid-cols-2 gap-3">
            {PERIMETERS.map((p) => (
              <Field key={p.key} label={p.label} error={errors[`p_${p.key}`]}>
                {(id) => (
                  <Input
                    id={id}
                    value={perims[p.key]}
                    onChange={(e) => setPerims((v) => ({ ...v, [p.key]: e.target.value }))}
                    inputMode="decimal"
                    suffix="cm"
                    invalid={!!errors[`p_${p.key}`]}
                  />
                )}
              </Field>
            ))}
          </div>
        </Card>

        <SectionTitle>Anamnese</SectionTitle>
        <Card className="flex flex-col gap-4">
          {ANAMNESIS.map((q) => (
            <Field key={q.key} label={q.label}>
              {(id) => (
                <textarea
                  id={id}
                  rows={2}
                  maxLength={1000}
                  value={answers[q.key]}
                  placeholder={q.placeholder}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                  className={cn(inputClass, "h-auto min-h-[3rem] resize-y py-3 leading-snug")}
                />
              )}
            </Field>
          ))}
        </Card>

        {preview && (
          <Card className="grid grid-cols-3 gap-2 text-center" aria-live="polite">
            <div>
              <p className="text-xs text-muted">IMC</p>
              <p className="text-lg font-extrabold">{fmt(preview.bmi, 1)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Gordura</p>
              <p className="text-lg font-extrabold" style={band ? { color: band.color } : undefined}>
                {preview.fatPct != null ? `${fmt(preview.fatPct, 1)}%` : "–"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">TMB</p>
              <p className="text-lg font-extrabold">{fmt1(preview.bmr)}</p>
            </div>
          </Card>
        )}

        <Button type="submit" size="lg" block loading={busy}>
          Salvar avaliação
        </Button>
      </form>
    </main>
  );
}
