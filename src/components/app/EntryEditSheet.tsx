"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { deleteEntry, updateEntry } from "@/data/diary";
import { errorMessage } from "@/data/base";
import { invalidate } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import type { FoodEntry, Meal } from "@/lib/types";
import { fmt, fmt1, parseNum } from "@/lib/format";

export function quantityLabel(e: Pick<FoodEntry, "quantity" | "unit" | "grams">): string {
  const q = fmt1(e.quantity);
  switch (e.unit) {
    case "g":
      return `${q} g`;
    case "ml":
      return `${q} ml`;
    case "unit":
      return `${q} ${e.quantity === 1 ? "unidade" : "unidades"} · ${fmt1(e.grams)} g`;
    case "serving":
      return `${q} ${e.quantity === 1 ? "porção" : "porções"} · ${fmt1(e.grams)} g`;
    case "portion":
      return `${q} ${e.quantity === 1 ? "porção da receita" : "porções da receita"}`;
  }
}

/** Editar quantidade, trocar de refeição ou excluir um item do diário. */
export function EntryEditSheet({ entry, meals, onClose }: { entry: FoodEntry | null; meals: Meal[]; onClose: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [qty, setQty] = useState("");
  const [mealId, setMealId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (entry) {
      setQty(String(entry.quantity).replace(".", ","));
      setMealId(entry.meal_id);
    }
  }, [entry]);

  if (!entry) return null;
  const q = parseNum(qty) ?? 0;
  const ratio = entry.quantity > 0 ? q / entry.quantity : 0;
  const preview = { kcal: entry.kcal * ratio, p: entry.protein_g * ratio, c: entry.carbs_g * ratio, f: entry.fat_g * ratio };

  const refresh = () => invalidate(keys.entries(entry.entry_date), keys.charts, keys.recent);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
    if (q <= 0 || q > 5000) return toast.error("Informe uma quantidade válida.");
    setBusy(true);
    try {
      const r = (n: number) => Math.round(n * 10) / 10;
      await updateEntry(entry.id, {
        meal_id: mealId,
        quantity: q,
        grams: r(entry.grams * ratio),
        kcal: r(preview.kcal),
        protein_g: r(preview.p),
        carbs_g: r(preview.c),
        fat_g: r(preview.f),
        fiber_g: r(entry.fiber_g * ratio),
      });
      refresh();
      toast.success("Item atualizado.");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!entry) return;
    const ok = await confirm({ title: "Remover do diário?", text: `${entry.name} sai de ${meals.find((m) => m.id === entry.meal_id)?.name ?? "refeição"}.`, confirmLabel: "Remover", danger: true });
    if (!ok) return;
    try {
      await deleteEntry(entry.id);
      refresh();
      toast.success("Item removido.");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const unitWord = entry.unit === "g" ? "g" : entry.unit === "ml" ? "ml" : entry.unit === "unit" ? "un." : "porção";

  return (
    <Sheet open={!!entry} onClose={onClose} title={entry.name}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade">{(id) => <Input id={id} value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" suffix={unitWord} />}</Field>
          <Field label="Refeição">
            {(id) => (
              <Select id={id} value={mealId} onChange={(e) => setMealId(e.target.value)}>
                {meals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-4 gap-2 rounded-2xl bg-surface-2 p-3 text-center">
          <Mini label="kcal" value={fmt(preview.kcal)} />
          <Mini label="Prot" value={`${fmt1(preview.p)} g`} color="var(--protein)" />
          <Mini label="Carb" value={`${fmt1(preview.c)} g`} color="var(--carbs)" />
          <Mini label="Gord" value={`${fmt1(preview.f)} g`} color="var(--fat)" />
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" onClick={remove} aria-label="Remover item" className="px-4">
            <Trash2 className="h-5 w-5 text-danger" />
          </Button>
          <Button type="submit" size="lg" block loading={busy}>
            Salvar
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: color ?? "var(--muted)" }}>
        {label}
      </p>
      <p className="text-sm font-extrabold">{value}</p>
    </div>
  );
}
