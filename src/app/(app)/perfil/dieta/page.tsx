"use client";

import { useState } from "react";
import { Beef, Carrot, Leaf, Salad, SlidersHorizontal, Wheat } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChoiceList } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useApp } from "@/components/app/AppProvider";
import { useLatestWeight } from "@/hooks/useDay";
import { invalidate } from "@/hooks/useQuery";
import { recalcGoals, updateProfile } from "@/data/profile";
import { errorMessage } from "@/data/base";
import { DIET_LABELS } from "@/lib/goals";
import type { DietPreference } from "@/lib/types";
import { useRouter } from "next/navigation";

const ICONS: Record<DietPreference, React.ReactNode> = {
  normal: <Salad className="h-5 w-5" />,
  low_carb: <Wheat className="h-5 w-5" />,
  high_protein: <Beef className="h-5 w-5" />,
  vegetarian: <Carrot className="h-5 w-5" />,
  vegan: <Leaf className="h-5 w-5" />,
  custom: <SlidersHorizontal className="h-5 w-5" />,
};

export default function DietPage() {
  const router = useRouter();
  const toast = useToast();
  const { profile, setProfile } = useApp();
  const weight = useLatestWeight();
  const [value, setValue] = useState<DietPreference>(profile.diet_preference);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const p = await updateProfile({ diet_preference: value });
      setProfile(p);
      if (value === "custom") {
        toast.success("Preferência salva. Ajuste os macros como quiser.");
        router.replace("/perfil/metas");
        return;
      }
      await recalcGoals(p, weight.data?.weight_kg ?? p.start_weight_kg ?? 70);
      invalidate("goal:");
      toast.success("Preferência salva e metas ajustadas.");
      router.back();
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="Preferências nutricionais" back />
      <ChoiceList
        label="Preferência"
        value={value}
        onChange={setValue}
        options={(Object.keys(DIET_LABELS) as DietPreference[]).map((d) => ({ value: d, ...DIET_LABELS[d], icon: ICONS[d] }))}
      />
      <p className="text-xs text-muted">
        A preferência só muda a divisão das suas metas e o que aparece em destaque. Ela não é uma dieta médica. Para restrições por saúde, siga a orientação de um nutricionista ou médico.
      </p>
      <Button size="lg" block onClick={save} loading={busy}>
        Salvar
      </Button>
    </main>
  );
}
