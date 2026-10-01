"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Bike, Check, ChevronLeft, Dumbbell, Flame, Footprints, Gauge, Rabbit, Scale, Sofa, Turtle, TrendingDown, TrendingUp, Repeat } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ChoiceList, Segmented } from "@/components/ui/Segmented";
import { Ring } from "@/components/ui/Progress";
import { LogoMark } from "@/components/app/Logo";
import { useToast } from "@/components/ui/Toast";
import { completeOnboarding } from "@/data/profile";
import { errorMessage } from "@/data/base";
import { ACTIVITY_LABELS, computeTargets, GOAL_LABELS, kcalFromMacros, PACE_LABELS } from "@/lib/goals";
import type { ActivityLevel, Goal, Pace, Sex } from "@/lib/types";
import { fmt, parseNum } from "@/lib/format";
import { cn } from "@/lib/cn";

type Step = "intro" | "about" | "goal" | "activity" | "target" | "pace" | "estimate" | "done";

export function Onboarding({ initialName }: { initialName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>("intro");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(initialName);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("female");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [target, setTarget] = useState("");
  const [pace, setPace] = useState<Pace>("moderate");
  const [manual, setManual] = useState<{ p: string; c: string; f: string } | null>(null);

  const needsPace = goal === "lose" || goal === "gain";
  const steps: Step[] = ["intro", "about", "goal", "activity", "target", ...(needsPace ? (["pace"] as Step[]) : []), "estimate", "done"];
  const index = steps.indexOf(step);

  const targets = useMemo(() => {
    const a = parseNum(age), h = parseNum(height), w = parseNum(weight);
    if (!a || !h || !w || !goal || !activity) return null;
    return computeTargets({ sex, age: a, heightCm: h, weightKg: w, activity, goal, pace });
  }, [age, height, weight, sex, goal, activity, pace]);

  const finalMacros = useMemo(() => {
    if (!targets) return null;
    if (!manual) return { kcal: targets.kcal, protein_g: targets.protein_g, carbs_g: targets.carbs_g, fat_g: targets.fat_g };
    const p = parseNum(manual.p) ?? 0, c = parseNum(manual.c) ?? 0, f = parseNum(manual.f) ?? 0;
    return { kcal: kcalFromMacros(p, c, f), protein_g: Math.round(p), carbs_g: Math.round(c), fat_g: Math.round(f) };
  }, [targets, manual]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (step === "about") {
      if (name.trim().length < 2) e.name = "Informe seu nome.";
      const a = parseNum(age);
      if (!a || a < 13 || a > 110) e.age = "Idade entre 13 e 110 anos.";
      const h = parseNum(height);
      if (!h || h < 100 || h > 250) e.height = "Altura em centímetros, entre 100 e 250.";
      const w = parseNum(weight);
      if (!w || w < 25 || w > 400) e.weight = "Peso em kg, entre 25 e 400.";
    }
    if (step === "goal" && !goal) e.form = "Escolha um objetivo.";
    if (step === "activity" && !activity) e.form = "Escolha seu nível de atividade.";
    if (step === "target") {
      const t = parseNum(target), w = parseNum(weight)!;
      if (!t || t < 25 || t > 400) e.target = "Meta em kg, entre 25 e 400.";
      else if (goal === "lose" && t >= w) e.target = `Para perder peso, a meta precisa ser menor que ${fmt(w, 1)} kg.`;
      else if (goal === "gain" && t <= w) e.target = `Para ganhar massa, a meta precisa ser maior que ${fmt(w, 1)} kg.`;
    }
    if (step === "estimate" && finalMacros && finalMacros.kcal < 1000) e.form = "As metas somam menos de 1.000 kcal. Ajuste os macros.";
    if (step === "estimate" && finalMacros && finalMacros.kcal > 8000) e.form = "As metas passam de 8.000 kcal. Ajuste os macros.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function next() {
    if (!validate()) return;
    if (step === "goal" && goal === "maintain" && !target) setTarget(weight);
    if (step === "estimate") {
      if (!targets || !finalMacros) return;
      setSaving(true);
      try {
        await completeOnboarding({
          profile: {
            name: name.trim(),
            age: parseNum(age)!,
            sex,
            height_cm: parseNum(height)!,
            target_weight_kg: parseNum(target) ?? parseNum(weight)!,
            goal: goal!,
            activity_level: activity!,
            pace,
          },
          weightKg: parseNum(weight)!,
          goal: { ...finalMacros, fiber_g: targets.fiber_g, water_ml: targets.water_ml, is_manual: !!manual },
        });
      } catch (err) {
        setSaving(false);
        toast.error(errorMessage(err));
        return;
      }
      setSaving(false);
    }
    setStep(steps[index + 1]);
  }

  function back() {
    setErrors({});
    if (index > 0) setStep(steps[index - 1]);
  }

  const progress = Math.round((index / (steps.length - 1)) * 100);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
      {step !== "intro" && step !== "done" && (
        <div className="mb-6 flex items-center gap-3">
          <button onClick={back} className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Voltar">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ring-track)]" role="progressbar" aria-label="Progresso do cadastro" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div key={step} className="flex flex-1 flex-col animate-enter">
        {step === "intro" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <LogoMark size={72} />
            <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-balance">Vamos cuidar da sua evolução.</h1>
            <p className="max-w-[30ch] text-[15px] text-muted">Algumas perguntas rápidas para montar metas de calorias e macros sob medida.</p>
          </div>
        )}

        {step === "about" && (
          <>
            <StepTitle title="Sobre você" text="Usamos esses dados só para calcular suas metas." />
            <div className="flex flex-col gap-4">
              <Field label="Nome" error={errors.name}>
                {(id, d) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" aria-describedby={d} invalid={!!errors.name} />}
              </Field>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-muted">Sexo</p>
                <Segmented label="Sexo" value={sex} onChange={setSex} options={[{ value: "female", label: "Feminino" }, { value: "male", label: "Masculino" }]} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Idade" error={errors.age}>
                  {(id, d) => <Input id={id} value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" suffix="anos" aria-describedby={d} invalid={!!errors.age} />}
                </Field>
                <Field label="Altura" error={errors.height}>
                  {(id, d) => <Input id={id} value={height} onChange={(e) => setHeight(e.target.value)} inputMode="numeric" suffix="cm" aria-describedby={d} invalid={!!errors.height} />}
                </Field>
                <Field label="Peso atual" error={errors.weight} className="col-span-2">
                  {(id, d) => <Input id={id} value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" suffix="kg" aria-describedby={d} invalid={!!errors.weight} />}
                </Field>
              </div>
            </div>
          </>
        )}

        {step === "goal" && (
          <>
            <StepTitle title="Qual é o seu objetivo?" />
            <ChoiceList
              label="Objetivo"
              value={goal}
              onChange={setGoal}
              options={[
                { value: "lose", title: GOAL_LABELS.lose, hint: "Reduzir gordura com déficit calórico", icon: <TrendingDown className="h-5 w-5" /> },
                { value: "maintain", title: GOAL_LABELS.maintain, hint: "Comer o que o corpo gasta", icon: <Scale className="h-5 w-5" /> },
                { value: "gain", title: GOAL_LABELS.gain, hint: "Superávit leve com treino de força", icon: <TrendingUp className="h-5 w-5" /> },
                { value: "recomp", title: GOAL_LABELS.recomp, hint: "Perder gordura e ganhar músculo ao mesmo tempo", icon: <Repeat className="h-5 w-5" /> },
              ]}
            />
          </>
        )}

        {step === "activity" && (
          <>
            <StepTitle title="Qual é o seu nível de atividade?" text="Conte treinos e também o quanto você se movimenta no dia a dia." />
            <ChoiceList
              label="Nível de atividade"
              value={activity}
              onChange={setActivity}
              options={[
                { value: "sedentary", ...ACTIVITY_LABELS.sedentary, icon: <Sofa className="h-5 w-5" /> },
                { value: "light", ...ACTIVITY_LABELS.light, icon: <Footprints className="h-5 w-5" /> },
                { value: "moderate", ...ACTIVITY_LABELS.moderate, icon: <Bike className="h-5 w-5" /> },
                { value: "very", ...ACTIVITY_LABELS.very, icon: <Dumbbell className="h-5 w-5" /> },
                { value: "extreme", ...ACTIVITY_LABELS.extreme, icon: <Flame className="h-5 w-5" /> },
              ]}
            />
          </>
        )}

        {step === "target" && (
          <>
            <StepTitle title="Qual é a sua meta de peso?" text={`Hoje você pesa ${fmt(parseNum(weight) ?? 0, 1)} kg.`} />
            <Field label="Meta de peso" error={errors.target}>
              {(id, d) => (
                <Input id={id} value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" suffix="kg" autoFocus aria-describedby={d} invalid={!!errors.target} className="h-16 text-2xl font-bold" />
              )}
            </Field>
          </>
        )}

        {step === "pace" && (
          <>
            <StepTitle title="Em que velocidade?" text="Ritmos mais lentos são mais fáceis de manter." />
            <ChoiceList
              label="Velocidade"
              value={pace}
              onChange={setPace}
              options={(["slow", "moderate", "fast"] as Pace[]).map((p) => ({
                value: p,
                title: PACE_LABELS[p].title,
                hint: goal === "gain" ? PACE_LABELS[p].gain : PACE_LABELS[p].lose,
                icon: p === "slow" ? <Turtle className="h-5 w-5" /> : p === "moderate" ? <Gauge className="h-5 w-5" /> : <Rabbit className="h-5 w-5" />,
              }))}
            />
          </>
        )}

        {step === "estimate" && targets && finalMacros && (
          <>
            <StepTitle title="Sua estimativa inicial" text="Calculada pela equação de Mifflin-St Jeor e ajustada ao seu objetivo." />
            <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-surface p-6 shadow-card">
              <p className="text-sm font-semibold text-muted">Calorias por dia</p>
              <p className="mt-1 text-5xl font-extrabold tracking-tight">{fmt(finalMacros.kcal)}</p>
              <p className="text-sm text-muted">kcal</p>
              <div className="mt-6 grid w-full grid-cols-3 gap-3">
                <MacroBox label="Proteínas" color="var(--protein)" value={manual?.p ?? String(targets.protein_g)} editable={!!manual} onChange={(v) => setManual((m) => m && { ...m, p: v })} />
                <MacroBox label="Carboidratos" color="var(--carbs)" value={manual?.c ?? String(targets.carbs_g)} editable={!!manual} onChange={(v) => setManual((m) => m && { ...m, c: v })} />
                <MacroBox label="Gorduras" color="var(--fat)" value={manual?.f ?? String(targets.fat_g)} editable={!!manual} onChange={(v) => setManual((m) => m && { ...m, f: v })} />
              </div>
              <button
                className="mt-5 text-sm font-semibold text-brand-strong"
                onClick={() => setManual((m) => (m ? null : { p: String(targets.protein_g), c: String(targets.carbs_g), f: String(targets.fat_g) }))}
              >
                {manual ? "Voltar para o cálculo automático" : "Editar metas manualmente"}
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-muted">
              Gasto estimado de {fmt(targets.tdee)} kcal por dia. Essas metas são um ponto de partida e não substituem orientação de nutricionista ou médico.
              {targets.floored && " Aplicamos um mínimo de segurança às calorias."}
            </p>
          </>
        )}

        {step === "done" && finalMacros && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <Ring value={1} max={1} size={132} stroke={12} label="Plano concluído">
              <Check className="h-12 w-12 text-brand animate-pop" strokeWidth={3} />
            </Ring>
            <h1 className="text-[32px] font-extrabold tracking-tight">Seu plano está pronto.</h1>
            <p className="max-w-[30ch] text-[15px] text-muted">
              {fmt(finalMacros.kcal)} kcal por dia, com {finalMacros.protein_g} g de proteína. Você pode mudar isso quando quiser no perfil.
            </p>
          </div>
        )}

        {errors.form && (
          <p role="alert" className="mt-4 text-sm font-medium text-danger">
            {errors.form}
          </p>
        )}
      </div>

      <div className="pt-6">
        {step === "done" ? (
          <Button
            size="lg"
            block
            onClick={() => {
              router.replace("/inicio");
              router.refresh();
            }}
          >
            Ir para o início
          </Button>
        ) : (
          <Button size="lg" block onClick={next} loading={saving}>
            {step === "intro" ? "Começar" : step === "estimate" ? "Confirmar metas" : "Continuar"}
          </Button>
        )}
      </div>
    </main>
  );
}

function StepTitle({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-balance">{title}</h1>
      {text && <p className="mt-1.5 text-[15px] text-muted">{text}</p>}
    </div>
  );
}

function MacroBox({ label, value, color, editable, onChange }: { label: string; value: string; color: string; editable: boolean; onChange: (v: string) => void }) {
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-2xl bg-surface-2 px-2 py-3")}>
      <span className="h-1.5 w-6 rounded-full" style={{ background: color }} aria-hidden />
      {editable ? (
        <input
          aria-label={`${label} em gramas`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          className="w-full min-w-0 bg-transparent text-center text-xl font-extrabold focus:outline-none"
        />
      ) : (
        <span className="text-xl font-extrabold">{value}</span>
      )}
      <span className="text-[11px] font-semibold text-muted">{label} (g)</span>
    </div>
  );
}

