"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, Skeleton } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { createFood, getFood, updateFood, type FoodInput } from "@/data/foods";
import { errorMessage } from "@/data/base";
import { invalidate } from "@/hooks/useQuery";
import { fmt, parseNum } from "@/lib/format";
import { kcalFromMacros } from "@/lib/goals";
import { normalizeBarcode } from "@/lib/foods/provider";

type Basis = "serving" | "100g";
const NUTRIENTS = [
  { key: "kcal", label: "Calorias", unit: "kcal", required: true },
  { key: "protein", label: "Proteínas", unit: "g", required: true },
  { key: "carbs", label: "Carboidratos", unit: "g", required: true },
  { key: "fat", label: "Gorduras", unit: "g", required: true },
  { key: "fiber", label: "Fibras", unit: "g" },
  { key: "sugar", label: "Açúcares", unit: "g" },
  { key: "sodium", label: "Sódio", unit: "mg" },
] as const;
type NutrientKey = (typeof NUTRIENTS)[number]["key"];

export function FoodForm() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const editId = params.get("id");
  const mealId = params.get("refeicao");
  const dateParam = params.get("data");

  const [loading, setLoading] = useState(!!editId);
  const [name, setName] = useState(params.get("nome") ?? "");
  const [brand, setBrand] = useState("");
  const [barcode, setBarcode] = useState(params.get("barcode") ?? "");
  const [servingName, setServingName] = useState("1 porção");
  const [servingG, setServingG] = useState("");
  const [basis, setBasis] = useState<Basis>("serving");
  const [vals, setVals] = useState<Record<NutrientKey, string>>({ kcal: "", protein: "", carbs: "", fat: "", fiber: "", sugar: "", sodium: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Edição: carrega e mostra os valores por 100 g.
  useEffect(() => {
    if (!editId) return;
    getFood(editId)
      .then((f) => {
        if (!f) return;
        setName(f.name);
        setBrand(f.brand ?? "");
        setBarcode(f.barcode ?? "");
        setServingName(f.serving_name ?? "1 porção");
        setServingG(f.serving_g ? String(f.serving_g) : "");
        setBasis("100g");
        const s = (n: number | null) => (n == null ? "" : String(n).replace(".", ","));
        setVals({ kcal: s(f.kcal_100g), protein: s(f.protein_100g), carbs: s(f.carbs_100g), fat: s(f.fat_100g), fiber: s(f.fiber_100g), sugar: s(f.sugar_100g), sodium: s(f.sodium_mg_100g) });
      })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [editId, toast]);

  const n = (k: NutrientKey) => parseNum(vals[k]);
  const macroKcal = kcalFromMacros(n("protein") ?? 0, n("carbs") ?? 0, n("fat") ?? 0);
  const kcal = n("kcal") ?? 0;
  const mismatch = kcal > 20 && macroKcal > 0 && Math.abs(macroKcal - kcal) / kcal > 0.25;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const g = parseNum(servingG);
    if (name.trim().length < 2) errs.name = "Informe o nome do alimento.";
    if (basis === "serving" && (!g || g <= 0 || g > 5000)) errs.servingG = "Informe o peso da porção em gramas.";
    if (g != null && (g <= 0 || g > 5000)) errs.servingG = "Peso da porção entre 1 e 5000 g.";
    for (const nt of NUTRIENTS) {
      const v = n(nt.key);
      if ("required" in nt && nt.required && v == null) errs[nt.key] = "Obrigatório";
      if (v != null && v < 0) errs[nt.key] = "Não pode ser negativo";
    }
    const code = barcode.trim() ? normalizeBarcode(barcode) : null;
    if (barcode.trim() && !code) errs.barcode = "Código com 8 a 14 números.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    // Converte para valores por 100 g.
    const factor = basis === "serving" ? 100 / g! : 1;
    const per100 = (k: NutrientKey) => {
      const v = n(k);
      return v == null ? null : Math.round(v * factor * 100) / 100;
    };
    const values: FoodInput = {
      name: name.trim(),
      brand: brand.trim() || null,
      barcode: code,
      source: "custom",
      external_id: null,
      serving_name: g ? servingName.trim() || "1 porção" : null,
      serving_g: g ?? null,
      unit_name: null,
      unit_g: null,
      kcal_100g: Math.round((per100("kcal") ?? 0) * 10) / 10,
      protein_100g: per100("protein") ?? 0,
      carbs_100g: per100("carbs") ?? 0,
      fat_100g: per100("fat") ?? 0,
      fiber_100g: per100("fiber"),
      sugar_100g: per100("sugar"),
      sodium_mg_100g: per100("sodium"),
      image_url: null,
    };

    setBusy(true);
    try {
      const food = editId ? await updateFood(editId, values) : await createFood(values);
      invalidate("foods:", "myfoods");
      toast.success(editId ? "Alimento atualizado." : "Alimento cadastrado.");
      if (editId) router.back();
      else router.replace(`/alimentos/buscar?${new URLSearchParams({ food: food.id, ...(mealId ? { refeicao: mealId } : {}), ...(dateParam ? { data: dateParam } : {}) })}`);
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-4">
        <PageHeader title="Editar alimento" back />
        <Skeleton className="h-64 rounded-[var(--radius-card)]" />
      </main>
    );
  }

  return (
    <main>
      <PageHeader title={editId ? "Editar alimento" : "Cadastrar alimento"} back />
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Card className="flex flex-col gap-4">
          <Field label="Nome" error={errors.name}>
            {(id, d) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Pão integral" aria-describedby={d} invalid={!!errors.name} />}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca (opcional)">{(id) => <Input id={id} value={brand} onChange={(e) => setBrand(e.target.value)} />}</Field>
            <Field label="Código de barras" error={errors.barcode}>
              {(id, d) => <Input id={id} value={barcode} onChange={(e) => setBarcode(e.target.value)} inputMode="numeric" aria-describedby={d} invalid={!!errors.barcode} />}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Porção">{(id) => <Input id={id} value={servingName} onChange={(e) => setServingName(e.target.value)} placeholder="1 fatia" />}</Field>
            <Field label="Peso da porção" error={errors.servingG}>
              {(id, d) => <Input id={id} value={servingG} onChange={(e) => setServingG(e.target.value)} inputMode="decimal" suffix="g" aria-describedby={d} invalid={!!errors.servingG} />}
            </Field>
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-muted">Os valores do rótulo são</p>
            <Segmented label="Base dos valores" value={basis} onChange={setBasis} options={[{ value: "serving", label: "Por porção" }, { value: "100g", label: "Por 100 g" }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {NUTRIENTS.map((nt) => (
              <Field key={nt.key} label={nt.label} error={errors[nt.key]}>
                {(id, d) => (
                  <Input
                    id={id}
                    value={vals[nt.key]}
                    onChange={(e) => setVals((v) => ({ ...v, [nt.key]: e.target.value }))}
                    inputMode="decimal"
                    suffix={nt.unit}
                    aria-describedby={d}
                    invalid={!!errors[nt.key]}
                  />
                )}
              </Field>
            ))}
          </div>
          {mismatch && (
            <p className="flex items-start gap-2 rounded-2xl bg-warn/10 px-3 py-2.5 text-sm text-warn">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Pelos macros, seriam cerca de {fmt(macroKcal)} kcal. Confira os números do rótulo.
            </p>
          )}
        </Card>

        <Button type="submit" size="lg" block loading={busy}>
          {editId ? "Salvar alterações" : "Salvar alimento"}
        </Button>
      </form>
    </main>
  );
}
