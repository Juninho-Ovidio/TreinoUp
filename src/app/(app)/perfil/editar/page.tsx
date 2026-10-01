"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/components/app/AppProvider";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { keys, useLatestWeight } from "@/hooks/useDay";
import { getGoalFor, recalcGoals, updateProfile } from "@/data/profile";
import { errorMessage } from "@/data/base";
import { ACTIVITY_LABELS, GOAL_LABELS, PACE_LABELS } from "@/lib/goals";
import type { ActivityLevel, Goal, Pace, Sex } from "@/lib/types";
import { parseNum } from "@/lib/format";
import { today } from "@/lib/dates";

export default function EditProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const { profile, setProfile } = useApp();
  const weight = useLatestWeight();
  const goal = useQuery(keys.goal(today()), () => getGoalFor(today()));

  const [name, setName] = useState(profile.name ?? "");
  const [age, setAge] = useState(String(profile.age ?? ""));
  const [sex, setSex] = useState<Sex>(profile.sex ?? "female");
  const [height, setHeight] = useState(String(profile.height_cm ?? "").replace(".", ","));
  const [target, setTarget] = useState(String(profile.target_weight_kg ?? "").replace(".", ","));
  const [objective, setObjective] = useState<Goal>(profile.goal ?? "maintain");
  const [activity, setActivity] = useState<ActivityLevel>(profile.activity_level ?? "moderate");
  const [pace, setPace] = useState<Pace>(profile.pace);
  const [recalc, setRecalc] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const shouldRecalc = recalc ?? !goal.data?.is_manual;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const a = parseNum(age), h = parseNum(height), t = parseNum(target);
    if (name.trim().length < 2) errs.name = "Informe seu nome.";
    if (!a || a < 13 || a > 110) errs.age = "Entre 13 e 110.";
    if (!h || h < 100 || h > 250) errs.height = "Entre 100 e 250 cm.";
    if (!t || t < 25 || t > 400) errs.target = "Entre 25 e 400 kg.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const p = await updateProfile({ name: name.trim(), age: a!, sex, height_cm: h!, target_weight_kg: t!, goal: objective, activity_level: activity, pace });
      setProfile(p);
      if (shouldRecalc) {
        await recalcGoals(p, weight.data?.weight_kg ?? p.start_weight_kg ?? 70);
        invalidate("goal:");
      }
      toast.success(shouldRecalc ? "Dados salvos e metas recalculadas." : "Dados salvos.");
      router.back();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader title="Editar informações" back />
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <Field label="Nome" error={errors.name}>
            {(id, d) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} aria-describedby={d} invalid={!!errors.name} />}
          </Field>
          <Segmented label="Sexo" value={sex} onChange={setSex} options={[{ value: "female", label: "Feminino" }, { value: "male", label: "Masculino" }]} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Idade" error={errors.age}>
              {(id, d) => <Input id={id} value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" suffix="anos" aria-describedby={d} invalid={!!errors.age} />}
            </Field>
            <Field label="Altura" error={errors.height}>
              {(id, d) => <Input id={id} value={height} onChange={(e) => setHeight(e.target.value)} inputMode="decimal" suffix="cm" aria-describedby={d} invalid={!!errors.height} />}
            </Field>
          </div>
        </Card>
        <Card className="flex flex-col gap-4">
          <Field label="Objetivo">
            {(id) => (
              <Select id={id} value={objective} onChange={(e) => setObjective(e.target.value as Goal)}>
                {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                  <option key={g} value={g}>
                    {GOAL_LABELS[g]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Nível de atividade">
            {(id) => (
              <Select id={id} value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTIVITY_LABELS[a].title}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta de peso" error={errors.target}>
              {(id, d) => <Input id={id} value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" suffix="kg" aria-describedby={d} invalid={!!errors.target} />}
            </Field>
            <Field label="Velocidade">
              {(id) => (
                <Select id={id} value={pace} onChange={(e) => setPace(e.target.value as Pace)} disabled={objective !== "lose" && objective !== "gain"}>
                  {(Object.keys(PACE_LABELS) as Pace[]).map((p) => (
                    <option key={p} value={p}>
                      {PACE_LABELS[p].title}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
        </Card>
        <label className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card">
          <input type="checkbox" checked={shouldRecalc} onChange={(e) => setRecalc(e.target.checked)} className="h-5 w-5 accent-[var(--brand)]" />
          <span className="text-sm">
            <b>Recalcular metas</b> com os novos dados
            {goal.data?.is_manual && <span className="block text-muted">Suas metas atuais foram definidas manualmente.</span>}
          </span>
        </label>
        <Button type="submit" size="lg" block loading={busy}>
          Salvar
        </Button>
      </form>
    </main>
  );
}
