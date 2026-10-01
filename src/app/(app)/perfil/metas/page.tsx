"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, Skeleton } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/components/app/AppProvider";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { keys, useLatestWeight } from "@/hooks/useDay";
import { getGoalFor, recalcGoals, saveGoal } from "@/data/profile";
import { errorMessage } from "@/data/base";
import { kcalFromMacros } from "@/lib/goals";
import { macroSplit } from "@/lib/nutrition";
import { fmt, parseNum } from "@/lib/format";
import { today } from "@/lib/dates";

export default function GoalsPage() {
  const router = useRouter();
  const toast = useToast();
  const { profile } = useApp();
  const weight = useLatestWeight();
  const goal = useQuery(keys.goal(today()), () => getGoalFor(today()));
  const [v, setV] = useState({ protein: "", carbs: "", fat: "", fiber: "", water: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const g = goal.data;
    if (g) setV({ protein: String(g.protein_g), carbs: String(g.carbs_g), fat: String(g.fat_g), fiber: String(g.fiber_g), water: String(g.water_ml) });
  }, [goal.data]);

  const p = parseNum(v.protein) ?? 0, c = parseNum(v.carbs) ?? 0, f = parseNum(v.fat) ?? 0;
  const kcal = kcalFromMacros(p, c, f);
  const split = macroSplit({ kcal, protein: p, carbs: c, fat: f, fiber: 0 });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const water = parseNum(v.water) ?? 0, fiber = parseNum(v.fiber) ?? 0;
    if (kcal < 800 || kcal > 8000) return toast.error("As metas precisam somar entre 800 e 8.000 kcal.");
    if (water < 500 || water > 8000) return toast.error("Meta de água entre 500 e 8.000 ml.");
    setBusy(true);
    try {
      await saveGoal({ kcal, protein_g: Math.round(p), carbs_g: Math.round(c), fat_g: Math.round(f), fiber_g: Math.round(fiber), water_ml: Math.round(water), is_manual: true });
      invalidate("goal:");
      toast.success("Metas salvas. Valem a partir de hoje.");
      router.back();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      const g = await recalcGoals(profile, weight.data?.weight_kg ?? profile.start_weight_kg ?? 70);
      invalidate("goal:");
      if (g) toast.success(`Metas recalculadas: ${fmt(g.kcal)} kcal.`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHeader title="Metas diárias" back />
      {goal.loading ? (
        <Skeleton className="h-72 rounded-[var(--radius-card)]" />
      ) : (
        <form onSubmit={save} className="flex flex-col gap-4">
          <Card className="text-center">
            <p className="text-sm font-semibold text-muted">Calorias por dia</p>
            <p className="text-5xl font-extrabold tracking-tight">{fmt(kcal)}</p>
            <p className="text-sm text-muted">
              kcal · {split.protein}% proteína · {split.carbs}% carbo · {split.fat}% gordura
            </p>
          </Card>
          <Card className="grid grid-cols-2 gap-3">
            <Field label="Proteínas">{(id) => <Input id={id} value={v.protein} onChange={(e) => setV({ ...v, protein: e.target.value })} inputMode="numeric" suffix="g" />}</Field>
            <Field label="Carboidratos">{(id) => <Input id={id} value={v.carbs} onChange={(e) => setV({ ...v, carbs: e.target.value })} inputMode="numeric" suffix="g" />}</Field>
            <Field label="Gorduras">{(id) => <Input id={id} value={v.fat} onChange={(e) => setV({ ...v, fat: e.target.value })} inputMode="numeric" suffix="g" />}</Field>
            <Field label="Fibras">{(id) => <Input id={id} value={v.fiber} onChange={(e) => setV({ ...v, fiber: e.target.value })} inputMode="numeric" suffix="g" />}</Field>
            <Field label="Água" className="col-span-2">
              {(id) => <Input id={id} value={v.water} onChange={(e) => setV({ ...v, water: e.target.value })} inputMode="numeric" suffix="ml" />}
            </Field>
          </Card>
          <p className="text-center text-xs text-muted">As calorias são calculadas pelos macros (4 kcal/g de proteína e carboidrato, 9 kcal/g de gordura). Os dias anteriores mantêm a meta que tinham.</p>
          <Button type="submit" size="lg" block loading={busy}>
            Salvar metas
          </Button>
          <Button variant="ghost" onClick={reset} disabled={busy}>
            <RotateCcw className="h-4 w-4" /> Recalcular automaticamente
          </Button>
        </form>
      )}
    </main>
  );
}
